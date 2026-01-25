const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Create a new dispatch with product allocation
const createDispatch = async (req, res, next) => {
    const { lorry_id, supervisor_id, route, dispatch_date, items } = req.body;
    const created_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const dispatch_id = `DSP${Date.now()}`;
            const dispatch_number = `DSP-${Date.now().toString().slice(-6)}`;

            // 1. Insert Dispatch
            await connection.execute(
                `INSERT INTO dispatches (dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, dispatch_route, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)`,
                [dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, route, created_by]
            );

            // 2. Insert Allocated Items
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    await connection.execute(
                        `INSERT INTO dispatch_items (dispatch_item_id, dispatch_id, product_id, allocated_quantity)
                         VALUES (?, ?, ?, ?)`,
                        [`DI${Date.now()}${Math.random().toString().slice(-4)}`, dispatch_id, item.product_id, item.quantity]
                    );

                    // Optional: Deduct from Warehouse Inventory but usually dispatches represent "moving" stock
                    // In this system, stock in Lorry is separate.
                    await connection.execute(
                        `INSERT INTO lorry_stock (lorry_stock_id, lorry_id, product_id, quantity)
                         VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                        [`LS${Date.now()}${Math.random().toString().slice(-4)}`, lorry_id, item.product_id, item.quantity, item.quantity]
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
    const { dispatch_id, product_id, sold_quantity, damaged_quantity, notes } = req.body;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update dispatch items
            await connection.execute(
                `UPDATE dispatch_items 
                 SET sold_quantity = ?, damaged_quantity = ?, notes = ?
                 WHERE dispatch_id = ? AND product_id = ?`,
                [sold_quantity, damaged_quantity, notes, dispatch_id, product_id]
            );

            // Logic: Damage replacement means a FILLED unit is effectively "sold" but marked as damage exchange
            // No direct stock deduction here as it's reflected in the final reconcile.

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

module.exports = {
    createDispatch,
    updateDispatchProgress
};
