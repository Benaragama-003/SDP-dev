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

const getNextDSPNumber = async (connection) => {
    const [lastDSP] = await connection.execute(
        `SELECT dispatch_number FROM dispatches 
         ORDER BY created_at DESC, dispatch_number DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    
    if (lastDSP.length > 0) {
        const lastDispatchNumber = lastDSP[0].dispatch_number;
        const match = lastDispatchNumber.match(/DSP-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    
    // Format: DSP-01, DSP-02, ..., DSP-99, DSP-100, DSP-1000
    const formattedNumber = nextNumber.toString().padStart(2, '0');
    
    return `DSP-${formattedNumber}`;
};

// Get all dispatches with filters
const getAllDispatches = async (req, res, next) => {
    const { status, start_date, end_date, supervisor_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();

        let query = `
            SELECT 
                d.*,
                l.vehicle_number as plate_number,
                d.dispatch_route as route,
                CONCAT(u.first_name, ' ', u.last_name) as supervisor_name,
                CONCAT(c.first_name, ' ', c.last_name) as created_by_name
            FROM dispatches d
            LEFT JOIN lorries l ON d.lorry_id = l.lorry_id
            LEFT JOIN users u ON d.supervisor_id = u.user_id
            LEFT JOIN users c ON d.created_by = c.user_id
            WHERE 1=1
        `;
        const params = [];

        // Filter by supervisor (for supervisor's own dispatch list)
        if (supervisor_id) {
            query += ' AND d.supervisor_id = ?';
            params.push(supervisor_id);
        }

        // Handle multiple statuses (comma-separated)
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            if (statuses.length === 1) {
                query += ' AND d.status = ?';
                params.push(statuses[0]);
            } else {
                query += ` AND d.status IN (${statuses.map(() => '?').join(',')})`;
                params.push(...statuses);
            }
        }
        if (start_date) {
            query += ' AND d.dispatch_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND d.dispatch_date <= ?';
            params.push(end_date);
        }

        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // Add ordering and pagination
        query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [dispatches] = await pool.query(query, params);

        return successResponse(res, 200, 'Dispatches retrieved', {
            dispatches,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single dispatch with items and stock
const getDispatchById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [dispatches] = await pool.execute(`
            SELECT 
                d.*,
                l.vehicle_number as plate_number,
                l.vehicle_model,
                d.dispatch_route as route,
                CONCAT(u.first_name, ' ', u.last_name) as supervisor_name,
                u.phone_number as supervisor_phone,
                CONCAT(c.first_name, ' ', c.last_name) as created_by_name
            FROM dispatches d
            LEFT JOIN lorries l ON d.lorry_id = l.lorry_id
            LEFT JOIN users u ON d.supervisor_id = u.user_id
            LEFT JOIN users c ON d.created_by = c.user_id
            WHERE d.dispatch_id = ?
        `, [id]);

        if (dispatches.length === 0) {
            return errorResponse(res, 404, 'Dispatch not found');
        }

        // Get dispatch items with product info and lorry stock
        const [items] = await pool.execute(`
            SELECT 
                di.*,
                p.cylinder_size as size,
                di.product_type as type,
                p.product_code,
                COALESCE(ls.loaded_quantity, di.allocated_quantity) as loaded_quantity,
                COALESCE(ls.sold_filled, 0) as sold_filled,
                COALESCE(ls.sold_new, 0) as sold_new,
                COALESCE(ls.empty_collected, 0) as empty_collected,
                COALESCE(ls.damaged_quantity, 0) as damaged_quantity,
                (COALESCE(ls.loaded_quantity, di.allocated_quantity) - COALESCE(ls.sold_filled, 0) - COALESCE(ls.sold_new, 0) - COALESCE(ls.damaged_quantity, 0)) as balance_quantity
            FROM dispatch_items di
            JOIN products p ON di.product_id = p.product_id
            LEFT JOIN lorry_stock ls ON di.dispatch_id = ls.dispatch_id 
                AND di.product_id = ls.product_id 
                AND di.product_type = ls.product_type
            WHERE di.dispatch_id = ?
        `, [id]);

        return successResponse(res, 200, 'Dispatch retrieved', {
            dispatch: dispatches[0],
            items
        });
    } catch (error) {
        next(error);
    }
};

// Get available resources for dispatch creation
const getAvailableResources = async (req, res, next) => {
    try {
        const pool = await getConnection();

        // Get available lorries (not currently on a route)
        const [lorries] = await pool.execute(`
            SELECT 
                lorry_id, 
                vehicle_number as plate_number, 
                vehicle_model as model,
                COALESCE(
                    CASE 
                        WHEN vehicle_model LIKE '%10%' OR vehicle_model LIKE '%Large%' THEN 10
                        WHEN vehicle_model LIKE '%7%' OR vehicle_model LIKE '%Medium%' THEN 7
                        ELSE 5
                    END, 5
                ) as capacity
            FROM lorries 
            WHERE status = 'AVAILABLE'
            ORDER BY vehicle_number
        `);

        // Get available supervisors (not on duty)
        const [supervisors] = await pool.execute(`
            SELECT 
                s.supervisor_id as user_id, 
                CONCAT(u.first_name, ' ', u.last_name) as name, 
                u.phone_number
            FROM supervisors s
            JOIN users u ON s.supervisor_id = u.user_id
            WHERE s.status = 'AVAILABLE' AND u.status = 'ACTIVE'
            ORDER BY u.first_name
        `);

        // Get available filled inventory (products with stock)
        const [products] = await pool.execute(`
            SELECT 
                p.product_id,
                p.cylinder_size as size,
                'FILLED' as type,
                p.product_code,
                COALESCE(i.quantity, 0) as filled_stock
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id AND i.product_type = 'FILLED'
            WHERE p.status = 'ACTIVE'
            ORDER BY p.cylinder_size
        `);

        // Get unique routes from dealers
        const [routes] = await pool.execute(`
            SELECT DISTINCT route FROM dealers WHERE route IS NOT NULL AND route != '' ORDER BY route
        `);

        return successResponse(res, 200, 'Available resources retrieved', {
            lorries,
            supervisors,
            products,
            routes: routes.map(r => r.route)
        });
    } catch (error) {
        next(error);
    }
};

// Create a new dispatch with product allocation
const createDispatch = async (req, res, next) => {
    const { lorry_id, supervisor_id, route, dispatch_date, items } = req.body;
    const created_by = req.user.userId;

    if (!lorry_id || !supervisor_id || !dispatch_date || !items || items.length === 0) {
        return errorResponse(res, 400, 'Missing required fields: lorry_id, supervisor_id, dispatch_date, and items');
    }

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Validate lorry is available
            const [lorryCheck] = await connection.execute(
                'SELECT status FROM lorries WHERE lorry_id = ?', [lorry_id]
            );
            if (lorryCheck.length === 0 || lorryCheck[0].status !== 'AVAILABLE') {
                await connection.rollback();
                return errorResponse(res, 400, 'Lorry is not available');
            }

            // Validate supervisor is available
            const [supCheck] = await connection.execute(
                'SELECT status FROM supervisors WHERE supervisor_id = ?', [supervisor_id]
            );
            if (supCheck.length === 0 || supCheck[0].status !== 'AVAILABLE') {
                await connection.rollback();
                return errorResponse(res, 400, 'Supervisor is not available');
            }

            // Validate inventory availability
            for (const item of items) {
                const product_type = item.product_type || 'FILLED';
                const quantity = item.loaded_quantity || item.quantity;
                const [invCheck] = await connection.execute(
                    'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                    [item.product_id, product_type]
                );
                if (invCheck.length === 0 || invCheck[0].quantity < quantity) {
                    await connection.rollback();
                    return errorResponse(res, 400, `Insufficient stock for product ${item.product_id}. Available: ${invCheck[0]?.quantity || 0}, Requested: ${quantity}`);
                }
            }

            const dispatch_id = generateId('DSP');
            const dispatch_number = await getNextDSPNumber(connection);

            // 1. Insert Dispatch
            await connection.execute(
                `INSERT INTO dispatches (dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, dispatch_route, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)`,
                [dispatch_id, dispatch_number, dispatch_date, lorry_id, supervisor_id, route, created_by]
            );

            // 2. Update lorry and supervisor status
            await connection.execute('UPDATE lorries SET status = "ON_ROUTE" WHERE lorry_id = ?', [lorry_id]);
            await connection.execute('UPDATE supervisors SET status = "ON_DUTY" WHERE supervisor_id = ?', [supervisor_id]);

            // 3. Insert Allocated Items, Lorry Stock, and record movements
            for (const item of items) {
                const product_type = item.product_type || 'FILLED';
                const quantity = item.loaded_quantity || item.quantity;

                // Get current inventory quantity before update
                const [invBefore] = await connection.execute(
                    'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                    [item.product_id, product_type]
                );
                const qtyBefore = invBefore[0].quantity;
                const qtyAfter = qtyBefore - quantity;

                // Insert dispatch item
                await connection.execute(
                    `INSERT INTO dispatch_items (dispatch_item_id, dispatch_id, product_id, product_type, allocated_quantity)
                     VALUES (?, ?, ?, ?, ?)`,
                    [generateId('DI'), dispatch_id, item.product_id, product_type, quantity]
                );

                // Deduct from warehouse inventory
                await connection.execute(
                    `UPDATE inventory SET quantity = ?, last_updated = NOW() 
                     WHERE product_id = ? AND product_type = ?`,
                    [qtyAfter, item.product_id, product_type]
                );

                // Record inventory movement
                await recordInventoryMovement(connection, {
                    product_id: item.product_id,
                    product_type: product_type,
                    movement_type: 'DISPATCH_LOADED',
                    quantity_change: -quantity,
                    quantity_before: qtyBefore,
                    quantity_after: qtyAfter,
                    reference_id: dispatch_id,
                    created_by: created_by
                });

                // Insert into lorry_stock for real-time tracking
                await connection.execute(
                    `INSERT INTO lorry_stock (lorry_stock_id, dispatch_id, product_id, product_type, loaded_quantity)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE loaded_quantity = loaded_quantity + ?`,
                    [generateId('LS'), dispatch_id, item.product_id, product_type, quantity, quantity]
                );
            }

            await connection.commit();
            return successResponse(res, 201, 'Dispatch created successfully', { dispatch_id, dispatch_number });
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

// Start dispatch (SCHEDULED -> IN_PROGRESS)
const startDispatch = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [dispatch] = await pool.execute(
            'SELECT status FROM dispatches WHERE dispatch_id = ?', [id]
        );

        if (dispatch.length === 0) {
            return errorResponse(res, 404, 'Dispatch not found');
        }

        if (dispatch[0].status !== 'SCHEDULED') {
            return errorResponse(res, 400, `Cannot start dispatch with status: ${dispatch[0].status}`);
        }

        await pool.execute(
            'UPDATE dispatches SET status = "IN_PROGRESS" WHERE dispatch_id = ?',
            [id]
        );

        return successResponse(res, 200, 'Dispatch started successfully');
    } catch (error) {
        next(error);
    }
};

// Request unload (IN_PROGRESS -> AWAITING_UNLOAD) - Called by supervisor
const requestUnload = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [dispatch] = await pool.execute(
            'SELECT status FROM dispatches WHERE dispatch_id = ?', [id]
        );

        if (dispatch.length === 0) {
            return errorResponse(res, 404, 'Dispatch not found');
        }

        if (dispatch[0].status !== 'IN_PROGRESS') {
            return errorResponse(res, 400, `Cannot request unload for dispatch with status: ${dispatch[0].status}`);
        }

        await pool.execute(
            'UPDATE dispatches SET status = "AWAITING_UNLOAD" WHERE dispatch_id = ?',
            [id]
        );

        return successResponse(res, 200, 'Unload requested. Waiting for admin confirmation.');
    } catch (error) {
        next(error);
    }
};

// Accept unload and return stock to warehouse (AWAITING_UNLOAD -> UNLOADED)
const acceptUnload = async (req, res, next) => {
    const { id } = req.params;
    const { return_items } = req.body; // Optional: admin can adjust return quantities
    const received_by = req.user.userId;

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
                await connection.rollback();
                return errorResponse(res, 404, 'Dispatch not found');
            }

            if (dispatch[0].status !== 'AWAITING_UNLOAD') {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot accept unload for dispatch with status: ${dispatch[0].status}`);
            }

            // Get lorry stock (what's being returned)
            const [lorryStock] = await connection.execute(
                'SELECT * FROM lorry_stock WHERE dispatch_id = ?',
                [id]
            );

            // Process returns for each item
            for (const stock of lorryStock) {
                // Calculate balance (unsold filled cylinders to return)
                const balance = stock.loaded_quantity - (stock.sold_filled || 0) - (stock.sold_new || 0) - (stock.damaged_quantity || 0);
                
                // Check if admin provided adjusted return quantities
                const returnData = return_items?.find(r => 
                    r.product_id === stock.product_id && r.product_type === stock.product_type
                );
                
                // Use calculated balance or admin override
                const returnQty = returnData?.return_quantity ?? balance;

                // Return unsold FILLED cylinders to FILLED inventory
                if (returnQty > 0) {
                    // Get current inventory
                    const [invRows] = await connection.execute(
                        'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                        [stock.product_id, stock.product_type]
                    );
                    const currentQty = invRows.length > 0 ? invRows[0].quantity : 0;
                    const newQty = currentQty + returnQty;

                    // Add back to warehouse inventory
                    await connection.execute(
                        'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                        [newQty, stock.product_id, stock.product_type]
                    );

                    // Record inventory movement
                    await recordInventoryMovement(connection, {
                        product_id: stock.product_id,
                        product_type: stock.product_type,
                        movement_type: 'DISPATCH_RETURNED',
                        quantity_change: returnQty,
                        quantity_before: currentQty,
                        quantity_after: newQty,
                        reference_id: id,
                        created_by: received_by
                    });
                }

                // Handle empty_collected - add to EMPTY inventory
                const emptyQty = stock.empty_collected || 0;
                if (emptyQty > 0) {
                    const [emptyRows] = await connection.execute(
                        'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = "EMPTY"',
                        [stock.product_id]
                    );
                    const currentEmptyQty = emptyRows.length > 0 ? emptyRows[0].quantity : 0;
                    const newEmptyQty = currentEmptyQty + emptyQty;

                    if (emptyRows.length > 0) {
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = "EMPTY"',
                            [newEmptyQty, stock.product_id]
                        );
                    } else {
                        await connection.execute(
                            'INSERT INTO inventory (inventory_id, product_id, product_type, quantity) VALUES (?, ?, "EMPTY", ?)',
                            [generateId('INV'), stock.product_id, emptyQty]
                        );
                    }

                    // Record empty movement
                    await recordInventoryMovement(connection, {
                        product_id: stock.product_id,
                        product_type: 'EMPTY',
                        movement_type: 'DISPATCH_RETURNED',
                        quantity_change: emptyQty,
                        quantity_before: currentEmptyQty,
                        quantity_after: newEmptyQty,
                        reference_id: id,
                        created_by: received_by
                    });
                }

                // Handle damaged items - move to DAMAGED inventory
                if (stock.damaged_quantity > 0) {
                    const [dmgRows] = await connection.execute(
                        'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = "DAMAGED"',
                        [stock.product_id]
                    );
                    const currentDmgQty = dmgRows.length > 0 ? dmgRows[0].quantity : 0;
                    const newDmgQty = currentDmgQty + stock.damaged_quantity;

                    if (dmgRows.length > 0) {
                        await connection.execute(
                            'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = "DAMAGED"',
                            [newDmgQty, stock.product_id]
                        );
                    } else {
                        await connection.execute(
                            'INSERT INTO inventory (inventory_id, product_id, product_type, quantity) VALUES (?, ?, "DAMAGED", ?)',
                            [generateId('INV'), stock.product_id, stock.damaged_quantity]
                        );
                    }

                    // Record damage movement
                    await recordInventoryMovement(connection, {
                        product_id: stock.product_id,
                        product_type: 'DAMAGED',
                        movement_type: 'DAMAGE_REPORTED',
                        quantity_change: stock.damaged_quantity,
                        quantity_before: currentDmgQty,
                        quantity_after: newDmgQty,
                        reference_id: id,
                        created_by: received_by
                    });
                }
            }

            // Update dispatch status
            await connection.execute(
                'UPDATE dispatches SET status = "UNLOADED" WHERE dispatch_id = ?',
                [id]
            );

            // Set lorry back to AVAILABLE
            await connection.execute(
                'UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?',
                [dispatch[0].lorry_id]
            );

            // Set supervisor back to AVAILABLE
            await connection.execute(
                'UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?',
                [dispatch[0].supervisor_id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Dispatch unloaded. Stock returned to warehouse.');
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

// Cancel dispatch - return all stock to warehouse
const cancelDispatch = async (req, res, next) => {
    const { id } = req.params;
    const cancelled_by = req.user.userId;

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [dispatch] = await connection.execute(
                'SELECT dispatch_id, lorry_id, supervisor_id, status FROM dispatches WHERE dispatch_id = ?',
                [id]
            );

            if (dispatch.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Dispatch not found');
            }

            // Can only cancel SCHEDULED dispatches
            if (dispatch[0].status !== 'SCHEDULED') {
                await connection.rollback();
                return errorResponse(res, 400, `Cannot cancel dispatch with status: ${dispatch[0].status}. Only SCHEDULED dispatches can be cancelled.`);
            }

            // Get dispatch items and return to inventory
            const [items] = await connection.execute(
                'SELECT * FROM dispatch_items WHERE dispatch_id = ?',
                [id]
            );

            for (const item of items) {
                // Get current inventory
                const [invRows] = await connection.execute(
                    'SELECT quantity FROM inventory WHERE product_id = ? AND product_type = ?',
                    [item.product_id, item.product_type]
                );
                const currentQty = invRows.length > 0 ? invRows[0].quantity : 0;
                const newQty = currentQty + item.allocated_quantity;

                // Return to warehouse
                await connection.execute(
                    'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE product_id = ? AND product_type = ?',
                    [newQty, item.product_id, item.product_type]
                );

                // Record movement
                await recordInventoryMovement(connection, {
                    product_id: item.product_id,
                    product_type: item.product_type,
                    movement_type: 'DISPATCH_RETURNED',
                    quantity_change: item.allocated_quantity,
                    quantity_before: currentQty,
                    quantity_after: newQty,
                    reference_id: id,
                    created_by: cancelled_by
                });
            }

            // Update dispatch status
            await connection.execute(
                'UPDATE dispatches SET status = "CANCELLED" WHERE dispatch_id = ?',
                [id]
            );

            // Set lorry back to AVAILABLE
            await connection.execute(
                'UPDATE lorries SET status = "AVAILABLE" WHERE lorry_id = ?',
                [dispatch[0].lorry_id]
            );

            // Set supervisor back to AVAILABLE
            await connection.execute(
                'UPDATE supervisors SET status = "AVAILABLE" WHERE supervisor_id = ?',
                [dispatch[0].supervisor_id]
            );

            await connection.commit();
            return successResponse(res, 200, 'Dispatch cancelled. Stock returned to warehouse.');
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

// Update dispatch progress (sold/damaged quantities) - Called during dispatch
const updateDispatchProgress = async (req, res, next) => {
    const { id } = req.params;
    const { items } = req.body; // Array of { product_id, product_type, sold_quantity, damaged_quantity }

    try {
        const pool = await getConnection();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Verify dispatch exists and is in progress
            const [dispatch] = await connection.execute(
                'SELECT status FROM dispatches WHERE dispatch_id = ?', [id]
            );

            if (dispatch.length === 0) {
                await connection.rollback();
                return errorResponse(res, 404, 'Dispatch not found');
            }

            if (dispatch[0].status !== 'IN_PROGRESS') {
                await connection.rollback();
                return errorResponse(res, 400, 'Can only update progress for IN_PROGRESS dispatches');
            }

            for (const item of items) {
                const product_type = item.product_type || 'FILLED';

                // Update dispatch items
                await connection.execute(
                    `UPDATE dispatch_items 
                     SET sold_quantity = ?, damaged_quantity = ?
                     WHERE dispatch_id = ? AND product_id = ? AND product_type = ?`,
                    [item.sold_quantity || 0, item.damaged_quantity || 0, id, item.product_id, product_type]
                );

                // Update lorry stock
                await connection.execute(
                    `UPDATE lorry_stock 
                     SET sold_quantity = ?, damaged_quantity = ?
                     WHERE dispatch_id = ? AND product_id = ? AND product_type = ?`,
                    [item.sold_quantity || 0, item.damaged_quantity || 0, id, item.product_id, product_type]
                );
            }

            await connection.commit();
            return successResponse(res, 200, 'Dispatch progress updated');
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

// Get dispatch for supervisor (their active dispatch)
const getMyDispatch = async (req, res, next) => {
    const supervisor_id = req.user.userId;

    try {
        const pool = await getConnection();

        const [dispatches] = await pool.execute(`
            SELECT 
                d.*,
                l.vehicle_number as plate_number,
                l.vehicle_model,
                d.dispatch_route as route
            FROM dispatches d
            LEFT JOIN lorries l ON d.lorry_id = l.lorry_id
            WHERE d.supervisor_id = ? AND d.status IN ('SCHEDULED', 'IN_PROGRESS')
            ORDER BY d.dispatch_date DESC
            LIMIT 1
        `, [supervisor_id]);

        if (dispatches.length === 0) {
            return successResponse(res, 200, 'No active dispatch', null);
        }

        // Get items with stock info
        const [items] = await pool.execute(`
            SELECT 
                ls.*,
                p.cylinder_size as size,
                ls.product_type as type,
                p.product_code,
                p.filled_selling_price,
                p.new_selling_price,
                (ls.loaded_quantity - COALESCE(ls.sold_filled, 0) - COALESCE(ls.sold_new, 0) - ls.damaged_quantity) as balance_quantity
            FROM lorry_stock ls
            JOIN products p ON ls.product_id = p.product_id
            WHERE ls.dispatch_id = ?
        `, [dispatches[0].dispatch_id]);

        return successResponse(res, 200, 'Active dispatch retrieved', {
            ...dispatches[0],
            items
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllDispatches,
    getDispatchById,
    getAvailableResources,
    createDispatch,
    startDispatch,
    requestUnload,
    acceptUnload,
    cancelDispatch,
    updateDispatchProgress,
    getMyDispatch
};
