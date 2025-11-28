const express = require('express');
const multer = require('multer');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const upload = require('../middleware/upload');
const { authenticate, authorizeOwner } = require('../middleware/auth');

/**
 * Student Routes
 * POST /api/students/signup - Register a new student
 * POST /api/students/login - Login student
 * GET /api/students - Get all students
 * GET /api/students/:id - Get one student's basic info
 * PUT /api/students/:id - Update student information
 * DELETE /api/students/:id - Delete student account
 * POST /api/students/:id/profile - Save extended profile
 * GET /api/students/:id/profile - Get student with extended profile
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

// POST /api/students/signup
// Accepts form-data with optional resume file upload
router.post('/signup', upload.single('resume'), handleMulterError, studentController.signup);

// POST /api/students/login
// Accepts JSON with email and password
router.post('/login', studentController.login);

// GET /api/students
// Get all students (requires authentication)
router.get('/', authenticate, studentController.getAllStudents);

// GET /api/students/:id
// Get one student's basic info (requires authentication)
router.get('/:id', authenticate, studentController.getStudentById);

// PUT /api/students/:id
// Update student information (requires authentication and ownership)
// Accepts form-data with optional resume file upload
router.put('/:id', authenticate, authorizeOwner, upload.single('resume'), handleMulterError, studentController.updateStudent);

// DELETE /api/students/:id
// Delete student account (requires authentication and ownership)
router.delete('/:id', authenticate, authorizeOwner, studentController.deleteStudent);

// POST /api/students/:id/profile
// Save extended profile to DynamoDB (requires authentication and ownership)
// Accepts JSON or form-data with optional resume file upload
router.post('/:id/profile', authenticate, authorizeOwner, upload.single('resume'), handleMulterError, studentController.saveExtendedProfile);

// GET /api/students/:id/profile
// Get student with extended profile merged from RDS + DynamoDB (requires authentication)
router.get('/:id/profile', authenticate, studentController.getStudentWithProfile);

module.exports = router;

