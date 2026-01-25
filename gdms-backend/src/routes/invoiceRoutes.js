const express = require('express');
const { createInvoice } = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/', createInvoice);

module.exports = router;
