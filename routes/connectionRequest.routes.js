const express = require('express');
const router = express.Router();
const connectionRequestController = require('../controllers/connectionRequest.controller');

/**
 * Connection Request Routes
 * POST /api/connection-requests - Create a new connection request
 * PUT /api/connection-requests/:id/accept - Accept a connection request
 * PUT /api/connection-requests/:id/decline - Decline a connection request
 * GET /api/connection-requests/mentor/:mentorId - Get all requests for a mentor
 * DELETE /api/connection-requests/:id - Delete a connection request
 */

// POST /api/connection-requests
router.post('/', connectionRequestController.createConnectionRequest);

// PUT /api/connection-requests/:id/accept
router.put('/:id/accept', connectionRequestController.acceptConnectionRequest);

// PUT /api/connection-requests/:id/decline
router.put('/:id/decline', connectionRequestController.declineConnectionRequest);

// GET /api/connection-requests/mentor/:mentorId (must come before /:id routes)
router.get('/mentor/:mentorId', connectionRequestController.getConnectionRequestsByMentor);

// DELETE /api/connection-requests/:id
router.delete('/:id', connectionRequestController.deleteConnectionRequest);

module.exports = router;

