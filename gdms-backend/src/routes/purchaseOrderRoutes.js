const express = require('express');
const { 
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    getEmptyStock
} = require('../controllers/purchaseOrderController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);

// All routes require ADMIN role
router.get('/', checkRole('ADMIN'), getAllPurchaseOrders);
router.get('/empty-stock', checkRole('ADMIN'), getEmptyStock);
router.get('/:id', checkRole('ADMIN'), getPurchaseOrderById);
router.post('/', checkRole('ADMIN'), createPurchaseOrder);
router.put('/:id/approve', checkRole('ADMIN'), approvePurchaseOrder);
router.put('/:id/receive', checkRole('ADMIN'), receivePurchaseOrder);
router.put('/:id/cancel', checkRole('ADMIN'), cancelPurchaseOrder);

module.exports = router;