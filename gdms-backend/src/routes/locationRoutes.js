const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { updateLocation, getSupervisorLocations } = require('../controllers/locationController');

router.use(authenticateToken);

// Supervisor sends their GPS
router.put('/update', checkRole(['SUPERVISOR']), updateLocation);

// Admin views all supervisor locations
router.get('/supervisors', checkRole(['ADMIN']), getSupervisorLocations);

module.exports = router;
