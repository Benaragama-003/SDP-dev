// src/middleware/validator.js
const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHelper');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return errorResponse(res, 400, 'Validation failed', formattedErrors);
  }
  
  next();
};

module.exports = { validate };