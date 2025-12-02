const connectionRequestRepository = require('../repositories/connectionRequest.repository');
const { ConnectionRequestModel } = require('../models/connectionRequest.model');

/**
 * Connection Request Service
 * Handles business logic for connection requests
 */

/**
 * Create a new connection request
 * @param {Object} requestData - Connection request data
 * @param {string} requestData.student_id - Student ID
 * @param {number} requestData.mentor_id - Mentor ID
 * @param {string} requestData.message - Optional message
 * @returns {Promise<Object>} Created connection request
 */
const createConnectionRequest = async (requestData) => {
  try {
    const { student_id, mentor_id, message } = requestData;

    // Validate required fields
    if (!student_id || typeof student_id !== 'string' || !student_id.trim()) {
      throw new Error('student_id is required and must be a valid string');
    }

    if (!mentor_id || typeof mentor_id !== 'number') {
      throw new Error('mentor_id is required and must be a valid number');
    }

    // Create connection request with pending status
    const connectionRequest = await connectionRequestRepository.createConnectionRequest({
      student_id: student_id.trim(),
      mentor_id,
      message: message?.trim() || null,
    });

    return connectionRequest;
  } catch (error) {
    throw error;
  }
};

/**
 * Accept a connection request
 * @param {number} requestId - Connection request ID
 * @returns {Promise<Object>} Updated connection request
 */
const acceptConnectionRequest = async (requestId) => {
  try {
    if (!requestId || typeof requestId !== 'number') {
      throw new Error('Request ID is required and must be a valid number');
    }

    // Check if request exists
    const existingRequest = await connectionRequestRepository.getConnectionRequestById(requestId);
    if (!existingRequest) {
      throw new Error('Connection request not found');
    }

    // Update status to accepted
    const updatedRequest = await connectionRequestRepository.updateConnectionRequestStatus(
      requestId,
      ConnectionRequestModel.STATUS.ACCEPTED
    );

    if (!updatedRequest) {
      throw new Error('Failed to accept connection request');
    }

    return updatedRequest;
  } catch (error) {
    throw error;
  }
};

/**
 * Decline a connection request
 * @param {number} requestId - Connection request ID
 * @returns {Promise<Object>} Updated connection request
 */
const declineConnectionRequest = async (requestId) => {
  try {
    if (!requestId || typeof requestId !== 'number') {
      throw new Error('Request ID is required and must be a valid number');
    }

    // Check if request exists
    const existingRequest = await connectionRequestRepository.getConnectionRequestById(requestId);
    if (!existingRequest) {
      throw new Error('Connection request not found');
    }

    // Update status to declined
    const updatedRequest = await connectionRequestRepository.updateConnectionRequestStatus(
      requestId,
      ConnectionRequestModel.STATUS.DECLINED
    );

    if (!updatedRequest) {
      throw new Error('Failed to decline connection request');
    }

    return updatedRequest;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all connection requests for a mentor
 * @param {number} mentorId - Mentor ID
 * @returns {Promise<Array>} Array of connection requests
 */
const getConnectionRequestsByMentor = async (mentorId) => {
  try {
    if (!mentorId || typeof mentorId !== 'number') {
      throw new Error('Mentor ID is required and must be a valid number');
    }

    const requests = await connectionRequestRepository.getConnectionRequestsByMentor(mentorId);
    return requests;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a connection request
 * @param {number} requestId - Connection request ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteConnectionRequest = async (requestId) => {
  try {
    if (!requestId || typeof requestId !== 'number') {
      throw new Error('Request ID is required and must be a valid number');
    }

    const deleted = await connectionRequestRepository.deleteConnectionRequest(requestId);
    if (!deleted) {
      throw new Error('Connection request not found');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getConnectionRequestsByMentor,
  deleteConnectionRequest,
};

