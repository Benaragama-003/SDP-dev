const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateId } = require('../utils/generateId');

// Create a new purchase order
const createPurchaseOrder = async (req, res, next) => {
    const { expected_date, items, supplier_contact } = req.body;
    const created_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const order_id = generateId('PO');
            const order_number = `PO-${Date.now().toString().slice(-6)}`;
            const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            await connection.execute(
                `INSERT INTO purchase_orders (order_id, order_number, expected_delivery_date, subtotal, total_amount, status, supplier_contact, created_by)
                 VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [order_id, order_number, expected_date, total_amount, total_amount, supplier_contact || null, created_by]
            );

            for (const item of items) {
                // purchase_type: 'FILLED' for refilling empties, 'NEW' for buying new cylinders
                await connection.execute(
                    `INSERT INTO PO_items (order_item_id, order_id, product_id, purchase_type, ordered_quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [generateId('POI'), order_id, item.product_id, item.purchase_type || 'FILLED', item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Purchase Order created successfully', { order_id, order_number });
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
