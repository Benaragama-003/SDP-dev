// src/middleware/roleCheck.js
const { errorResponse } = require('../utils/responseHelper');

const checkRole = (allowedRoles, minAccessLevel = null) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized - No user information');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 403, `Access denied - ${allowedRoles.join(' or ')} role required`);
    }

    // If role is ADMIN and a minAccessLevel is required (e.g., Level 1 only)
    if (req.user.role === 'ADMIN' && minAccessLevel !== null) {
      if (req.user.accessLevel > minAccessLevel) {
        return errorResponse(res, 403, 'Access denied - Higher admin privilege required');
      }
    }

    next();
  };
};

module.exports = { checkRole };