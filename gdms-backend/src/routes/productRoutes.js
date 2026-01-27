const express = require('express');
const { getAllProducts, createProduct, getInventorySummary } = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);
router.get('/inventory', getInventorySummary);
router.get('/', getAllProducts);
router.post('/', checkRole('ADMIN'), createProduct);

module.exports = router;
