const express = require('express');
const { 
    getAllDispatches,
    getDispatchById,
    getAvailableResources,
    createDispatch,
    startDispatch,
    requestUnload,
    acceptUnload,
    cancelDispatch,
    updateDispatchProgress,
    getMyDispatch
} = require('../controllers/dispatchController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);

// ===== SUPERVISOR ROUTES (must be before :id routes) =====
// Get supervisor's active dispatch
router.get('/my/active', getMyDispatch);

// ===== SHARED ROUTES =====
// Get all dispatches (admin can see all, supervisor can filter by their own ID)
router.get('/', checkRole(['ADMIN', 'SUPERVISOR']), getAllDispatches);

// ===== ADMIN ROUTES =====
// Get available resources for dispatch creation (admin only)
router.get('/resources', checkRole(['ADMIN']), getAvailableResources);

// Get specific dispatch by ID
router.get('/:id', getDispatchById);

// Create new dispatch (admin only)
router.post('/', checkRole(['ADMIN']), createDispatch);

// Start dispatch (change status to IN_PROGRESS)
router.put('/:id/start', startDispatch);

// Request unload (supervisor signals end of day)
router.put('/:id/request-unload', requestUnload);

// Accept unload and return stock to warehouse (admin only)
router.put('/:id/accept-unload', checkRole(['ADMIN']), acceptUnload);

// Cancel dispatch (admin only, only for SCHEDULED)
router.put('/:id/cancel', checkRole(['ADMIN']), cancelDispatch);

// Update dispatch progress (sold/damaged quantities)
router.put('/:id/progress', updateDispatchProgress);

module.exports = router;
