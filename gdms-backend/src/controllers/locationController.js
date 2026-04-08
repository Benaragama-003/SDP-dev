const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const updateLocation = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const { latitude, longitude } = req.body;
        const supervisorId = req.user.userId;

        if (!latitude || !longitude) {
            return errorResponse(res, 400, 'Latitude and longitude are required');
        }

        await pool.execute(
            `INSERT INTO supervisor_locations (supervisor_id, latitude, longitude)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?, updated_at = NOW()`,
            [supervisorId, latitude, longitude, latitude, longitude]
        );

        return successResponse(res, 200, 'Location updated');
    } catch (error) {
        next(error);
    }
};

const getSupervisorLocations = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT
                sl.supervisor_id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                sl.latitude,
                sl.longitude,
                sl.updated_at,
                d.dispatch_route,
                d.status AS dispatch_status
            FROM supervisor_locations sl
            JOIN users u ON u.user_id = sl.supervisor_id
            LEFT JOIN dispatches d ON d.supervisor_id = sl.supervisor_id
                AND d.status IN ('IN_PROGRESS', 'SCHEDULED')
            ORDER BY sl.updated_at DESC
        `);

        return successResponse(res, 200, 'Supervisor locations retrieved', rows);
    } catch (error) {
        next(error);
    }
};

module.exports = { updateLocation, getSupervisorLocations };
