// src/routes/notificationRoutes.js
const express = require('express');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Both ADMIN and SUPERVISOR can access their own notifications
router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

module.exports = router;
