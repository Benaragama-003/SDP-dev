const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const chequeController = require('../controllers/chequeController');

// All routes require authentication
router.use(authenticateToken);

// Get all cheques - Admin only
router.get('/', checkRole(['ADMIN']), chequeController.getAllCheques);

// Update cheque status - Admin only
router.put('/:cheque_payment_id/status', checkRole(['ADMIN']), chequeController.updateChequeStatus);

module.exports = router;
