const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const batchMatchingController = require('../controllers/batchMatching.controller');

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

// GET /api/matching/mentor/:mentorId/similar-students
// Get similar students for a specific mentor, ordered by similarity score (descending)
router.get('/mentor/:mentorId/similar-students', matchingController.getSimilarStudentsForMentor);

// GET /api/matching/student/:studentId/similar-mentors
// Get similar mentors for a specific student, ordered by similarity score (descending)
router.get('/student/:studentId/similar-mentors', matchingController.getSimilarMentorsForStudent);

// ============================================
// Batch Processing Routes (for N8N)
// ============================================

// GET /api/matching/check-changes
// Check if there are profile changes in the last 24 hours
router.get('/check-changes', batchMatchingController.checkChanges);

// POST /api/matching/run-batch
// Run batch matching process (called by N8N)
router.post('/run-batch', batchMatchingController.runBatch);

// POST /api/matching/clear-log
// Clear all profile change logs (called by N8N after batch processing)
router.post('/clear-log', batchMatchingController.clearLog);

// ============================================
// Frontend Integration Routes
// ============================================

// GET /api/matching/recommendations/:studentId
// Get recommendations for a student (assigned mentor + similarity scores)
router.get('/recommendations/:studentId', batchMatchingController.getRecommendations);

// GET /api/matching/assigned/:studentId
// Get assignment details for a student
router.get('/assigned/:studentId', batchMatchingController.getAssigned);

module.exports = router;

