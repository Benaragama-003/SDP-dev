const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * INVOICE MODULE - FINALIZED BUSINESS LOGIC
 */

// 1. CREATE INVOICE (Supervisor)
// Deducts from Lorry Stock and updates Dispatch
const createInvoice = async (req, res, next) => {
    const { dealer_id, dispatch_id, items, payment_method, cheque_details } = req.body;
    const collected_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get dispatch details to verify and get supervisor_id
            const [dispatchRows] = await connection.execute(
                'SELECT supervisor_id, lorry_id FROM dispatches WHERE dispatch_id = ?',
                [dispatch_id]
            );
            
            if (dispatchRows.length === 0) {
                throw new Error('Dispatch not found');
            }
            
            const { supervisor_id, lorry_id } = dispatchRows[0];
            
            const invoice_id = generateId('INV');
            let total_amount = 0;

            // Step A: Process Items and Validate Stock
            for (const item of items) {
                total_amount += (item.quantity * item.unit_price);

                // 1. Deduct from LIVE Lorry Stock (via dispatch_id)
                const [stockUpdate] = await connection.execute(
                    `UPDATE lorry_stock 
                     SET sold_quantity = sold_quantity + ? 
                     WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED' 
                     AND (loaded_quantity - sold_quantity - damaged_quantity) >= ?`,
                    [item.quantity, dispatch_id, item.product_id, item.quantity]
                );

                if (stockUpdate.affectedRows === 0) {
                    throw new Error(`Insufficient stock for Product ${item.product_id} in Lorry`);
                }

                // 2. Record as Sold in Dispatch Items
                await connection.execute(
                    'UPDATE dispatch_items SET sold_quantity = sold_quantity + ? WHERE dispatch_id = ? AND product_id = ? AND product_type = ?',
                    [item.quantity, dispatch_id, item.product_id, item.sale_type || 'FILLED']
                );
            }

            // Step B: Insert Invoice Header (supervisor/lorry comes from dispatch)
            await connection.execute(
                `INSERT INTO invoices (invoice_id, invoice_number, dealer_id, dispatch_id, subtotal, total_amount, payment_type, due_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoice_id, `INV-${Date.now().toString().slice(-6)}`, dealer_id, dispatch_id, total_amount, total_amount, payment_method, payment_method === 'CREDIT' ? new Date(Date.now() + 30*24*60*60*1000) : null]
            );

            // Step C: Insert Invoice Line Items
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO invoice_items (invoice_item_id, invoice_id, product_id, sale_type, quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [generateId('II'), invoice_id, item.product_id, item.sale_type || 'FILLED', item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }

            // Step D: Handle Financial Transactions
            if (payment_method === 'CREDIT') {
                // Get dealer's payment terms
                const [dealerRows] = await connection.execute(
                    'SELECT payment_terms_days FROM dealers WHERE dealer_id = ?',
                    [dealer_id]
                );
                const paymentTerms = dealerRows[0]?.payment_terms_days || 30;
                
                await connection.execute(
                    `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date, status)
                     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'PENDING')`,
                    [generateId('CRD'), dealer_id, invoice_id, total_amount, total_amount, paymentTerms]
                );
                await connection.execute('UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?', [total_amount, dealer_id]);
            } else {
                const payment_id = generateId('PAY');
                await connection.execute(
                    `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, status, collected_by)
                     VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)`,
                    [payment_id, `PAY-${Date.now().toString().slice(-6)}`, invoice_id, total_amount, payment_method, collected_by]
                );

                if (payment_method === 'CHEQUE') {
                    await connection.execute(
                        `INSERT INTO cheque_payments (cheque_payment_id, cheque_number, cheque_date, bank_name, branch_name) VALUES (?, ?, ?, ?, ?)`,
                        [payment_id, cheque_details.number, cheque_details.date, cheque_details.bank, cheque_details.branch]
                    );
                }
                // Note: cash_payments table removed from schema - CASH payments are tracked in payments table only
            }

            // Step E: Update Supervisor Performance
            await connection.execute('UPDATE supervisors SET achieved_sales = achieved_sales + ? WHERE supervisor_id = ?', [total_amount, supervisor_id]);

            await connection.commit();
            return successResponse(res, 201, 'Invoice created and stock updated', { invoice_id });
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

// 2. REPORT DAMAGE (Supervisor)
const reportDamage = async (req, res, next) => {
    const { dispatch_id, product_id, quantity, damage_reason } = req.body;
    const reported_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Update lorry_stock damaged_quantity
            const [deduct] = await connection.execute(
                `UPDATE lorry_stock 
                 SET damaged_quantity = damaged_quantity + ? 
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'
                 AND (loaded_quantity - sold_quantity - damaged_quantity) >= ?`,
                [quantity, dispatch_id, product_id, quantity]
            );

            if (deduct.affectedRows === 0) throw new Error('Insufficient filled stock in lorry to report damage');

            // 2. Update dispatch items
            await connection.execute(
                `UPDATE dispatch_items 
                 SET damaged_quantity = damaged_quantity + ? 
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = 'FILLED'`,
                [quantity, dispatch_id, product_id]
            );

            // 3. Record in damage_inventory table
            await connection.execute(
                `INSERT INTO damage_inventory (damage_id, product_id, quantity_damaged, dispatch_id, damage_reason, reported_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [generateId('DMG'), product_id, quantity, dispatch_id, damage_reason || 'Damage during dispatch', reported_by]
            );

            await connection.commit();
            return successResponse(res, 200, 'Damage reported and stock adjusted');
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

// 3. COMPLETE TRIP (Supervisor)
const completeTrip = async (req, res, next) => {
    const { dispatch_id } = req.params;
    try {
        const pool = await getConnection();
        await pool.execute('UPDATE dispatches SET status = "AWAITING_UNLOAD" WHERE dispatch_id = ?', [dispatch_id]);
        return successResponse(res, 200, 'Trip marked as completed. Awaiting admin unloading.');
    } catch (error) {
        next(error);
    }
};

// 4. ACCEPT UNLOAD (Admin)
// Moves all remaining lorry stock back to warehouse inventory
const acceptUnload = async (req, res, next) => {
    const { dispatch_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get dispatch info including lorry_id
            const [dispatchInfo] = await connection.execute(
                'SELECT lorry_id, supervisor_id FROM dispatches WHERE dispatch_id = ?',
                [dispatch_id]
            );
            
            if (dispatchInfo.length === 0) {
                throw new Error('Dispatch not found');
            }
            
            const { lorry_id, supervisor_id } = dispatchInfo[0];

            // 1. Get all remaining physical items from lorry_stock for this dispatch
            // balance_quantity is auto-calculated as (loaded_quantity - sold_quantity - damaged_quantity)
            const [remainingStock] = await connection.execute(
                `SELECT product_id, product_type, 
                        (loaded_quantity - sold_quantity - damaged_quantity) as balance_quantity,
                        damaged_quantity
                 FROM lorry_stock 
                 WHERE dispatch_id = ?`,
                [dispatch_id]
            );

            for (const item of remainingStock) {
                // 2. Add returned stock back to warehouse inventory
                if (item.balance_quantity > 0) {
                    await connection.execute(
                        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND product_type = ?',
                        [item.balance_quantity, item.product_id, item.product_type]
                    );
                }
                
                // 3. Add damaged to warehouse DAMAGED inventory
                if (item.damaged_quantity > 0) {
                    await connection.execute(
                        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND product_type = ?',
                        [item.damaged_quantity, item.product_id, 'DAMAGED']
                    );
                }
            }

            // 4. Update dispatch status
            await connection.execute('UPDATE dispatches SET status = "UNLOADED" WHERE dispatch_id = ?', [dispatch_id]);
            
            // 5. Release lorry and supervisor
            await connection.execute('UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?', [supervisor_id]);

            await connection.commit();
            return successResponse(res, 200, 'Unload confirmed. Lorry and Supervisor are now AVAILABLE.');
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

// 5. CANCEL PENDING DISPATCH (Admin)
const cancelDispatch = async (req, res, next) => {
    const { dispatch_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [dispatch] = await connection.execute(
                'SELECT status, supervisor_id, lorry_id FROM dispatches WHERE dispatch_id = ?', 
                [dispatch_id]
            );
            
            if (!dispatch.length || dispatch[0].status !== 'SCHEDULED') {
                return errorResponse(res, 400, 'Only scheduled dispatches can be cancelled');
            }
            
            const { supervisor_id, lorry_id } = dispatch[0];

            // 1. Revert Lorry Stock back to Warehouse Inventory
            const [truckItems] = await connection.execute(
                'SELECT product_id, product_type, loaded_quantity FROM lorry_stock WHERE dispatch_id = ?', 
                [dispatch_id]
            );
            
            for (const item of truckItems) {
                await connection.execute(
                    'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND product_type = ?', 
                    [item.loaded_quantity, item.product_id, item.product_type]
                );
            }
            
            // 2. Delete lorry_stock records for this dispatch
            await connection.execute('DELETE FROM lorry_stock WHERE dispatch_id = ?', [dispatch_id]);

            // 3. Reset Statuses
            await connection.execute('UPDATE dispatches SET status = "CANCELLED" WHERE dispatch_id = ?', [dispatch_id]);
            await connection.execute('UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?', [supervisor_id]);

            await connection.commit();
            return successResponse(res, 200, 'Dispatch cancelled and materials returned to warehouse');
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

// 6. GET ALL INVOICES (Admin/Supervisor)
const getAllInvoices = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT i.*, 
                   d.dealer_name, 
                   CONCAT(u.first_name, ' ', u.last_name) as supervisor_name,
                   disp.lorry_id,
                   l.vehicle_number
            FROM invoices i 
            JOIN dealers d ON i.dealer_id = d.dealer_id 
            JOIN dispatches disp ON i.dispatch_id = disp.dispatch_id
            JOIN users u ON disp.supervisor_id = u.user_id
            LEFT JOIN lorries l ON disp.lorry_id = l.lorry_id
            ORDER BY i.created_at DESC
        `);
        return successResponse(res, 200, 'Invoices retrieved', rows);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createInvoice,
    reportDamage,
    completeTrip,
    acceptUnload,
    cancelDispatch,
    getAllInvoices
};
