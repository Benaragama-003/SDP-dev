const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All invoice routes require a login
router.use(authenticateToken);

// 1. Invoicing (Supervisor only)
router.post('/', checkRole('SUPERVISOR'), invoiceController.createInvoice);

// 2. Reporting
router.get('/', checkRole('ADMIN', 'SUPERVISOR'), invoiceController.getAllInvoices);

// 3. Trip Management (Supervisor)
router.patch('/:dispatch_id/complete', checkRole('SUPERVISOR'), invoiceController.completeTrip);
router.post('/report-damage', checkRole('SUPERVISOR'), invoiceController.reportDamage);

// 4. Admin Finalization
router.post('/accept-unload', checkRole('ADMIN'), invoiceController.acceptUnload);
router.post('/cancel-dispatch', checkRole('ADMIN'), invoiceController.cancelDispatch);

module.exports = router;