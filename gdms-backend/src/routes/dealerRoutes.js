const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  getDealerStats
} = require('../controllers/dealerController');

const router = express.Router();



// Validation for creating dealer
const createDealerValidation = [
  body('dealer_name')
    .trim()
    .notEmpty()
    .withMessage('Dealer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Dealer name must be between 2 and 100 characters'),

  body('contact_number')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .matches(/^0[0-9]{9}$/)
    .withMessage('Contact number must be 10 digits starting with 0'),

  body('alternative_contact')
    .optional()
    .matches(/^0[0-9]{9}$/)
    .withMessage('Alternative contact must be 10 digits starting with 0'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('credit_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('route')
    .trim()
    .notEmpty()
    .withMessage('Route is required'),

  body('payment_terms_days')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Payment terms must be between 0 and 365 days')
];

// Validation for updating dealer
const updateDealerValidation = [
  body('dealer_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Dealer name must be between 2 and 100 characters'),

  body('contact_number')
    .optional()
    .matches(/^0[0-9]{9}$/)
    .withMessage('Contact number must be 10 digits starting with 0'),

  body('alternative_contact')
    .optional()
    .matches(/^0[0-9]{9}$/)
    .withMessage('Alternative contact must be 10 digits starting with 0'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('credit_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'BLACKLISTED'])
    .withMessage('Status must be ACTIVE, INACTIVE, or BLACKLISTED')
];


// All routes require authentication
router.use(authenticateToken);

//get dealer stats
router.get('/stats', getDealerStats);

// fetch all dealers with optional search
router.get('/', getAllDealers);

//fetch dealer by ID
router.get('/:id', getDealerById);

// create a new dealer route
router.post('/', createDealerValidation, validate, createDealer);

//update an exisiting dealer route
router.put('/:id', updateDealerValidation, validate, updateDealer);

// delete dealer route
router.delete('/:id', checkRole('ADMIN'), deleteDealer);

module.exports = router;