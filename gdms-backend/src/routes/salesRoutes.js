const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { getMySales, getAllSales } = require('../controllers/salesController');

// Supervisor: their own sales
router.get('/my-sales', authenticateToken, checkRole('SUPERVISOR'), getMySales);

// Admin: all sales
router.get('/all', authenticateToken, checkRole('ADMIN'), getAllSales);

module.exports = router;