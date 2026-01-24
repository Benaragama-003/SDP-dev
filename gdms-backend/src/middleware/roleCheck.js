// src/middleware/roleCheck.js
const { errorResponse } = require('../utils/responseHelper');

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized - No user information');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 403, `Access denied - ${allowedRoles.join(' or ')} role required`);
    }

    next();
  };
};

module.exports = { checkRole };