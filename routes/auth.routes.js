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

// PUT /api/auth/user/:id
// Update user information (requires authentication)
// Accepts form-data with optional resume file upload
router.put('/user/:id', authenticate, authorizeOwner, upload.single('resume'), handleMulterError, authController.updateUser);

// DELETE /api/auth/user/:id
// Delete user account (requires authentication)
router.delete('/user/:id', authenticate, authorizeOwner, authController.deleteUser);

module.exports = router;

