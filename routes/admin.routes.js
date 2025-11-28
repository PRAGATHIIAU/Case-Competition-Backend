const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin } = require('../middleware/adminAuth');

/**
 * Admin Routes
 * POST /admin/login - Admin login
 * GET /admin/profile - Get admin profile (requires authentication)
 * GET /admin/students - Get all students (requires authentication)
 * GET /admin/alumni - Get all alumni (requires authentication)
 * GET /admin/events - Get all events (requires authentication)
 * PUT /admin/events/:id/status - Update event status (requires authentication)
 */

// POST /admin/login (no authentication required)
router.post('/login', adminController.login);

// All other routes require admin authentication
router.get('/profile', authenticateAdmin, adminController.getProfile);
router.get('/students', authenticateAdmin, adminController.getStudents);
router.get('/alumni', authenticateAdmin, adminController.getAlumni);
router.get('/events', authenticateAdmin, adminController.getEvents);
router.put('/events/:id/status', authenticateAdmin, adminController.updateEventStatus);

module.exports = router;

