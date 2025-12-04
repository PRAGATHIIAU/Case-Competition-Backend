const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const eventRepository = require('../repositories/event.repository');
const { ADMIN_ROLES } = require('../models/admin.model');

// Try to import student, alumni, and industry user repositories
// These should exist if CRUD is already implemented
let studentRepository;
let alumniRepository;
let industryUserRepository;

try {
  studentRepository = require('../repositories/student.repository');
} catch (error) {
  console.warn('student.repository.js not found. getAllStudents() will not work until repository is created.');
}

try {
  alumniRepository = require('../repositories/alumni.repository');
} catch (error) {
  console.warn('alumni.repository.js not found. getAllAlumni() will not work until repository is created.');
}

try {
  industryUserRepository = require('../repositories/industryUser.repository');
} catch (error) {
  console.warn('industryUser.repository.js not found.');
}

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Admin Service
 * Handles business logic for admin operations
 * Reuses existing repositories for students, alumni, events, etc.
 */

/**
 * Login admin
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} Admin object and token
 */
const login = async (email, password) => {
  try {
    // Validate input
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!password) {
      throw new Error('Password is required');
    }

    // Get admin by email
    const admin = await adminRepository.getAdminByEmail(email.trim());
    if (!admin) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete admin.password_hash;

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new admin/faculty account
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {string} payload.firstName
 * @param {string} payload.lastName
 * @param {'admin'|'faculty'} [payload.role='admin']
 * @returns {Promise<Object>} Admin object and token
 */
const createAdminAccount = async ({ email, password, firstName, lastName, role = ADMIN_ROLES.ADMIN }) => {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const trimmedFirstName = (firstName || '').trim();
    const trimmedLastName = (lastName || '').trim();

    if (!trimmedFirstName) {
      throw new Error('First name is required');
    }

    if (!trimmedLastName) {
      throw new Error('Last name is required');
    }

    const normalizedRole = Object.values(ADMIN_ROLES).includes((role || '').toLowerCase())
      ? (role || '').toLowerCase()
      : ADMIN_ROLES.ADMIN;

    const existing = await adminRepository.getAdminByEmail(normalizedEmail);
    if (existing) {
      throw new Error('Admin already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await adminRepository.createAdmin({
      email: normalizedEmail,
      passwordHash,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      role: normalizedRole,
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get admin profile
 * @param {number} adminId - Admin ID
 * @returns {Promise<Object>} Admin profile object
 */
const getProfile = async (adminId) => {
  try {
    const admin = await adminRepository.getAdminById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }
    return admin;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all students
 * Reuses existing studentRepository
 * @returns {Promise<Array>} Array of student objects
 */
const getAllStudents = async () => {
  try {
    if (!studentRepository) {
      throw new Error('Student repository not found. Please create repositories/student.repository.js');
    }

    // Assume the repository has a getAllStudents method
    if (typeof studentRepository.getAllStudents === 'function') {
      return await studentRepository.getAllStudents();
    } else if (typeof studentRepository.getAll === 'function') {
      return await studentRepository.getAll();
    } else {
      throw new Error('Student repository does not have getAllStudents() or getAll() method');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get all alumni
 * Reuses existing alumniRepository
 * @returns {Promise<Array>} Array of alumni objects
 */
const getAllAlumni = async () => {
  try {
    if (!alumniRepository) {
      throw new Error('Alumni repository not found. Please create repositories/alumni.repository.js');
    }

    // Assume the repository has a getAllAlumni method
    if (typeof alumniRepository.getAllAlumni === 'function') {
      return await alumniRepository.getAllAlumni();
    } else if (typeof alumniRepository.getAll === 'function') {
      return await alumniRepository.getAll();
    } else {
      throw new Error('Alumni repository does not have getAllAlumni() or getAll() method');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get all events
 * Reuses existing eventRepository
 * @returns {Promise<Array>} Array of event objects
 */
const getAllEvents = async () => {
  try {
    return await eventRepository.getAllEvents();
  } catch (error) {
    throw error;
  }
};

/**
 * Update event status
 * Reuses existing eventRepository.updateEvent()
 * @param {string} eventId - Event ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated event object
 */
const updateEventStatus = async (eventId, status) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    if (!status || typeof status !== 'string' || !status.trim()) {
      throw new Error('Status is required and must be a valid string');
    }

    // Reuse existing updateEvent method
    const updateData = { status: status.trim() };
    const updatedEvent = await eventRepository.updateEvent(eventId, updateData);

    if (!updatedEvent) {
      throw new Error('Event not found');
    }

    return updatedEvent;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  login,
  createAdminAccount,
  getProfile,
  getAllStudents,
  getAllAlumni,
  getAllEvents,
  updateEventStatus,
  ADMIN_ROLES,
  /**
   * Update role for an admin account
   * @param {number} adminId
   * @param {'admin'|'faculty'} role
   * @returns {Promise<Object>}
   */
  updateAdminRole: async (adminId, role) => {
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    if (!Object.values(ADMIN_ROLES).includes(normalizedRole)) {
      throw new Error('Invalid role');
    }

    const updatedAdmin = await adminRepository.updateAdminRole(adminId, normalizedRole);
    if (!updatedAdmin) {
      throw new Error('Admin not found');
    }

    return updatedAdmin;
  },
};

