const { getConnection } = require('../config/database');
const ExcelJS = require('exceljs');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Get all credit accounts with dealer summary
 * Returns: List of dealers with their total credit, settled, remaining, overdue amounts
 */
const getAllCredits = async (req, res, next) => {
    try {
        const pool = await getConnection();
        
        // Get aggregated credit data per dealer
        // NOTE: previously the LEFT JOIN limited rows to remaining_balance > 0 which made
        // total_credit sum only outstanding amounts. Remove that condition and compute
        // remaining/outstanding using conditional aggregation so total_credit represents
        // the full credit issued amount.
        const [credits] = await pool.execute(`
            SELECT 
                d.dealer_id,
                d.dealer_name,
                d.contact_number,
                d.route,
                d.credit_limit,
                COUNT(DISTINCT ct.credit_id) as total_invoices,
                COALESCE(SUM(ct.credit_amount), 0) as total_credit,
                COALESCE(SUM(ct.settled_amount), 0) as total_settled,
                COALESCE(SUM(CASE WHEN ct.remaining_balance > 0 THEN ct.remaining_balance ELSE 0 END), 0) as total_remaining,
                COALESCE(SUM(CASE WHEN ct.status = 'OVERDUE' THEN ct.remaining_balance ELSE 0 END), 0) as total_overdue,
                MIN(CASE WHEN ct.remaining_balance > 0 THEN ct.due_date ELSE NULL END) as nearest_due_date
            FROM dealers d
            LEFT JOIN credit_transactions ct ON d.dealer_id = ct.dealer_id
            WHERE d.status = 'ACTIVE'
            GROUP BY d.dealer_id, d.dealer_name, d.contact_number, d.route, d.credit_limit
            HAVING total_credit > 0 OR total_remaining > 0
            ORDER BY total_overdue DESC, total_remaining DESC
        `);

        // Calculate summary totals
        const summary = {
            totalCredit: credits.reduce((sum, c) => sum + parseFloat(c.total_credit), 0),
            totalSettled: credits.reduce((sum, c) => sum + parseFloat(c.total_settled), 0),
            totalRemaining: credits.reduce((sum, c) => sum + parseFloat(c.total_remaining), 0),
            totalOverdue: credits.reduce((sum, c) => sum + parseFloat(c.total_overdue), 0),
            dealerCount: credits.length
        };

        return successResponse(res, 200, 'Credit accounts retrieved', { credits, summary });
    } catch (error) {
        next(error);
    }
};

/**
 * Get outstanding invoices for a specific dealer
 * Returns: List of unpaid/partially paid invoices for the dealer
 */
const getDealerCredits = async (req, res, next) => {
    const { dealerId } = req.params;

    try {
        const pool = await getConnection();

        // Get dealer info
        const [dealers] = await pool.execute(
            'SELECT dealer_id, dealer_name, contact_number, route, credit_limit FROM dealers WHERE dealer_id = ?',
            [dealerId]
        );

        if (dealers.length === 0) {
            return errorResponse(res, 404, 'Dealer not found');
        }

        // Get outstanding credits for this dealer
        const [credits] = await pool.execute(`
            SELECT 
                ct.*,
                i.invoice_number,
                i.invoice_date,
                i.total_amount as invoice_total
            FROM credit_transactions ct
            JOIN invoices i ON ct.invoice_id = i.invoice_id
            WHERE ct.dealer_id = ? AND ct.remaining_balance > 0
            ORDER BY ct.due_date ASC
        `, [dealerId]);

        // Calculate totals
        const totals = {
            totalCredit: credits.reduce((sum, c) => sum + parseFloat(c.credit_amount), 0),
            totalSettled: credits.reduce((sum, c) => sum + parseFloat(c.settled_amount), 0),
            totalRemaining: credits.reduce((sum, c) => sum + parseFloat(c.remaining_balance), 0),
            totalOverdue: credits.filter(c => c.status === 'OVERDUE').reduce((sum, c) => sum + parseFloat(c.remaining_balance), 0)
        };

        return successResponse(res, 200, 'Dealer credits retrieved', {
            dealer: dealers[0],
            credits,
            totals
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Settle credit - Record payment against outstanding credit
 * Body: { credit_id, amount, payment_method, cheque_details? }
 */
const settleCredit = async (req, res, next) => {
    const { credit_id, amount, payment_method, cheque_details } = req.body;
    const collected_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get credit transaction
            const [credits] = await connection.execute(
                'SELECT * FROM credit_transactions WHERE credit_id = ?',
                [credit_id]
            );

            if (credits.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Credit transaction not found');
            }

            const credit = credits[0];

            if (amount <= 0) {
                await connection.rollback();
                return errorResponse(res, 400, 'Amount must be greater than 0');
            }

            if (amount > credit.remaining_balance) {
                await connection.rollback();
                return errorResponse(res, 400, `Amount (${amount}) exceeds remaining balance (${credit.remaining_balance})`);
            }

            // Create payment record
            const payment_id = generateId('PAY');
            // For cheque payments, status should be PENDING until cleared
            const paymentStatus = payment_method === 'CHEQUE' ? 'PENDING' : 'COMPLETED';
            await connection.execute(
                `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, status, collected_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [payment_id, `PAY-${Date.now().toString().slice(-6)}`, credit.invoice_id, amount, payment_method, paymentStatus, collected_by]
            );

            // If cheque payment, record cheque details
            // cheque_payment_id IS the payment_id (FK relationship)
            if (payment_method === 'CHEQUE') {
                if (!cheque_details || !cheque_details.number || !cheque_details.date || !cheque_details.bank || !cheque_details.branch) {
                    await connection.rollback();
                    return errorResponse(res, 400, 'All cheque details are required for cheque payments');
                }

                if (!/^\d{6}$/.test(cheque_details.number)) {
                    await connection.rollback();
                    return errorResponse(res, 400, 'Cheque number must be exactly 6 digits');
                }

                const [existingCheque] = await connection.execute(
                    `SELECT cheque_number FROM cheque_payments 
                     WHERE bank_name = ? AND cheque_number = ? 
                     AND clearance_status NOT IN ('RETURNED', 'CANCELLED')`,
                    [cheque_details.bank, cheque_details.number]
                );

                if (existingCheque.length > 0) {
                    await connection.rollback();
                    return errorResponse(res, 400, `Cheque number ${cheque_details.number} already exists for ${cheque_details.bank} and has not been returned or cancelled.`);
                }

                await connection.execute(
                    `INSERT INTO cheque_payments (cheque_payment_id, cheque_number, cheque_date, bank_name, branch_name, clearance_status)
                     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
                    [payment_id, cheque_details.number, cheque_details.date, cheque_details.bank, cheque_details.branch]
                );
            }

            // Create settlement record
            const settlement_id = generateId('SET');
            await connection.execute(
                `INSERT INTO credit_settlements (settlement_id, credit_id, payment_id, amount, collected_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [settlement_id, credit_id, payment_id, amount, collected_by]
            );

            // Update credit transaction
            const newSettled = parseFloat(credit.settled_amount) + amount;
            const newRemaining = parseFloat(credit.remaining_balance) - amount;

            await connection.execute(
                `UPDATE credit_transactions 
                 SET settled_amount = ?, remaining_balance = ?, updated_at = NOW()
                 WHERE credit_id = ?`,
                [newSettled, newRemaining, credit_id]
            );

            // Deduct from dealer's total current_credit
            await connection.execute(
                `UPDATE dealers SET current_credit = GREATEST(0, current_credit - ?) WHERE dealer_id = ?`,
                [amount, credit.dealer_id]
            );

            await connection.commit();

            return successResponse(res, 200, 'Credit settled successfully', {
                settlement_id,
                payment_id,
                amount_settled: amount,
                new_remaining: newRemaining
            });
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

/**
 * Get settlement history for a dealer
 */
const getSettlementHistory = async (req, res, next) => {
    const { dealerId } = req.params;

    try {
        const pool = await getConnection();

        const [history] = await pool.execute(`
            SELECT 
                cs.settlement_id,
                cs.amount,
                cs.settlement_date,
                ct.credit_id,
                i.invoice_number,
                p.payment_method,
                CONCAT(u.first_name, ' ', u.last_name) as collected_by_name
            FROM credit_settlements cs
            JOIN credit_transactions ct ON cs.credit_id = ct.credit_id
            JOIN invoices i ON ct.invoice_id = i.invoice_id
            JOIN payments p ON cs.payment_id = p.payment_id
            JOIN users u ON cs.collected_by = u.user_id
            WHERE ct.dealer_id = ?
            ORDER BY cs.settlement_date DESC
        `, [dealerId]);

        return successResponse(res, 200, 'Settlement history retrieved', history);
    } catch (error) {
        next(error);
    }
};

/**
 * Update overdue status - Run periodically or on access
 * Marks credits as OVERDUE if past due date
 */
const updateOverdueStatus = async (req, res, next) => {
    try {
        const pool = await getConnection();

        const [result] = await pool.execute(`
            UPDATE credit_transactions 
            SET status = 'OVERDUE'
            WHERE remaining_balance > 0 
            AND due_date < CURDATE() 
            AND status = 'PENDING'
        `);

        return successResponse(res, 200, 'Overdue status updated', {
            updated_count: result.affectedRows
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get credit summary for dashboard
 */
const getCreditSummary = async (req, res, next) => {
    try {
        const pool = await getConnection();

        const [summary] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT dealer_id) as dealers_with_credit,
                COUNT(*) as total_credit_invoices,
                COALESCE(SUM(credit_amount), 0) as total_credit_issued,
                COALESCE(SUM(settled_amount), 0) as total_settled,
                COALESCE(SUM(remaining_balance), 0) as total_outstanding,
                COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN remaining_balance ELSE 0 END), 0) as total_overdue,
                COUNT(CASE WHEN status = 'OVERDUE' AND remaining_balance > 0 THEN 1 END) as overdue_count
            FROM credit_transactions
            WHERE remaining_balance > 0
        `);

        // Get top 5 dealers by outstanding amount
        const [topDebtors] = await pool.execute(`
            SELECT 
                d.dealer_id,
                d.dealer_name,
                SUM(ct.remaining_balance) as total_outstanding
            FROM credit_transactions ct
            JOIN dealers d ON ct.dealer_id = d.dealer_id
            WHERE ct.remaining_balance > 0
            GROUP BY d.dealer_id, d.dealer_name
            ORDER BY total_outstanding DESC
            LIMIT 5
        `);

        return successResponse(res, 200, 'Credit summary retrieved', {
            ...summary[0],
            topDebtors
        });
    } catch (error) {
        next(error);
    }
};

const exportCredits = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [credits] = await pool.execute(`
            SELECT 
                d.dealer_name,
                d.contact_number,
                d.route,
                d.credit_limit,
                COALESCE(SUM(ct.credit_amount), 0) as total_credit,
                COALESCE(SUM(ct.settled_amount), 0) as total_settled,
                COALESCE(SUM(CASE WHEN ct.remaining_balance > 0 THEN ct.remaining_balance ELSE 0 END), 0) as total_remaining,
                COALESCE(SUM(CASE WHEN ct.status = 'OVERDUE' THEN ct.remaining_balance ELSE 0 END), 0) as total_overdue
            FROM dealers d
            LEFT JOIN credit_transactions ct ON d.dealer_id = ct.dealer_id
            WHERE d.status = 'ACTIVE'
            GROUP BY d.dealer_id, d.dealer_name, d.contact_number, d.route, d.credit_limit
            HAVING total_credit > 0 OR total_remaining > 0
            ORDER BY total_overdue DESC, total_remaining DESC
        `);

        if (credits.length === 0) {
            return errorResponse(res, 404, 'No credit accounts found to export');
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Credit Report');

        sheet.mergeCells('A1:H1');
        sheet.getCell('A1').value = 'HIDELLANA DISTRIBUTORS - CREDIT ACCOUNTS REPORT';
        sheet.getCell('A1').font = { bold: true, size: 14 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.getRow(3).values = [
            'Dealer Name', 'Contact', 'Route', 'Limit (Rs)', 'Total Issued (Rs)', 'Settled (Rs)', 'Outstanding (Rs)', 'Overdue (Rs)'
        ];

        sheet.getRow(3).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101540' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });

        credits.forEach(c => {
            sheet.addRow([
                c.dealer_name,
                c.contact_number,
                c.route,
                parseFloat(c.credit_limit || 0).toFixed(2),
                parseFloat(c.total_credit).toFixed(2),
                parseFloat(c.total_settled).toFixed(2),
                parseFloat(c.total_remaining).toFixed(2),
                parseFloat(c.total_overdue).toFixed(2)
            ]);
        });

        // Totals
        const totalIssued = credits.reduce((sum, c) => sum + parseFloat(c.total_credit), 0);
        const totalOutstanding = credits.reduce((sum, c) => sum + parseFloat(c.total_remaining), 0);
        const totalOverdue = credits.reduce((sum, c) => sum + parseFloat(c.total_overdue), 0);

        const summaryRow = sheet.addRow([]);
        const totalRow = sheet.addRow(['', '', '', 'TOTALS:', totalIssued.toFixed(2), '', totalOutstanding.toFixed(2), totalOverdue.toFixed(2)]);
        totalRow.font = { bold: true };

        sheet.columns.forEach(col => { col.width = 15; });
        sheet.getColumn(1).width = 25; // Dealer name

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="credit_report.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCredits,
    getDealerCredits,
    settleCredit,
    getSettlementHistory,
    updateOverdueStatus,
    getCreditSummary,
    exportCredits
};
