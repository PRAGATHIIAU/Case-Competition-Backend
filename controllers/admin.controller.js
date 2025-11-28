const adminService = require('../services/admin.service');

/**
 * Admin Controller
 * Handles HTTP requests and responses for admin endpoints
 */

/**
 * POST /admin/login
 * Authenticate admin and return token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Call service to login admin
    const result = await adminService.login(email.trim(), password);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid email or password' || error.message === 'Email is required' || error.message === 'Password is required') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message || 'An error occurred during login',
    });
  }
};

/**
 * GET /admin/profile
 * Get admin profile (requires authentication)
 */
const getProfile = async (req, res) => {
  try {
    const adminId = req.admin?.adminId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const admin = await adminService.getProfile(adminId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: admin,
    });
  } catch (error) {
    if (error.message === 'Admin not found') {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: error.message,
      });
    }

    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message || 'An error occurred while retrieving profile',
    });
  }
};

/**
 * GET /admin/students
 * Get all students (requires authentication)
 */
const getStudents = async (req, res) => {
  try {
    const students = await adminService.getAllStudents();

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: students,
      count: students.length,
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
      error: error.message || 'An error occurred while retrieving students',
    });
  }
};

/**
 * GET /admin/alumni
 * Get all alumni (requires authentication)
 */
const getAlumni = async (req, res) => {
  try {
    const alumni = await adminService.getAllAlumni();

    res.status(200).json({
      success: true,
      message: 'Alumni retrieved successfully',
      data: alumni,
      count: alumni.length,
    });
  } catch (error) {
    console.error('Get alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alumni',
      error: error.message || 'An error occurred while retrieving alumni',
    });
  }
};

/**
 * GET /admin/events
 * Get all events (requires authentication)
 */
const getEvents = async (req, res) => {
  try {
    const events = await adminService.getAllEvents();

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

/**
 * PUT /admin/events/:id/status
 * Update event status (requires authentication)
 */
const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const updatedEvent = await adminService.updateEventStatus(id, status);

    res.status(200).json({
      success: true,
      message: 'Event status updated successfully',
      data: updatedEvent,
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    if (error.message.includes('Event ID is required') || error.message.includes('Status is required')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status',
      error: error.message || 'An error occurred while updating event status',
    });
  }
};

module.exports = {
  login,
  getProfile,
  getStudents,
  getAlumni,
  getEvents,
  updateEventStatus,
};

