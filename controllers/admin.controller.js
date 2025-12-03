const adminService = require('../services/admin.service');
const { ADMIN_ROLES } = require('../models/admin.model');

/**
 * Admin Controller
 * Handles HTTP requests and responses for admin endpoints
 */

/**
 * POST /admin/login
 * Authenticate admin and return token
 */
const login = async (req, res) => {
  console.log('-> triggered endpoint POST /admin/login');
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('-> finished endpoint execution POST /admin/login');
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
    console.log('-> finished endpoint execution POST /admin/login');
  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid email or password' || error.message === 'Email is required' || error.message === 'Password is required') {
      console.log('-> finished endpoint execution POST /admin/login');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message,
      });
    }

    // Generic error response
    console.log('-> finished endpoint execution POST /admin/login');
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message || 'An error occurred during login',
    });
  }
};

/**
 * POST /admin/signup
 * Create a new admin/faculty account
 */
const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, first_name, last_name, role } = req.body || {};

    const resolvedFirstName = (firstName || first_name || '').trim();
    const resolvedLastName = (lastName || last_name || '').trim();

    if (!email || !password || !resolvedFirstName || !resolvedLastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName, and lastName are required',
      });
    }

    const result = await adminService.createAdminAccount({
      email,
      password,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      role,
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: result,
    });
  } catch (error) {
    if (error.message === 'Admin already exists') {
      return res.status(409).json({
        success: false,
        message: 'Admin already exists',
        error: error.message,
      });
    }

    if (error.message === 'Invalid role' || error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    console.error('Admin signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account',
      error: error.message || 'An error occurred during admin signup',
    });
  }
};

/**
 * GET /admin/profile
 * Get admin profile (requires authentication)
 */
const getProfile = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/profile');
  try {
    const adminId = req.admin?.id || req.admin?.adminId;

    if (!adminId) {
      console.log('-> finished endpoint execution GET /admin/profile');
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
    console.log('-> finished endpoint execution GET /admin/profile');
  } catch (error) {
    if (error.message === 'Admin not found') {
      console.log('-> finished endpoint execution GET /admin/profile');
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /admin/profile');
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
  console.log('-> triggered endpoint GET /admin/students');
  try {
    const students = await adminService.getAllStudents();

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: students,
      count: students.length,
    });
    console.log('-> finished endpoint execution GET /admin/students');
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/students');
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
  console.log('-> triggered endpoint GET /admin/alumni');
  try {
    const alumni = await adminService.getAllAlumni();

    res.status(200).json({
      success: true,
      message: 'Alumni retrieved successfully',
      data: alumni,
      count: alumni.length,
    });
    console.log('-> finished endpoint execution GET /admin/alumni');
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/alumni');
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
  console.log('-> triggered endpoint GET /admin/events');
  try {
    const events = await adminService.getAllEvents();

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      count: events.length,
    });
    console.log('-> finished endpoint execution GET /admin/events');
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/events');
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
  console.log(`-> triggered endpoint PUT /admin/events/:id/status`);
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      console.log('-> finished endpoint execution PUT /admin/events/:id/status');
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
    console.log('-> finished endpoint execution PUT /admin/events/:id/status');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution PUT /admin/events/:id/status');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    if (error.message.includes('Event ID is required') || error.message.includes('Status is required')) {
      console.log('-> finished endpoint execution PUT /admin/events/:id/status');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution PUT /admin/events/:id/status');
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status',
      error: error.message || 'An error occurred while updating event status',
    });
  }
};

/**
 * PUT /admin/:id/role
 * Update an admin's role (admin -> faculty, etc.)
 */
const updateRole = async (req, res) => {
  try {
    if (req.admin?.role !== ADMIN_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can modify roles',
      });
    }

    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid admin ID is required',
      });
    }

    const { role } = req.body;
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    if (!Object.values(ADMIN_ROLES).includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
        error: `Role must be one of: ${Object.values(ADMIN_ROLES).join(', ')}`,
      });
    }

    const updatedAdmin = await adminService.updateAdminRole(targetId, normalizedRole);

    res.status(200).json({
      success: true,
      message: 'Admin role updated successfully',
      data: updatedAdmin,
    });
  } catch (error) {
    if (error.message === 'Admin not found') {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: error.message,
      });
    }

    console.error('Update admin role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin role',
      error: error.message || 'An error occurred while updating admin role',
    });
  }
};

module.exports = {
  login,
  signup,
  getProfile,
  getStudents,
  getAlumni,
  getEvents,
  updateEventStatus,
  updateRole,
};

