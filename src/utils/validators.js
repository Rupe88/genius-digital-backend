import { body, query, param, validationResult } from 'express-validator';

// Re-export express-validator functions for convenience
export { body, query, param };

export const validate = (reqOrValidations, res, next) => {
  // If it's an array, it's being used as validate([rules])
  if (Array.isArray(reqOrValidations)) {
    const validations = reqOrValidations;
    return async (req, res, next) => {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Validation failed',
        errors: errors.array(),
      });
    };
  }

  // Otherwise, it's being used as a direct middleware: router.post('/', [rules], validate, handler)
  // In this case, reqOrValidations is the request object
  const req = reqOrValidations;
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: errors.array()[0]?.msg || 'Validation failed',
    errors: errors.array(),
  });
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const verifyOtpValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

export const resendOtpValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

export const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

export const resetPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

export const userIdValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),
];

export const userIdParamValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must be less than 255 characters'),
];

export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

// Course validations
export const courseValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Slug must be between 1 and 255 characters')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be URL-friendly (lowercase letters, numbers, and hyphens only)'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('shortDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Short description must be less than 500 characters'),
  body('thumbnail').optional().isString().isURL().withMessage('Thumbnail must be a valid URL'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('learningOutcomes')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return true; // Allow string as well
        }
      }
      return Array.isArray(value) || value === null || value === undefined;
    })
    .withMessage('Learning outcomes must be an array or JSON string'),
  body('skills')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return true; // Allow string as well
        }
      }
      return Array.isArray(value) || value === null || value === undefined;
    })
    .withMessage('Skills must be an array or JSON string'),
  body('isFree').optional().isBoolean().withMessage('isFree must be a boolean'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ONGOING'])
    .withMessage('Status must be one of: DRAFT, PUBLISHED, ARCHIVED, ONGOING'),
  body('level')
    .optional()
    .isIn(['Beginner', 'Intermediate', 'Advanced'])
    .withMessage('Level must be one of: Beginner, Intermediate, Advanced'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer (minutes)'),
  body('language')
    .optional()
    .isString()
    .isLength({ max: 10 })
    .withMessage('Language must be a string (max 10 characters)'),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('isOngoing').optional().isBoolean().withMessage('isOngoing must be a boolean'),
  body('startDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Tags must be a string (max 500 characters)'),
  body('instructorId')
    .notEmpty()
    .withMessage('Instructor ID is required')
    .isUUID()
    .withMessage('Instructor ID must be a valid UUID'),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
];

export const courseFilterValidation = [
  query('category').optional().isString(),
  query('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('minRating').optional().isFloat({ min: 0, max: 5 }),
  query('tags').optional().isString(),
  query('isOngoing').optional().isBoolean(),
  query('featured').optional().isBoolean(),
  query('instructor').optional().isUUID(),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['newest', 'oldest', 'price', 'rating', 'popularity', 'enrollments']),
  query('order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

// Instructor validations
export const instructorValidation = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('slug').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('image').optional().isString().isURL(),
  body('bio').optional().isString(),
  body('designation').optional().trim().isLength({ max: 255 }),
  body('specialization').optional().trim().isLength({ max: 500 }),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('socialLinks').optional().isJSON(),
  body('featured').optional().isBoolean(),
  body('order').optional().isInt(),
];

// Consultation validations
export const consultationValidation = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().isString().withMessage('Phone number is required'),
  body('categoryId').optional({ checkFalsy: true }).isUUID().withMessage('Invalid category ID'),
  body('eventId').optional().isUUID().withMessage('Invalid event ID'),
  body('consultationType').isIn(['ONLINE', 'OFFLINE']).withMessage('Consultation type must be ONLINE or OFFLINE'),
  body('referralSource').optional().isIn(['GOOGLE_SEARCH', 'FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'FRIEND_REFERRAL', 'EVENT', 'OTHER']).withMessage('Invalid referral source'),
  body('referralSourceOther').optional().trim().isLength({ max: 255 }).withMessage('Referral source other must be less than 255 characters')
    .custom((value, { req }) => {
      if (req.body.referralSource === 'OTHER' && !value) {
        throw new Error('Referral source other is required when referral source is OTHER');
      }
      return true;
    }),
  body('source').optional().trim().isLength({ max: 100 }).withMessage('Source must be less than 100 characters'),
  body('message').optional().isString().withMessage('Message must be a string'),
];

