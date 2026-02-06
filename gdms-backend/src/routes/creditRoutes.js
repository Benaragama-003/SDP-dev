const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
    getAllCredits,
    getDealerCredits,
    settleCredit,
    getSettlementHistory,
    updateOverdueStatus,
    getCreditSummary
} = require('../controllers/creditController');

// All routes require authentication
router.use(authenticateToken);

// Define allowed roles for credit management
const CREDIT_ROLES = ['ADMIN', 'SUPERVISOR'];

// Get credit summary (dashboard)
router.get('/summary', checkRole(CREDIT_ROLES), getCreditSummary);

// Get all credit accounts
router.get('/', checkRole(CREDIT_ROLES), getAllCredits);

// Update overdue status - Now accessible to both ADMIN and SUPERVISOR
router.post('/update-overdue', checkRole(CREDIT_ROLES), updateOverdueStatus);

// Get credits for a specific dealer
router.get('/dealer/:dealerId', checkRole(CREDIT_ROLES), getDealerCredits);

// Get settlement history for a dealer
router.get('/history/:dealerId', checkRole(CREDIT_ROLES), getSettlementHistory);

// Settle credit (record payment)
router.post('/settle', checkRole(CREDIT_ROLES), settleCredit);

module.exports = router;