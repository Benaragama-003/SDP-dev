// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHelper');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return errorResponse(res, 401, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expired');
    }
    return errorResponse(res, 403, 'Invalid token');
  }
};

module.exports = { authenticateToken };
