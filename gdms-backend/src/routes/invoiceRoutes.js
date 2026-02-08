const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All invoice routes require a login
router.use(authenticateToken);

// 1. Get invoices (Supervisor sees their own, Admin sees all)
router.get('/', checkRole(['ADMIN', 'SUPERVISOR']), invoiceController.getAllInvoices);

// 2. Create invoice (Supervisor only)
router.post('/', checkRole(['SUPERVISOR']), invoiceController.createInvoice);

// 3. Report damage (Supervisor only)
router.post('/report-damage', checkRole(['SUPERVISOR']), invoiceController.reportDamage);

// 4. Soft delete invoice (Supervisor only)
router.put('/:id/delete', checkRole(['SUPERVISOR']), invoiceController.softDeleteInvoice);

// 5. Download invoice PDF
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

// 6. Export invoices to Excel (Admin only)
router.get('/export', checkRole(['ADMIN']), invoiceController.exportInvoicesToExcel);

module.exports = router;