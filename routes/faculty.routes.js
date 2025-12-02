const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const { authenticateAdmin, verifyFaculty } = require('../middleware/adminAuth');

// All faculty routes require authenticated faculty role
router.get(
  '/dashboard',
  authenticateAdmin,
  verifyFaculty,
  facultyController.getDashboard
);

router.get(
  '/reports',
  authenticateAdmin,
  verifyFaculty,
  facultyController.getExtendedReports
);

router.get(
  '/reviews/pending',
  authenticateAdmin,
  verifyFaculty,
  facultyController.getPendingReviewItems
);

module.exports = router;

