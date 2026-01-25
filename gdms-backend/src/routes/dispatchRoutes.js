const express = require('express');
const { createDispatch, updateDispatchProgress } = require('../controllers/dispatchController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticateToken);

router.post('/', checkRole('ADMIN'), createDispatch);
router.put('/progress', updateDispatchProgress);

module.exports = router;
