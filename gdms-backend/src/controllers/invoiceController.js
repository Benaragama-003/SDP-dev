const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Create a new invoice
const createInvoice = async (req, res, next) => {
    const { dealer_id, items, payment_method, cheque_details } = req.body;
    const supervisor_id = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const invoice_id = `INV${Date.now()}`;
            const total_amount = Object.values(items).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            // 1. Insert Invoice
            await connection.execute(
                `INSERT INTO invoices (invoice_id, invoice_number, dealer_id, supervisor_id, total_amount, payment_method, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [invoice_id, `INV-${Date.now().toString().slice(-6)}`, dealer_id, supervisor_id, total_amount, payment_method, total_amount]
            );

            // 2. Insert Invoice Items
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO invoice_items (invoice_item_id, invoice_id, product_id, quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [`II${Date.now()}${Math.random().toString().slice(-4)}`, invoice_id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }

            // 3. Handle Cheque Details if payment_method is CHEQUE
            if (payment_method === 'CHEQUE' && cheque_details) {
                const payment_id = `PAY${Date.now()}`;
                await connection.execute(
                    `INSERT INTO payments (payment_id, payment_number, invoice_id, amount, payment_method, collected_by, bank_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [payment_id, `PAY-${Date.now().toString().slice(-6)}`, invoice_id, total_amount, 'CHEQUE', supervisor_id, cheque_details.bank_name]
                );

                await connection.execute(
                    `INSERT INTO cheque_payments (cheque_payment_id, cheque_number, cheque_date, bank_name, branch_name)
                     VALUES (?, ?, ?, ?, ?)`,
                    [payment_id, cheque_details.cheque_number, cheque_details.cheque_date, cheque_details.bank_name, cheque_details.branch_name]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Invoice created successfully', { invoice_id });
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
    createInvoice
};
