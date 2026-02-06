const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateId } = require('../utils/generateId');

// Helper function to record inventory movement
const recordInventoryMovement = async (connection, data) => {
    const movement_id = generateId('MOV');
    await connection.execute(
        `INSERT INTO inventory_movements 
         (movement_id, product_id, product_type, movement_type, quantity_change, quantity_before, quantity_after, reference_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movement_id, data.product_id, data.product_type, data.movement_type, data.quantity_change, data.quantity_before, data.quantity_after, data.reference_id, data.created_by]
    );
};

// Get all purchase orders
const getAllPurchaseOrders = async (req, res, next) => {
    const { status, start_date, end_date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        
        let query = `
            SELECT 
                po.*,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                CONCAT(a.first_name, ' ', a.last_name) as approved_by_name,
                CONCAT(r.first_name, ' ', r.last_name) as received_by_name
            FROM purchase_orders po
            LEFT JOIN users u ON po.created_by = u.user_id
            LEFT JOIN users a ON po.approved_by = a.user_id
            LEFT JOIN users r ON po.received_by = r.user_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND po.status = ?';
            params.push(status);
        }
        if (start_date) {
            query += ' AND po.order_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND po.order_date <= ?';
            params.push(end_date);
        }

        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.execute(countQuery, params);
        const total = countResult[0].total;

        // Add ordering and pagination
        query += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Use query() instead of execute() for LIMIT/OFFSET compatibility with MySQL2
        const [orders] = await pool.query(query, params);

        return successResponse(res, 200, 'Purchase orders retrieved', {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single purchase order with items
const getPurchaseOrderById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [orders] = await pool.execute(`
            SELECT 
                po.*,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                CONCAT(a.first_name, ' ', a.last_name) as approved_by_name,
                CONCAT(r.first_name, ' ', r.last_name) as received_by_name
            FROM purchase_orders po
            LEFT JOIN users u ON po.created_by = u.user_id
            LEFT JOIN users a ON po.approved_by = a.user_id
            LEFT JOIN users r ON po.received_by = r.user_id
            WHERE po.order_id = ?
        `, [id]);

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        const [items] = await pool.execute(`
            SELECT 
                poi.*,
                p.cylinder_size,
                p.product_code
            FROM PO_items poi
            JOIN products p ON poi.product_id = p.product_id
            WHERE poi.order_id = ?
        `, [id]);

        return successResponse(res, 200, 'Purchase order retrieved', {
            ...orders[0],
            items
        });
    } catch (error) {
        next(error);
    }
};

// Create a new purchase order
const createPurchaseOrder = async (req, res, next) => {
    const { expected_date, items, supplier_contact, notes } = req.body;
    const created_by = req.user.userId;

    if (!items || items.length === 0) {
        return errorResponse(res, 400, 'At least one item is required');
    }

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const order_id = generateId('PO');
            const order_number = `PO-${Date.now().toString().slice(-8)}`;
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            await connection.execute(
                `INSERT INTO purchase_orders 
                 (order_id, order_number, expected_delivery_date, subtotal, total_amount, status, supplier_contact, created_by)
                 VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [order_id, order_number, expected_date, subtotal, subtotal, supplier_contact || null, created_by]
            );

            for (const item of items) {
                await connection.execute(
                    `INSERT INTO PO_items 
                     (order_item_id, order_id, product_id, purchase_type, ordered_quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        generateId('POI'), 
                        order_id, 
                        item.product_id, 
                        item.purchase_type || 'FILLED', 
                        item.quantity, 
                        item.unit_price, 
                        item.quantity * item.unit_price
                    ]
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

// Approve a purchase order
const approvePurchaseOrder = async (req, res, next) => {
    const { id } = req.params;
    const approved_by = req.user.userId;

    try {
        const pool = await getConnection();

        // Check current status
        const [orders] = await pool.execute(
            'SELECT status FROM purchase_orders WHERE order_id = ?',
            [id]
        );

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        if (orders[0].status !== 'PENDING') {
            return errorResponse(res, 400, `Cannot approve order with status: ${orders[0].status}`);
        }

        await pool.execute(
            `UPDATE purchase_orders 
             SET status = 'APPROVED', approved_by = ?, updated_at = NOW()
             WHERE order_id = ?`,
            [approved_by, id]
        );

        return successResponse(res, 200, 'Purchase order approved successfully');
    } catch (error) {
        next(error);
    }
};

// Receive a purchase order (updates inventory)
const receivePurchaseOrder = async (req, res, next) => {
    const { id } = req.params;
    const { received_items, supplier_invoice_number } = req.body;
    const received_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get order and verify status
            const [orders] = await connection.execute(
                'SELECT * FROM purchase_orders WHERE order_id = ?',
                [id]
            );

            if (orders.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Purchase order not found');
            }

            if (orders[0].status !== 'APPROVED') {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot receive order with status: ${orders[0].status}. Must be APPROVED first.`);
            }

            // Get PO items with product info
            const [poItems] = await connection.execute(
                `SELECT poi.*, p.cylinder_size FROM PO_items poi 
                 JOIN products p ON poi.product_id = p.product_id 
                 WHERE poi.order_id = ?`,
                [id]
            );

            // First pass: Validate empty stock for FILLED (refill) items
            for (const poItem of poItems) {
                if (poItem.purchase_type === 'FILLED') {
                    const receivedData = received_items?.find(ri => ri.order_item_id === poItem.order_item_id);
                    const receivedQty = receivedData?.received_quantity ?? poItem.ordered_quantity;
                    
                    if (receivedQty > 0) {
                        // Check available empty stock
                        const [emptyRows] = await connection.execute(
                            'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                            [poItem.product_id, 'EMPTY']
                        );
                        const availableEmpty = emptyRows.length > 0 ? emptyRows[0].quantity : 0;
                        
                        if (receivedQty > availableEmpty) {
                            await connection.rollback();
                            return errorResponse(res, 400, 
                                `Cannot receive ${receivedQty} refills for ${poItem.cylinder_size}. Only ${availableEmpty} empty cylinders available. ` +
                                `Refills require empty cylinders for exchange.`
                            );
                        }
                    }
                }
            }

            // Second pass: Process each item
            for (const poItem of poItems) {
                const receivedData = received_items?.find(ri => ri.order_item_id === poItem.order_item_id);
                const receivedQty = receivedData?.received_quantity ?? poItem.ordered_quantity;

                // Update PO_items with received quantity
                await connection.execute(
                    'UPDATE PO_items SET received_quantity = ? WHERE order_item_id = ?',
                    [receivedQty, poItem.order_item_id]
                );

                if (receivedQty > 0) {
                    // For FILLED (refill) orders: Deduct from EMPTY stock first
                    if (poItem.purchase_type === 'FILLED') {
                        const [emptyRows] = await connection.execute(
                            'SELECT inventory_id, quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                            [poItem.product_id, 'EMPTY']
                        );
                        
                        const currentEmptyQty = emptyRows[0].quantity;
                        const newEmptyQty = currentEmptyQty - receivedQty;
                        
                        // Deduct from EMPTY inventory
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                            [newEmptyQty, poItem.product_id, 'EMPTY']
                        );
                        
                        // Record movement for EMPTY deduction
                        await recordInventoryMovement(connection, {
                            product_id: poItem.product_id,
                            product_type: 'EMPTY',
                            movement_type: 'PURCHASE_RECEIVED',
                            quantity_change: -receivedQty,
                            quantity_before: currentEmptyQty,
                            quantity_after: newEmptyQty,
                            reference_id: id,
                            created_by: received_by
                        });
                    }

                    // Add to FILLED inventory
                    const [invRows] = await connection.execute(
                        'SELECT inventory_id, quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                        [poItem.product_id, 'FILLED']
                    );

                    const currentQty = invRows.length > 0 ? invRows[0].quantity : 0;
                    const newQty = currentQty + receivedQty;

                    // Update or insert FILLED inventory
                    if (invRows.length > 0) {
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                            [newQty, poItem.product_id, 'FILLED']
                        );
                    } else {
                        // Insert new inventory record if it doesn't exist
                        const inventory_id = generateId('INV');
                        await connection.execute(
                            `INSERT INTO inventory (inventory_id, product_id, product_type, quantity, managed_by) 
                             VALUES (?, ?, 'FILLED', ?, ?)`,
                            [inventory_id, poItem.product_id, newQty, received_by]
                        );
                    }

                    // Record inventory movement for FILLED
                    await recordInventoryMovement(connection, {
                        product_id: poItem.product_id,
                        product_type: 'FILLED',
                        movement_type: 'PURCHASE_RECEIVED',
                        quantity_change: receivedQty,
                        quantity_before: currentQty,
                        quantity_after: newQty,
                        reference_id: id,
                        created_by: received_by
                    });
                }
            }

            // Calculate actual received total amount
            const [updatedItems] = await connection.execute(
                'SELECT received_quantity, unit_price FROM PO_items WHERE order_id = ?',
                [id]
            );
            const actualTotal = updatedItems.reduce((sum, item) => 
                sum + (item.received_quantity * parseFloat(item.unit_price)), 0
            );

            // Update purchase order status and actual total
            await connection.execute(
                `UPDATE purchase_orders 
                 SET status = 'RECEIVED', 
                     actual_delivery_date = CURDATE(), 
                     received_by = ?,
                     supplier_invoice_number = ?,
                     subtotal = ?,
                     total_amount = ?,
                     updated_at = NOW()
                 WHERE order_id = ?`,
                [received_by, supplier_invoice_number || null, actualTotal, actualTotal, id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Purchase order received and inventory updated successfully');
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

// Cancel a purchase order
const cancelPurchaseOrder = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [orders] = await pool.execute(
            'SELECT status FROM purchase_orders WHERE order_id = ?',
            [id]
        );

        if (orders.length === 0) {
            return errorResponse(res, 404, 'Purchase order not found');
        }

        if (orders[0].status === 'RECEIVED') {
            return errorResponse(res, 400, 'Cannot cancel a received order');
        }

        await pool.execute(
            `UPDATE purchase_orders SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = ?`,
            [id]
        );

        return successResponse(res, 200, 'Purchase order cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// Get available empty stock for refill validation
const getEmptyStock = async (req, res, next) => {
    try {
        const pool = await getConnection();
        
        const [rows] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size,
                p.product_code,
                COALESCE(i.quantity, 0) as empty_quantity
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id AND i.product_type = 'EMPTY'
            WHERE p.status = 'ACTIVE'
            ORDER BY CAST(REGEXP_REPLACE(p.cylinder_size, '[^0-9.]', '') AS DECIMAL(10,2))
        `);
        
        return successResponse(res, 200, 'Empty stock retrieved', rows);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    getEmptyStock
};