const express = require('express');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');
const { authenticate, authorizeOwner } = require('../middleware/auth');

/**
 * Auth Routes
 * POST /api/auth/signup - Register a new user
 * POST /api/auth/login - Login user
 */

/**
 * Error handler for multer file upload errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        error: 'File size must be less than 5MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }
  next();
};

// POST /api/auth/signup
// Accepts form-data with optional resume file upload
router.post('/signup', upload.single('resume'), handleMulterError, authController.signup);

// POST /api/auth/login
// Accepts JSON with email and password
router.post('/login', authController.login);

// GET /api/auth/users
// Get all users with merged profiles (requires authentication)
router.get('/users', authenticate, authController.getAllUsers);

// GET /api/auth/user/:id
// Get one user's complete info (RDS + DynamoDB merged) (requires authentication)
router.get('/user/:id', authenticate, authController.getUserById);

// PUT /api/auth/user/:id
// Update user information (requires authentication)
// Accepts form-data with optional resume file upload
router.put('/user/:id', authenticate, authorizeOwner, upload.single('resume'), handleMulterError, authController.updateUser);

// DELETE /api/auth/user/:id
// Delete user account (requires authentication)
router.delete('/user/:id', authenticate, authorizeOwner, authController.deleteUser);

// POST /api/auth/user/:id/profile
// Save extended profile to DynamoDB (requires authentication and ownership)
// Accepts JSON or form-data with optional resume file upload
router.post('/user/:id/profile', authenticate, authorizeOwner, upload.single('resume'), handleMulterError, authController.saveExtendedProfile);

// GET /api/auth/user/:id/profile
// Get user with extended profile merged from RDS + DynamoDB (requires authentication)
router.get('/user/:id/profile', authenticate, authController.getUserWithProfile);

module.exports = router;

