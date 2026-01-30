const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateId } = require('../utils/generateId');

// Create a new dispatch with product allocation
const createDispatch = async (req, res, next) => {
    const { lorry_id, supervisor_id, route, dispatch_date, items } = req.body;
    const created_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const dispatch_id = generateId('DSP');
            const dispatch_number = `DSP-${Date.now().toString().slice(-6)}`;

            // 1. Insert Dispatch
            await connection.execute(
                `INSERT INTO dispatches (dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, dispatch_route, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)`,
                [dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, route, created_by]
            );

            // 2. Update lorry and supervisor status
            await connection.execute('UPDATE lorries SET status = "ON_ROUTE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "ON_DUTY" WHERE supervisor_id = ?', [supervisor_id]);

            // 3. Insert Allocated Items and Lorry Stock
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    const product_type = item.product_type || 'FILLED'; // Default to FILLED
                    
                    // Insert dispatch item with product_type
                    await connection.execute(
                        `INSERT INTO dispatch_items (dispatch_item_id, dispatch_id, product_id, product_type, allocated_quantity)
                         VALUES (?, ?, ?, ?, ?)`,
                        [generateId('DI'), dispatch_id, item.product_id, product_type, item.quantity]
                    );

                    // Deduct from warehouse inventory
                    await connection.execute(
                        `UPDATE inventory SET quantity = quantity - ? 
                         WHERE product_id = ? AND product_type = ? AND quantity >= ?`,
                        [item.quantity, item.product_id, product_type, item.quantity]
                    );

                    // Insert into lorry_stock (dispatch-based, not lorry-based)
                    await connection.execute(
                        `INSERT INTO lorry_stock (lorry_stock_id, dispatch_id, product_id, product_type, loaded_quantity)
                         VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE loaded_quantity = loaded_quantity + ?`,
                        [generateId('LS'), dispatch_id, item.product_id, product_type, item.quantity, item.quantity]
                    );
                }
            }

            await connection.commit();
            return successResponse(res, 201, 'Dispatch created and products allocated successfully', { dispatch_id, dispatch_number });
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

// Update dispatch progress with damage quantity
const updateDispatchProgress = async (req, res, next) => {
    const { dispatch_id, product_id, product_type, sold_quantity, damaged_quantity } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update dispatch items
            await connection.execute(
                `UPDATE dispatch_items 
                 SET sold_quantity = ?, damaged_quantity = ?
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = ?`,
                [sold_quantity || 0, damaged_quantity || 0, dispatch_id, product_id, product_type || 'FILLED']
            );

            // Update lorry stock
            await connection.execute(
                `UPDATE lorry_stock 
                 SET sold_quantity = ?, damaged_quantity = ?
                 WHERE dispatch_id = ? AND product_id = ? AND product_type = ?`,
                [sold_quantity || 0, damaged_quantity || 0, dispatch_id, product_id, product_type || 'FILLED']
            );

            await connection.commit();
            return successResponse(res, 200, 'Dispatch progress updated successfully');
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

// Complete dispatch - returns lorry to AVAILABLE
const completeDispatch = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get dispatch info
            const [dispatch] = await connection.execute(
                'SELECT dispatch_id, lorry_id, supervisor_id, status FROM dispatches WHERE dispatch_id = ?',
                [id]
            );

            if (dispatch.length === 0) {
                return errorResponse(res, 404, 'Dispatch not found');
            }

            if (dispatch[0].status === 'COMPLETED') {
                return errorResponse(res, 400, 'Dispatch is already completed');
            }

            // Update dispatch status
            await connection.execute(
                'UPDATE dispatches SET status = "COMPLETED", updated_at = CURRENT_TIMESTAMP WHERE dispatch_id = ?',
                [id]
            );

            // Set lorry back to AVAILABLE
            await connection.execute(
                'UPDATE lorries SET status = "AVAILABLE", updated_at = CURRENT_TIMESTAMP WHERE lorry_id = ?',
                [dispatch[0].lorry_id]
            );

            // Set supervisor back to AVAILABLE
            await connection.execute(
                'UPDATE supervisors SET status = "AVAILABLE", updated_at = CURRENT_TIMESTAMP WHERE supervisor_id = ?',
                [dispatch[0].supervisor_id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Dispatch completed successfully');
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
    createDispatch,
    updateDispatchProgress,
    completeDispatch
};
