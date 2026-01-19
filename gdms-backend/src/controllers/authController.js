// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Login
const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const pool = await getConnection();

    // Find user
    const [users] = await pool.execute(
      'SELECT user_id, username, password_hash, email, phone_number, role, status FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    const user = users[0];

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, 'Account is inactive or suspended');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    // Generate token
    const token = generateToken(user);

    // Remove password hash from response
    delete user.password_hash;

    return successResponse(res, 200, 'Login successful', {
      user,
      token
    });

  } catch (error) {
    next(error);
  }
};

// Register new supervisor
const register = async (req, res, next) => {
  const { username, password, email, phone_number } = req.body;

  try {
    const pool = await getConnection();

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return errorResponse(res, 409, 'Username already exists');
    }

    // Hash password
    const password_hash = await hashPassword(password);
    const user_id = generateId('USR');

    // Create user
    await pool.execute(
      `INSERT INTO users (user_id, username, password_hash, email, phone_number, role, status)
       VALUES (?, ?, ?, ?, ?, 'SUPERVISOR', 'ACTIVE')`,
      [user_id, username, password_hash, email, phone_number]
    );

    // Create supervisor record
    await pool.execute(
      `INSERT INTO supervisors (supervisor_id, status)
       VALUES (?, 'AVAILABLE')`,
      [user_id]
    );

    // Generate token
    const token = generateToken({
      user_id,
      username,
      role: 'SUPERVISOR',
      email
    });

    return successResponse(res, 201, 'Registration successful', {
      user: {
        user_id,
        username,
        email,
        role: 'SUPERVISOR'
      },
      token
    });

  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const pool = await getConnection();
    const userId = req.user.userId;

    const [users] = await pool.execute(
      'SELECT user_id, username, email, phone_number, role, status, created_date, last_login FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'Profile retrieved successfully', users[0]);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getProfile
};