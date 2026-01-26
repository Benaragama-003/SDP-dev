// src/routes/authRoutes.js

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
  register,
  login,
  getProfile,
  updatePassword,
  logout,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  getAllSupervisors,
  updateSupervisorStatus,
  promoteToAdmin
} = require('../controllers/authController');

const router = express.Router();


// Register validation
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone_number')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits')
];

// Login validation
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Update password validation
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

//Register new supervisor account
router.post('/register', registerValidation, validate, register);

// POST /api/v1/auth/login
// Purpose: Login and get JWT token
router.post('/login', loginValidation, validate, login);

// Get current user's profile
router.get('/profile', authenticateToken, getProfile);

// Change password
router.put('/password', authenticateToken, updatePasswordValidation, validate, updatePassword);

//Logout (invalidate token)
router.post('/logout', authenticateToken, logout);

// Forgot Password (Public)
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail()
], validate, requestPasswordReset);

// Reset Password (Public)
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], validate, resetPassword);

// Update Profile (Protected)
router.put('/profile', authenticateToken, [
  body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
], validate, updateProfile);

// Admin only: Get all supervisors
router.get('/supervisors', authenticateToken, checkRole(['ADMIN']), getAllSupervisors);

// Super Admin (Level 1) only: Update supervisor status (activation)
router.patch('/supervisors/:id/status', authenticateToken, checkRole(['ADMIN'], 1), updateSupervisorStatus);

// Super Admin (Level 1) only: Promote to Admin
router.post('/supervisors/:id/promote', authenticateToken, checkRole(['ADMIN'], 1), promoteToAdmin);

module.exports = router;