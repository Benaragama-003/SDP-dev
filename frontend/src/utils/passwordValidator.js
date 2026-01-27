/**
 * Password Validation Utility
 * Validates password strength based on requirements
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/
};

/**
 * Validates password against all requirements
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with status and details
 */
export const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: PASSWORD_REQUIREMENTS.hasUppercase.test(password),
    hasLowercase: PASSWORD_REQUIREMENTS.hasLowercase.test(password),
    hasNumber: PASSWORD_REQUIREMENTS.hasNumber.test(password),
    hasSpecialChar: PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)
  };

  const isValid = Object.values(requirements).every(req => req === true);

  return {
    isValid,
    requirements,
    strength: calculatePasswordStrength(password, requirements)
  };
};

/**
 * Calculates password strength level
 * @param {string} password - Password to check
 * @param {object} requirements - Requirements object from validatePassword
 * @returns {string} - Strength level: 'weak', 'fair', 'good', 'strong'
 */
export const calculatePasswordStrength = (password, requirements) => {
  let strengthScore = 0;

  // Check each requirement
  if (requirements.minLength) strengthScore += 1;
  if (requirements.hasUppercase) strengthScore += 1;
  if (requirements.hasLowercase) strengthScore += 1;
  if (requirements.hasNumber) strengthScore += 1;
  if (requirements.hasSpecialChar) strengthScore += 1;

  // Bonus points for extra length
  if (password.length >= 12) strengthScore += 0.5;
  if (password.length >= 16) strengthScore += 0.5;

  if (strengthScore <= 2) return 'weak';
  if (strengthScore <= 3) return 'fair';
  if (strengthScore <= 4) return 'good';
  return 'strong';
};

/**
 * Gets user-friendly error messages
 * @param {object} requirements - Requirements object from validatePassword
 * @returns {array} - Array of missing requirement messages
 */
export const getPasswordErrors = (requirements) => {
  const errors = [];

  if (!requirements.minLength) {
    errors.push('At least 8 characters');
  }
  if (!requirements.hasUppercase) {
    errors.push('One uppercase letter (A-Z)');
  }
  if (!requirements.hasLowercase) {
    errors.push('One lowercase letter (a-z)');
  }
  if (!requirements.hasNumber) {
    errors.push('One number (0-9)');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('One special character (!@#$%^&*...)');
  }

  return errors;
};
