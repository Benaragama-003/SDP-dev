// src/controllers/authController.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getConnection } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateId } = require('../utils/generateId');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendResetEmail } = require('../utils/emailService');

// Create a JWT token containing user information
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,      // User's unique ID
      username: user.username,   // Username
      role: user.role,           // ADMIN or SUPERVISOR
      email: user.email,         // Email address
      accessLevel: user.access_level || null // Level 1 (Full) or Level 2 (Restricted)
    },
    process.env.JWT_SECRET,      // Secret key to sign token
    { expiresIn: process.env.JWT_EXPIRE || '7d' }  // Token expires in 7 days
  );
};

//  Create a new supervisor account

const register = async (req, res, next) => {
  const { username, password, email, phone_number, name } = req.body; // 'name' comes from frontend

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

    // Check if email already exists (if provided)
    if (email) {
      const [existingEmails] = await pool.execute(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );

      if (existingEmails.length > 0) {
        return errorResponse(res, 409, 'Email already exists');
      }
    }

    // Hash the password

    const password_hash = await hashPassword(password);

    const [lastUser] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id LIKE 'S%' ORDER BY user_id DESC LIMIT 1"
    );
    let user_id;
    if (lastUser.length > 0) {
      // 2. Extract the number (e.g., 'S005' -> 5) and increment it
      const lastNum = parseInt(lastUser[0].user_id.substring(1));
      const nextNum = lastNum + 1;
      // 3. Format back to S006 (padded with zeros)
      user_id = `S${nextNum.toString().padStart(3, '0')}`;
    } else {
      // Starting fresh if no S-prefixed IDs exist
      user_id = 'S001';
    }

    // Insert into users table
    await pool.execute(
      `INSERT INTO users (user_id, username, full_name, password_hash, email, phone_number, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'SUPERVISOR', 'INACTIVE')`,
      [user_id, username, name, password_hash, email, phone_number]
    );

    // Insert into supervisors table
    await pool.execute(
      `INSERT INTO supervisors (supervisor_id, status)
       VALUES (?, 'AVAILABLE')`,
      [user_id]
    );

    // Generate JWT token
    const token = generateToken({
      user_id,
      username,
      full_name: name,
      role: 'SUPERVISOR',
      email
    });

    // Return success with user info and token
    return successResponse(res, 201, 'Registration successful', {
      user: {
        user_id,
        username,
        full_name: name,
        email,
        phone_number,
        role: 'SUPERVISOR',
        status: 'ACTIVE'
      },
      token  // UI should store this token
    });

  } catch (error) {
    next(error);
  }
};

// LOGIN Authenticate user and return JWT token
const login = async (req, res, next) => {
  const { username, password } = req.body;
  console.log(`Login attempt for: "${username}" (len: ${username?.length}), password len: ${password?.length}`);

  try {
    const pool = await getConnection();

    // Find user by username or email
    const [users] = await pool.execute(
      `SELECT user_id, username, full_name, password_hash, email, phone_number, role, status 
       FROM users 
       WHERE username = ? OR email = ?`,
      [username, username]
    );

    // Check if user exists
    if (users.length === 0) {
      console.log(`Login failed: User not found for credential "${username}"`);
      return errorResponse(res, 401, 'Invalid credentials');
    }

    const user = users[0];
    console.log(`User found: ${user.username} (${user.role})`);

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      console.log(`Login failed: Account status is ${user.status}`);
      return errorResponse(res, 403, 'Account is inactive or suspended');
    }

    // Verify password
    // Compare plain password with hashed password from database
    const isPasswordValid = await comparePassword(password, user.password_hash);
    console.log(`Password comparison for ${user.username}: ${isPasswordValid ? 'MATCH' : 'FAIL'}`);

    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Update last login timestamp
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    // Get role-specific data
    let roleData = {};

    if (user.role === 'ADMIN') {
      // Get admin-specific data
      const [admins] = await pool.execute(
        'SELECT access_level FROM admins WHERE admin_id = ?',
        [user.user_id]
      );
      if (admins.length > 0) {
        roleData = admins[0];
      }
    } else if (user.role === 'SUPERVISOR') {
      // Get supervisor-specific data
      const [supervisors] = await pool.execute(
        'SELECT monthly_target, achieved_sales, status as supervisor_status FROM supervisors WHERE supervisor_id = ?',
        [user.user_id]
      );
      if (supervisors.length > 0) {
        roleData = supervisors[0];
      }
    }

    // Generate JWT token
    const token = generateToken({
      ...user,
      access_level: roleData.access_level
    });

    // Remove sensitive data
    delete user.password_hash;

    // Return success with complete user info
    return successResponse(res, 200, 'Login successful', {
      user: {
        ...user,        // All user fields
        ...roleData     // Role-specific fields
      },
      token  // JWT token for future requests
    });

  } catch (error) {
    next(error);
  }
};

// Get current logged-in user's information
const getProfile = async (req, res, next) => {
  try {
    const pool = await getConnection();

    // Get userId from JWT token (set by authenticateToken middleware)
    const userId = req.user.userId;

    // Get user data
    const [users] = await pool.execute(
      `SELECT user_id, username, full_name, email, phone_number, role, status, created_date, last_login 
       FROM users 
       WHERE user_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    const user = users[0];

    // Get role-specific data
    let roleData = {};

    if (user.role === 'ADMIN') {
      const [admins] = await pool.execute(
        'SELECT access_level FROM admins WHERE admin_id = ?',
        [userId]
      );
      if (admins.length > 0) {
        roleData = admins[0];
      }
    } else if (user.role === 'SUPERVISOR') {
      const [supervisors] = await pool.execute(
        'SELECT monthly_target, achieved_sales, status as supervisor_status FROM supervisors WHERE supervisor_id = ?',
        [userId]
      );
      if (supervisors.length > 0) {
        roleData = supervisors[0];
      }
    }

    return successResponse(res, 200, 'Profile retrieved successfully', {
      ...user,
      ...roleData
    });

  } catch (error) {
    next(error);
  }
};


// Allow user to change their password
const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const pool = await getConnection();

    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, users[0].password_hash);

    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [newPasswordHash, userId]
    );

    return successResponse(res, 200, 'Password updated successfully');

  } catch (error) {
    next(error);
  }
};

// Request Password Reset
const requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;

  try {
    const pool = await getConnection();

    // Check if user exists with this email
    const [users] = await pool.execute(
      'SELECT user_id, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // For security, don't reveal if user exists. Just return success.
      return successResponse(res, 200, 'If an account exists with this email, you will receive a reset link.');
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const expires = new Date(Date.now() + 3600000);

    // Save token to DB
    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?',
      [resetToken, expires, user.user_id]
    );

    // Send email
    await sendResetEmail(user.email, resetToken);

    return successResponse(res, 200, 'If an account exists with this email, you will receive a reset link.');

  } catch (error) {
    next(error);
  }
};

// Reset Password using token
const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    const pool = await getConnection();

    // Find user with valid token
    const [users] = await pool.execute(
      'SELECT user_id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return errorResponse(res, 400, 'Invalid or expired reset token');
    }

    const user = users[0];
    const password_hash = await hashPassword(newPassword);

    // Update password and clear token
    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?',
      [password_hash, user.user_id]
    );

    return successResponse(res, 200, 'Password has been reset successfully');

  } catch (error) {
    next(error);
  }
};

// Update user profile information
const updateProfile = async (req, res, next) => {
  const { full_name, email, phone_number, username } = req.body;
  const userId = req.user.userId;

  try {
    const pool = await getConnection();

    // Check if user exists
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    // Check if email is already taken by another user
    if (email) {
      const [emailCheck] = await pool.execute(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      if (emailCheck.length > 0) {
        return errorResponse(res, 409, 'Email is already in use by another account');
      }
    }

    // Check if username is already taken by another user
    if (username) {
      const [usernameCheck] = await pool.execute(
        'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
        [username, userId]
      );
      if (usernameCheck.length > 0) {
        return errorResponse(res, 409, 'Username is already in use by another account');
      }
    }

    // Update user record
    await pool.execute(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name), 
        email = COALESCE(?, email), 
        phone_number = COALESCE(?, phone_number),
        username = COALESCE(?, username),
        updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [full_name, email, phone_number, username, userId]
    );

    return successResponse(res, 200, 'Profile updated successfully');

  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'Logout successful');
  } catch (error) {
    next(error);
  }
};
// Get all supervisors (Admin only)
const getAllSupervisors = async (req, res, next) => {
  try {
    const pool = await getConnection();
    const [supervisors] = await pool.execute(`
  SELECT u.user_id, u.username, u.full_name, u.email, u.phone_number, u.role, u.status, 
         s.monthly_target, s.achieved_sales
  FROM users u
  LEFT JOIN supervisors s ON u.user_id = s.supervisor_id
  WHERE u.role = 'SUPERVISOR'
  ORDER BY u.created_date DESC
`);
    return successResponse(res, 200, 'Supervisors retrieved successfully', supervisors);
  } catch (error) {
    next(error);
  }
};

// Update supervisor status/activation (Admin only)
const updateSupervisorStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const pool = await getConnection();

    // Update the status in the users table
    const [result] = await pool.execute(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND role = "SUPERVISOR"',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, 404, 'Supervisor not found');
    }

    return successResponse(res, 200, `Supervisor status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

// Promote a supervisor to Admin Level 2 (Restricted)
const promoteToAdmin = async (req, res, next) => {
  const { id } = req.params; // Supervisor's ID

  try {
    const pool = await getConnection();
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Check if user is currently a supervisor
      const [user] = await connection.execute(
        'SELECT user_id, role FROM users WHERE user_id = ? AND role = "SUPERVISOR"',
        [id]
      );

      if (user.length === 0) {
        throw new Error('User not found or is already an admin');
      }

      // 2. Update Role to ADMIN in users table
      await connection.execute(
        'UPDATE users SET role = "ADMIN", updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [id]
      );

      // 3. Insert into admins table with Level 2 (Restricted)
      await connection.execute(
        'INSERT INTO admins (admin_id, access_level) VALUES (?, 2) ON DUPLICATE KEY UPDATE access_level = 2',
        [id]
      );

      // 4. (Optional) We keep the supervisor record for history or remove it?
      // For now, let's keep it but mark them as an Admin in the main table.

      await connection.commit();
      return successResponse(res, 200, 'Supervisor promoted to Restricted Admin (Level 2) successfully');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

// Export all functions
module.exports = {
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
};