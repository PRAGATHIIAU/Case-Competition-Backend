const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const analyticsController = require('../controllers/analytics.controller');
const { authenticateAdmin } = require('../middleware/adminAuth');

/**
 * Admin Routes
 * POST /admin/login - Admin login
 * GET /admin/profile - Get admin profile (requires authentication)
 * GET /admin/students - Get all students (requires authentication)
 * GET /admin/alumni - Get all alumni (requires authentication)
 * GET /admin/events - Get all events (requires authentication)
 * PUT /admin/events/:id/status - Update event status (requires authentication)
 * GET /admin/analytics/basic-stats - Get basic platform statistics (requires authentication)
 * GET /admin/analytics/student-engagement - Get student engagement statistics (requires authentication)
 * GET /admin/analytics/alumni-engagement - Get alumni engagement statistics (requires authentication)
 * GET /admin/analytics/inactive-alumni - Get list of inactive alumni (requires authentication)
 * GET /admin/analytics/feedback-summary - Get feedback summary for students & employers (requires authentication)
 * GET /admin/analytics/events/summary - Get event-level summary statistics (requires authentication)
 * GET /admin/analytics/student-event-trends - Get student-event trend statistics (requires authentication)
 * GET /admin/analytics/alumni-roles - Get alumni role statistics (requires authentication)
 * GET /admin/analytics/admin-activity - Get recent admin activity (placeholder, requires authentication)
 * GET /admin/analytics/system-health - Get system health status (requires authentication)
 */

// POST /admin/login (no authentication required)
router.post('/login', adminController.login);

// All other routes require admin authentication
router.get('/profile', authenticateAdmin, adminController.getProfile);
router.get('/students', authenticateAdmin, adminController.getStudents);
router.get('/alumni', authenticateAdmin, adminController.getAlumni);
router.get('/events', authenticateAdmin, adminController.getEvents);
router.put('/events/:id/status', authenticateAdmin, adminController.updateEventStatus);

// Admin analytics routes
router.get('/analytics/basic-stats', authenticateAdmin, analyticsController.getBasicStats);
router.get('/analytics/student-engagement', authenticateAdmin, analyticsController.getStudentEngagement);
router.get('/analytics/alumni-engagement', authenticateAdmin, analyticsController.getAlumniEngagement);
router.get('/analytics/inactive-alumni', authenticateAdmin, analyticsController.getInactiveAlumni);
router.get('/analytics/feedback-summary', authenticateAdmin, analyticsController.getFeedbackSummary);
router.get('/analytics/events/summary', authenticateAdmin, analyticsController.getEventSummaries);
router.get('/analytics/student-event-trends', authenticateAdmin, analyticsController.getStudentEventTrends);
router.get('/analytics/alumni-roles', authenticateAdmin, analyticsController.getAlumniRoles);
router.get('/analytics/admin-activity', authenticateAdmin, analyticsController.getAdminActivity);
router.get('/analytics/system-health', authenticateAdmin, analyticsController.getSystemHealth);

module.exports = router;

