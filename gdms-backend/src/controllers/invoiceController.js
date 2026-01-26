const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * INVOICE MODULE - FINALIZED BUSINESS LOGIC
 */

// 1. CREATE INVOICE (Supervisor)
// Deducts from Lorry Stock and updates Dispatch
const createInvoice = async (req, res, next) => {
    const { dealer_id, lorry_id, dispatch_id, items, payment_method, cheque_details } = req.body;
    const supervisor_id = req.user.user_id;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const invoice_id = generateId('INV');
            let total_amount = 0;

            // Step A: Process Items and Validate Stock
            for (const item of items) {
                total_amount += (item.quantity * item.unit_price);

                // 1. Deduct from LIVE Lorry Stock
                const [stockUpdate] = await connection.execute(
                    'UPDATE lorry_stock SET quantity = quantity - ? WHERE lorry_id = ? AND product_id = ? AND quantity >= ?',
                    [item.quantity, lorry_id, item.product_id, item.quantity]
                );

                if (stockUpdate.affectedRows === 0) {
                    throw new Error(`Insufficient stock for Product ${item.product_id} in Lorry`);
                }

                // 2. Record as Sold in Dispatch Checklist
                await connection.execute(
                    'UPDATE dispatch_items SET sold_quantity = sold_quantity + ? WHERE dispatch_id = ? AND product_id = ?',
                    [item.quantity, dispatch_id, item.product_id]
                );
            }

            // Step B: Insert Invoice Header
            await connection.execute(
                `INSERT INTO invoices (invoice_id, invoice_number, dealer_id, supervisor_id, lorry_id, dispatch_id, subtotal, total_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoice_id, `INV-${Date.now().toString().slice(-6)}`, dealer_id, supervisor_id, lorry_id, dispatch_id, total_amount, total_amount]
            );

            // Step C: Insert Invoice Line Items
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO invoice_items (invoice_item_id, invoice_id, product_id, quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [generateId('II'), invoice_id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }

            // Step D: Handle Financial Transactions
            if (payment_method === 'CREDIT') {
                await connection.execute(
                    `INSERT INTO credit_transactions (credit_id, dealer_id, invoice_id, credit_amount, remaining_balance, due_date)
                     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
                    [generateId('CRD'), dealer_id, invoice_id, total_amount, total_amount]
                );
                await connection.execute('UPDATE dealers SET current_credit = current_credit + ? WHERE dealer_id = ?', [total_amount, dealer_id]);
            } else {
                const payment_id = generateId('PAY');
                await connection.execute(
                    `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, collected_by)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [payment_id, `PAY-${Date.now().toString().slice(-6)}`, invoice_id, total_amount, payment_method, supervisor_id]
                );

                if (payment_method === 'CASH') {
                    await connection.execute(`INSERT INTO cash_payments (cash_payment_id, cash_received) VALUES (?, ?)`, [payment_id, total_amount]);
                } else if (payment_method === 'CHEQUE') {
                    await connection.execute(
                        `INSERT INTO cheque_payments (cheque_payment_id, cheque_number, cheque_date, bank_name, branch_name) VALUES (?, ?, ?, ?, ?)`,
                        [payment_id, cheque_details.number, cheque_details.date, cheque_details.bank, cheque_details.branch]
                    );
                }
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
    const { lorry_id, dispatch_id, product_id, quantity } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Deduct FILLED from lorry
            const [deduct] = await connection.execute(
                'UPDATE lorry_stock SET quantity = quantity - ? WHERE lorry_id = ? AND product_id = ? AND quantity >= ?',
                [quantity, lorry_id, product_id, quantity]
            );

            if (deduct.affectedRows === 0) throw new Error('Insufficient filled stock in lorry to report damage');

            // 2. Update dispatch tracking (Historical Record)
            await connection.execute(
                'UPDATE dispatch_items SET damaged_quantity = damaged_quantity + ? WHERE dispatch_id = ? AND product_id = ?',
                [quantity, dispatch_id, product_id]
            );

            // Note: In a real system, you might add +1 to a "DAMAGED" product_id in lorry_stock here as well

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
    const { dispatch_id, lorry_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Get all remaining physical items on the truck
            const [remainingStock] = await connection.execute('SELECT * FROM lorry_stock WHERE lorry_id = ? AND quantity > 0', [lorry_id]);

            for (const item of remainingStock) {
                // 2. Add back to warehouse inventory
                await connection.execute(
                    'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
                    [item.quantity, item.product_id]
                );

                // 3. Clear Lorry Stock
                await connection.execute('UPDATE lorry_stock SET quantity = 0 WHERE lorry_id = ? AND product_id = ?', [lorry_id, item.product_id]);
            }

            // 4. Release Resources
            const [dispatch] = await connection.execute('SELECT supervisor_id FROM dispatches WHERE dispatch_id = ?', [dispatch_id]);

            await connection.execute('UPDATE dispatches SET status = "UNLOADED" WHERE dispatch_id = ?', [dispatch_id]);
            await connection.execute('UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?', [lorry_id]);
            if (dispatch.length > 0) {
                await connection.execute('UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?', [dispatch[0].supervisor_id]);
            }

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
    const { dispatch_id, lorry_id } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [dispatch] = await connection.execute('SELECT status, supervisor_id FROM dispatches WHERE dispatch_id = ?', [dispatch_id]);
            if (!dispatch.length || dispatch[0].status !== 'SCHEDULED') {
                return errorResponse(res, 400, 'Only scheduled dispatches can be cancelled');
            }

            // 1. Revert Lorry Stock back to Warehouse Inventory
            const [truckItems] = await connection.execute('SELECT * FROM lorry_stock WHERE lorry_id = ? AND quantity > 0', [lorry_id]);
            for (const item of truckItems) {
                await connection.execute('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?', [item.quantity, item.product_id]);
                await connection.execute('UPDATE lorry_stock SET quantity = 0 WHERE lorry_id = ? AND product_id = ?', [lorry_id, item.product_id]);
            }

            // 2. Reset Statuses
            await connection.execute('UPDATE dispatches SET status = "CANCELLED" WHERE dispatch_id = ?', [dispatch_id]);
            await connection.execute('UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?', [dispatch[0].supervisor_id]);

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
            SELECT i.*, d.dealer_name, u.full_name as supervisor_name 
            FROM invoices i 
            JOIN dealers d ON i.dealer_id = d.dealer_id 
            JOIN users u ON i.supervisor_id = u.user_id
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
