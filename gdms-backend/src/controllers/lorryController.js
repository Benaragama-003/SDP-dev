const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Helper function to generate next lorry ID (L001, L002, etc.)
const generateLorryId = async (pool) => {
    const [result] = await pool.execute(
        `SELECT lorry_id FROM lorries ORDER BY lorry_id DESC LIMIT 1`
    );
    
    if (result.length === 0) {
        return 'L001';
    }
    
    // Extract number from last ID (e.g., 'L005' -> 5)
    const lastId = result[0].lorry_id;
    const lastNumber = parseInt(lastId.substring(1), 10);
    const nextNumber = lastNumber + 1;
    
    // Pad with zeros (e.g., 6 -> 'L006')
    return 'L' + nextNumber.toString().padStart(3, '0');
};

// GET all lorries
const getAllLorries = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [lorries] = await pool.execute(`
            SELECT 
                lorry_id,
                vehicle_number,
                vehicle_model,
                status,
                last_service_date,
                next_service_date,
                created_at,
                updated_at
            FROM lorries
            ORDER BY created_at DESC
        `);
        return successResponse(res, 200, 'Lorries retrieved successfully', lorries);
    } catch (error) {
        next(error);
    }
};

// GET single lorry by ID
const getLorryById = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;

        const [lorries] = await pool.execute(
            'SELECT * FROM lorries WHERE lorry_id = ?',
            [id]
        );

        if (lorries.length === 0) {
            return errorResponse(res, 404, 'Lorry not found');
        }

        return successResponse(res, 200, 'Lorry retrieved successfully', lorries[0]);
    } catch (error) {
        next(error);
    }
};

// CREATE new lorry
const createLorry = async (req, res, next) => {
    const { vehicle_number, vehicle_model, last_service_date } = req.body;

    try {
        const pool = await getConnection();

        // Check if vehicle number already exists
        const [existing] = await pool.execute(
            'SELECT lorry_id FROM lorries WHERE vehicle_number = ?',
            [vehicle_number]
        );

        if (existing.length > 0) {
            return errorResponse(res, 409, 'Vehicle number already exists');
        }

        // Generate lorry ID (L001, L002, etc.)
        const lorry_id = await generateLorryId(pool);
        
        // Calculate next_service_date = last_service_date + 3 months
        let next_service_date = null;
        if (last_service_date) {
            const serviceDate = new Date(last_service_date);
            serviceDate.setMonth(serviceDate.getMonth() + 3);
            next_service_date = serviceDate.toISOString().split('T')[0];
        }

        await pool.execute(
            `INSERT INTO lorries (lorry_id, vehicle_number, vehicle_model, last_service_date, next_service_date, status)
             VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
            [lorry_id, vehicle_number, vehicle_model || null, last_service_date || null, next_service_date]
        );

        return successResponse(res, 201, 'Lorry added successfully', {
            lorry_id,
            vehicle_number,
            vehicle_model,
            last_service_date,
            next_service_date
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE lorry details
const updateLorry = async (req, res, next) => {
    const { id } = req.params;
    const { vehicle_number, vehicle_model, status } = req.body;

    try {
        const pool = await getConnection();

        // Check if lorry exists and get current status
        const [existing] = await pool.execute(
            'SELECT lorry_id, status FROM lorries WHERE lorry_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return errorResponse(res, 404, 'Lorry not found');
        }

        const currentStatus = existing[0].status;

        // If trying to change status
        if (status) {
            // Only allow AVAILABLE or MAINTENANCE as manual status (matches schema ENUM)
            const allowedStatuses = ['AVAILABLE', 'MAINTENANCE'];
            if (!allowedStatuses.includes(status.toUpperCase())) {
                return errorResponse(res, 400, 'Invalid status. Admin can only set AVAILABLE or MAINTENANCE');
            }

            // Block if lorry is currently ON_ROUTE
            if (currentStatus === 'ON_ROUTE') {
                return errorResponse(res, 400, 'Cannot change status while lorry is on route. Complete the dispatch first.');
            }
        }

        // Only update status - vehicle_number cannot be changed
        await pool.execute(
            `UPDATE lorries SET 
                vehicle_model = COALESCE(?, vehicle_model),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE lorry_id = ?`,
            [vehicle_model, status ? status.toUpperCase() : null, id]
        );

        return successResponse(res, 200, 'Lorry updated successfully');
    } catch (error) {
        next(error);
    }
};

// MARK SERVICE DONE - Updates last_service_date to today, recalculates next_service_date
const markServiceDone = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        // Check if lorry exists
        const [existing] = await pool.execute(
            'SELECT lorry_id FROM lorries WHERE lorry_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return errorResponse(res, 404, 'Lorry not found');
        }

        // Set last_service_date to today, next_service_date to today + 3 months
        const today = new Date();
        const last_service_date = today.toISOString().split('T')[0];
        
        const nextDate = new Date(today);
        nextDate.setMonth(nextDate.getMonth() + 3);
        const next_service_date = nextDate.toISOString().split('T')[0];

        await pool.execute(
            `UPDATE lorries SET 
                last_service_date = ?,
                next_service_date = ?,
                status = 'AVAILABLE',
                updated_at = CURRENT_TIMESTAMP
             WHERE lorry_id = ?`,
            [last_service_date, next_service_date, id]
        );

        return successResponse(res, 200, 'Service marked as done', {
            last_service_date,
            next_service_date
        });
    } catch (error) {
        next(error);
    }
};

// GET available lorries (for dispatch dropdown)
const getAvailableLorries = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [lorries] = await pool.execute(
            `SELECT lorry_id, vehicle_number, vehicle_model 
             FROM lorries 
             WHERE status = 'AVAILABLE'
             ORDER BY vehicle_number`
        );
        return successResponse(res, 200, 'Available lorries retrieved', lorries);
    } catch (error) {
        next(error);
    }
};

// DELETE lorry (soft delete by setting status)
const deleteLorry = async (req, res, next) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        const [existing] = await pool.execute(
            'SELECT lorry_id, status FROM lorries WHERE lorry_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return errorResponse(res, 404, 'Lorry not found');
        }

        if (existing[0].status === 'ON_ROUTE') {
            return errorResponse(res, 400, 'Cannot delete lorry that is currently on route');
        }

        await pool.execute('DELETE FROM lorries WHERE lorry_id = ?', [id]);

        return successResponse(res, 200, 'Lorry deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllLorries,
    getLorryById,
    createLorry,
    updateLorry,
    markServiceDone,
    getAvailableLorries,
    deleteLorry
};