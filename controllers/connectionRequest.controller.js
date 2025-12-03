const connectionRequestService = require('../services/connectionRequest.service');

/**
 * Connection Request Controller
 * Handles HTTP requests and responses for connection request endpoints
 */

/**
 * POST /api/connection-requests
 * Create a new connection request
 */
const createConnectionRequest = async (req, res) => {
  console.log('-> triggered endpoint POST /api/connection-requests');
  try {
    const { student_id, mentor_id, message } = req.body;

    const connectionRequest = await connectionRequestService.createConnectionRequest({
      student_id,
      mentor_id,
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Connection request created successfully',
      data: connectionRequest,
    });
    console.log('-> finished endpoint execution POST /api/connection-requests');
  } catch (error) {
    console.log('-> finished endpoint execution POST /api/connection-requests');
    console.error('Create connection request error:', error);
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create connection request',
      error: error.message || 'An error occurred while creating connection request',
    });
  }
};

/**
 * PUT /api/connection-requests/:id/accept
 * Accept a connection request
 */
const acceptConnectionRequest = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/connection-requests/:id/accept`);
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      console.log('-> finished endpoint execution PUT /api/connection-requests/:id/accept');
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID',
        error: 'Request ID must be a valid number',
      });
    }

    const updatedRequest = await connectionRequestService.acceptConnectionRequest(requestId);

    res.status(200).json({
      success: true,
      message: 'Connection request accepted successfully',
      data: updatedRequest,
    });
    console.log('-> finished endpoint execution PUT /api/connection-requests/:id/accept');
  } catch (error) {
    console.log('-> finished endpoint execution PUT /api/connection-requests/:id/accept');
    console.error('Accept connection request error:', error);

    if (error.message === 'Connection request not found') {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found',
        error: error.message,
      });
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to accept connection request',
      error: error.message || 'An error occurred while accepting connection request',
    });
  }
};

/**
 * PUT /api/connection-requests/:id/decline
 * Decline a connection request
 */
const declineConnectionRequest = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/connection-requests/:id/decline`);
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      console.log('-> finished endpoint execution PUT /api/connection-requests/:id/decline');
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID',
        error: 'Request ID must be a valid number',
      });
    }

    const updatedRequest = await connectionRequestService.declineConnectionRequest(requestId);

    res.status(200).json({
      success: true,
      message: 'Connection request declined successfully',
      data: updatedRequest,
    });
    console.log('-> finished endpoint execution PUT /api/connection-requests/:id/decline');
  } catch (error) {
    console.log('-> finished endpoint execution PUT /api/connection-requests/:id/decline');
    console.error('Decline connection request error:', error);

    if (error.message === 'Connection request not found') {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found',
        error: error.message,
      });
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to decline connection request',
      error: error.message || 'An error occurred while declining connection request',
    });
  }
};

/**
 * GET /api/connection-requests/mentor/:mentorId
 * Get all connection requests for a mentor
 */
const getConnectionRequestsByMentor = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/connection-requests/mentor/:mentorId`);
  try {
    const { mentorId } = req.params;
    const mentorIdNum = parseInt(mentorId);

    if (isNaN(mentorIdNum)) {
      console.log('-> finished endpoint execution GET /api/connection-requests/mentor/:mentorId');
      return res.status(400).json({
        success: false,
        message: 'Invalid mentor ID',
        error: 'Mentor ID must be a valid number',
      });
    }

    const requests = await connectionRequestService.getConnectionRequestsByMentor(mentorIdNum);

    res.status(200).json({
      success: true,
      message: 'Connection requests retrieved successfully',
      data: requests,
      count: requests.length,
    });
    console.log('-> finished endpoint execution GET /api/connection-requests/mentor/:mentorId');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/connection-requests/mentor/:mentorId');
    console.error('Get connection requests by mentor error:', error);

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve connection requests',
      error: error.message || 'An error occurred while retrieving connection requests',
    });
  }
};

/**
 * GET /api/connection-requests/student/:studentId
 * Get all connection requests sent by a student
 */
const getConnectionRequestsByStudent = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/connection-requests/student/:studentId`);
  try {
    const { studentId } = req.params;

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      console.log('-> finished endpoint execution GET /api/connection-requests/student/:studentId');
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
        error: 'Student ID is required and must be a valid string',
      });
    }

    const requests = await connectionRequestService.getConnectionRequestsByStudent(studentId.trim());

    res.status(200).json({
      success: true,
      message: 'Connection requests retrieved successfully',
      data: requests,
      count: requests.length,
    });
    console.log('-> finished endpoint execution GET /api/connection-requests/student/:studentId');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/connection-requests/student/:studentId');
    console.error('Get connection requests by student error:', error);

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve connection requests',
      error: error.message || 'An error occurred while retrieving connection requests',
    });
  }
};

/**
 * DELETE /api/connection-requests/:id
 * Delete a connection request
 */
const deleteConnectionRequest = async (req, res) => {
  console.log(`-> triggered endpoint DELETE /api/connection-requests/:id`);
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      console.log('-> finished endpoint execution DELETE /api/connection-requests/:id');
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID',
        error: 'Request ID must be a valid number',
      });
    }

    await connectionRequestService.deleteConnectionRequest(requestId);

    res.status(200).json({
      success: true,
      message: 'Connection request deleted successfully',
    });
    console.log('-> finished endpoint execution DELETE /api/connection-requests/:id');
  } catch (error) {
    console.log('-> finished endpoint execution DELETE /api/connection-requests/:id');
    console.error('Delete connection request error:', error);

    if (error.message === 'Connection request not found') {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found',
        error: error.message,
      });
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete connection request',
      error: error.message || 'An error occurred while deleting connection request',
    });
  }
};

module.exports = {
  createConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getConnectionRequestsByMentor,
  getConnectionRequestsByStudent,
  deleteConnectionRequest,
};

