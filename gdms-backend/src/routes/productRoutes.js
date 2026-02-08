const express = require('express');
const { 
    getAllProducts, 
    createProduct, 
    getInventorySummary,
    getInventorySummaryForSupervisor,  // ✅ ADD THIS
    getActiveProducts,
    updateProduct,
    toggleProductStatus,
    reportDamage,
    getInventoryMovements,
    exportInventoryToExcel
} = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);

router.get('/inventory/summary', (req, res, next) => {
    if (req.user.role === 'ADMIN') {
        return getInventorySummary(req, res, next);
    } else {
        return getInventorySummaryForSupervisor(req, res, next);
    }
});

// Specific routes first (before parameterized routes)
router.get('/inventory', getInventorySummary); // Keep for backward compatibility
router.get('/active', getActiveProducts); // For dropdowns in Dispatch/Purchase Orders
router.get('/movements', checkRole(['ADMIN']), getInventoryMovements);
router.get('/export', checkRole(['ADMIN']), exportInventoryToExcel);
router.post('/damage', checkRole(['ADMIN']), reportDamage);

// Base routes
router.get('/', getAllProducts);
router.post('/', checkRole(['ADMIN']), createProduct);

// Parameterized routes last
router.put('/:id', checkRole(['ADMIN']), updateProduct);
router.patch('/:id/toggle-status', checkRole(['ADMIN']), toggleProductStatus);

module.exports = router;