const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Create a new purchase order
const createPurchaseOrder = async (req, res, next) => {
    const { expected_date, items, notes } = req.body;
    const created_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const order_id = `PO${Date.now()}`;
            const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            // Supplier is now optional/removed as per plan
            await connection.execute(
                `INSERT INTO purchase_orders (order_id, order_number, expected_delivery_date, total_amount, status, created_by, notes, subtotal)
                 VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
                [order_id, `PO-${Date.now().toString().slice(-6)}`, expected_date, total_amount, created_by, notes, total_amount]
            );

            for (const item of items) {
                await connection.execute(
                    `INSERT INTO PO_items (order_item_id, order_id, product_id, ordered_quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [`POI${Date.now()}${Math.random().toString().slice(-4)}`, order_id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Purchase Order created successfully', { order_id });
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
    createPurchaseOrder
};
