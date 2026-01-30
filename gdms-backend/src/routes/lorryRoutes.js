const express = require('express');
const router = express.Router();
const {
    getAllLorries,
    getLorryById,
    createLorry,
    updateLorry,
    markServiceDone,
    getAvailableLorries,
    deleteLorry
} = require('../controllers/lorryController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication
router.use(authenticateToken);

// GET available lorries (for dropdowns) - accessible by all authenticated users
router.get('/available', getAvailableLorries);

// Admin-only routes
router.get('/', checkRole(['ADMIN']), getAllLorries);
router.get('/:id', checkRole(['ADMIN']), getLorryById);
router.post('/', checkRole(['ADMIN']), createLorry);
router.put('/:id', checkRole(['ADMIN']), updateLorry);
router.patch('/:id/service-done', checkRole(['ADMIN']), markServiceDone);
router.delete('/:id', checkRole(['ADMIN']), deleteLorry);

module.exports = router;