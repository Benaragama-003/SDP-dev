const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateId } = require('../utils/generateId');

// Get all cheques with payment and dealer info
const getAllCheques = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT 
                cp.cheque_payment_id,
                cp.cheque_number,
                cp.cheque_date,
                cp.bank_name,
                cp.branch_name,
                cp.clearance_status,
                cp.clearance_date,
                cp.returned_date,
                cp.return_reason,
                p.amount,
                p.invoice_id,
                p.collected_by,
                p.created_at as payment_date,
                i.dealer_id,
                d.dealer_name
            FROM cheque_payments cp
            JOIN payments p ON cp.cheque_payment_id = p.payment_id
            JOIN invoices i ON p.invoice_id = i.invoice_id
            JOIN dealers d ON i.dealer_id = d.dealer_id
            ORDER BY cp.cheque_date DESC
        `);

        return successResponse(res, 200, 'Cheques retrieved successfully', rows);
    } catch (error) {
        next(error);
    }
};

// Update cheque clearance status
const updateChequeStatus = async (req, res, next) => {
    const { cheque_payment_id } = req.params;
    const { status, return_reason } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const today = new Date().toISOString().split('T')[0];

            // Get cheque details to validate date and current status
            const [chequeRows] = await connection.execute(
                'SELECT cheque_date, clearance_status FROM cheque_payments WHERE cheque_payment_id = ?',
                [cheque_payment_id]
            );

            if (chequeRows.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Cheque not found');
            }

            const chequeData = chequeRows[0];

            // Prevent updating cheques that are already finalized
            if (['CLEARED', 'RETURNED', 'CANCELLED'].includes(chequeData.clearance_status)) {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot update status. This cheque is already ${chequeData.clearance_status.toLowerCase()}.`);
            }

            const chequeDate = new Date(chequeData.cheque_date);
            const todayDate = new Date();
            chequeDate.setHours(0, 0, 0, 0);
            todayDate.setHours(0, 0, 0, 0);

            // Validate: Cannot mark as CLEARED or RETURNED before cheque date
            if ((status === 'CLEARED' || status === 'RETURNED') && chequeDate > todayDate) {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot mark cheque as ${status.toLowerCase()} before the cheque date (${chequeData.cheque_date}). Please wait until the cheque matures.`);
            }

            // Get payment and invoice info upfront for RETURNED/CANCELLED
            const [paymentRows] = await connection.execute(
                `SELECT p.amount, p.invoice_id, i.dealer_id, d.payment_terms_days
                 FROM payments p 
                 JOIN invoices i ON p.invoice_id = i.invoice_id 
                 JOIN dealers d ON i.dealer_id = d.dealer_id
                 WHERE p.payment_id = ?`,
                [cheque_payment_id]
            );

            // Update cheque status
            if (status === 'CLEARED') {
                await connection.execute(
                    `UPDATE cheque_payments SET clearance_status = 'CLEARED', clearance_date = ? WHERE cheque_payment_id = ?`,
                    [today, cheque_payment_id]
                );

                // Update payment status to COMPLETED when cheque clears
                await connection.execute(
                    `UPDATE payments SET status = 'COMPLETED' WHERE payment_id = ?`,
                    [cheque_payment_id]
                );
            } else if (status === 'RETURNED' || status === 'CANCELLED') {
                // Update cheque_payments table
                if (status === 'RETURNED') {
                    await connection.execute(
                        `UPDATE cheque_payments SET clearance_status = 'RETURNED', returned_date = ?, return_reason = ? WHERE cheque_payment_id = ?`,
                        [today, return_reason || 'Cheque returned by bank', cheque_payment_id]
                    );
                } else {
                    await connection.execute(
                        `UPDATE cheque_payments SET clearance_status = 'CANCELLED' WHERE cheque_payment_id = ?`,
                        [cheque_payment_id]
                    );
                }

                // Update payment status to CANCELLED
                await connection.execute(
                    `UPDATE payments SET status = 'CANCELLED' WHERE payment_id = ?`,
                    [cheque_payment_id]
                );

                if (paymentRows.length > 0) {
                    const { amount, dealer_id, invoice_id, payment_terms_days } = paymentRows[0];
                    const paymentTerms = payment_terms_days || 30;

                    // Check if this cheque payment was used as a credit settlement
                    const [settlementRows] = await connection.execute(
                        `SELECT cs.settlement_id, cs.credit_id, cs.amount 
                         FROM credit_settlements cs 
                         WHERE cs.payment_id = ?`,
                        [cheque_payment_id]
                    );

                    if (settlementRows.length > 0) {
                        // This cheque was used to settle credit — reverse the settlement
                        for (const settlement of settlementRows) {
                            // Deduct settled_amount and add back to remaining_balance
                            await connection.execute(
                                `UPDATE credit_transactions 
                                 SET settled_amount = settled_amount - ?, 
                                     remaining_balance = remaining_balance + ?,
                                     status = 'PENDING',
                                     updated_at = NOW()
                                 WHERE credit_id = ?`,
                                [settlement.amount, settlement.amount, settlement.credit_id]
                            );

                            // Remove the settlement record
                            await connection.execute(
                                `DELETE FROM credit_settlements WHERE settlement_id = ?`,
                                [settlement.settlement_id]
                            );
                        }

                        // Add amount back to dealer's outstanding credit
                        await connection.execute(
                            `UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?`,
                            [amount, dealer_id]
                        );
                    } else {
                        // Original cheque payment (not a credit settlement) — convert to credit

                        // Update invoice payment_type to CREDIT since cheque failed
                        await connection.execute(
                            `UPDATE invoices SET payment_type = 'CREDIT', due_date = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE invoice_id = ?`,
                            [paymentTerms, invoice_id]
                        );

                        // Add amount to dealer's outstanding credit
                        await connection.execute(
                            `UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?`,
                            [amount, dealer_id]
                        );

                        // Check if credit_transaction already exists for this invoice (avoid duplicates)
                        const [existingCredit] = await connection.execute(
                            `SELECT credit_id FROM credit_transactions WHERE invoice_id = ? AND status = 'PENDING'`,
                            [invoice_id]
                        );

                        if (existingCredit.length > 0) {
                            // Update existing credit transaction
                            await connection.execute(
                                `UPDATE credit_transactions 
                                 SET credit_amount = credit_amount + ?, remaining_balance = remaining_balance + ?
                                 WHERE credit_id = ?`,
                                [amount, amount, existingCredit[0].credit_id]
                            );
                        } else {
                            // Create new credit_transaction
                            await connection.execute(
                                `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date, status)
                                 VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'PENDING')`,
                                [generateId('CRD'), dealer_id, invoice_id, amount, amount, paymentTerms]
                            );
                        }
                    }
                }
            }

            await connection.commit();
            return successResponse(res, 200, 'Cheque status updated successfully');
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCheques,
    updateChequeStatus
};
