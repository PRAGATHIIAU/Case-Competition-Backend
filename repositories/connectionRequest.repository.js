const pool = require('../config/db');
const { ConnectionRequestModel } = require('../models/connectionRequest.model');

/**
 * Connection Request Repository
 * Handles all database operations for connection requests (RDS PostgreSQL)
 */

/**
 * Create a new connection request
 * @param {Object} requestData - Connection request data
 * @param {string} requestData.student_id - Student ID
 * @param {number} requestData.mentor_id - Mentor ID
 * @param {string} requestData.message - Optional message
 * @returns {Promise<Object>} Created connection request object
 */
const createConnectionRequest = async (requestData) => {
  const { student_id, mentor_id, message } = requestData;

  const query = `
    INSERT INTO ${ConnectionRequestModel.TABLE_NAME} (
      student_id, mentor_id, message, status
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, student_id, mentor_id, message, status, created_at, updated_at
  `;

  const values = [
    student_id?.trim(),
    mentor_id,
    message?.trim() || null,
    ConnectionRequestModel.STATUS.PENDING,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    // Handle foreign key constraint violation
    if (error.code === '23503') {
      throw new Error('Invalid student_id or mentor_id');
    }
    throw error;
  }
};

/**
 * Update connection request status
 * @param {number} requestId - Connection request ID
 * @param {string} status - New status (accepted or declined)
 * @returns {Promise<Object|null>} Updated connection request or null if not found
 */
const updateConnectionRequestStatus = async (requestId, status) => {
  const query = `
    UPDATE ${ConnectionRequestModel.TABLE_NAME}
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, student_id, mentor_id, message, status, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [status, requestId]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all connection requests for a mentor
 * @param {number} mentorId - Mentor ID
 * @returns {Promise<Array>} Array of connection request objects
 */
const getConnectionRequestsByMentor = async (mentorId) => {
  const query = `
    SELECT id, student_id, mentor_id, message, status, created_at, updated_at
    FROM ${ConnectionRequestModel.TABLE_NAME}
    WHERE mentor_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [mentorId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all connection requests sent by a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of connection request objects
 */
const getConnectionRequestsByStudent = async (studentId) => {
  const query = `
    SELECT id, student_id, mentor_id, message, status, created_at, updated_at
    FROM ${ConnectionRequestModel.TABLE_NAME}
    WHERE student_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [studentId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get connection request by ID
 * @param {number} requestId - Connection request ID
 * @returns {Promise<Object|null>} Connection request object or null if not found
 */
const getConnectionRequestById = async (requestId) => {
  const query = `
    SELECT id, student_id, mentor_id, message, status, created_at, updated_at
    FROM ${ConnectionRequestModel.TABLE_NAME}
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [requestId]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a connection request
 * @param {number} requestId - Connection request ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteConnectionRequest = async (requestId) => {
  const query = `
    DELETE FROM ${ConnectionRequestModel.TABLE_NAME}
    WHERE id = $1
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [requestId]);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createConnectionRequest,
  updateConnectionRequestStatus,
  getConnectionRequestsByMentor,
  getConnectionRequestsByStudent,
  getConnectionRequestById,
  deleteConnectionRequest,
};

