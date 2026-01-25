const express = require('express');
const { createPurchaseOrder } = require('../controllers/purchaseOrderController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);

router.post('/', checkRole('ADMIN'), createPurchaseOrder);

module.exports = router;
