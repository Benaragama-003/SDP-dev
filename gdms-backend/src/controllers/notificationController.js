// src/controllers/notificationController.js
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Get all notifications for the logged-in user
const getMyNotifications = async (req, res, next) => {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const pool = await getConnection();

        // Get unread count
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        // Get notifications (newest first)
        const [notifications] = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        return successResponse(res, 200, 'Notifications retrieved', {
            notifications,
            unread_count: countResult[0].unread_count
        });
    } catch (error) {
        next(error);
    }
};

// Mark a single notification as read
const markAsRead = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const pool = await getConnection();

        await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
            [id, userId]
        );

        return successResponse(res, 200, 'Notification marked as read');
    } catch (error) {
        next(error);
    }
};

// Mark ALL notifications as read for the user
const markAllAsRead = async (req, res, next) => {
    const userId = req.user.userId;

    try {
        const pool = await getConnection();

        await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        return successResponse(res, 200, 'All notifications marked as read');
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
