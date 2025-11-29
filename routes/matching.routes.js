const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');

/**
 * Matching Routes
 * These endpoints provide mentor-mentee matching functionality
 * Note: These endpoints do not require authentication for flexibility
 * but you may want to add authentication based on your security requirements
 */

// GET /api/matching/mentors
// Get all mentors (alumni willing to be mentors)
router.get('/mentors', matchingController.getAllMentors);

// GET /api/matching/mentees
// Get all mentees (students)
router.get('/mentees', matchingController.getAllMentees);

// POST /api/matching/match
// Perform mentor-mentee matching based on similarity scores
router.post('/match', matchingController.performMatching);

module.exports = router;

