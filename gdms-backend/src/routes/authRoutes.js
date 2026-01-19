// src/routes/authRoutes.js
const express = require('express');
const { login, register, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected route
router.get('/profile', authenticateToken, getProfile);

module.exports = router;