const express = require('express');
const router = express.Router();
const n8nController = require('../controllers/n8n.controller');

/**
 * N8N Routes
 * API endpoints for n8n workflows to fetch event and judge information
 * 
 * GET /api/n8n/judge/:judgeId - Get judge/alumni details
 * GET /api/n8n/event/:eventId - Get event details
 * GET /api/n8n/event/:eventId/judges/approved - Get approved judges for an event
 * GET /api/n8n/events/upcoming/tomorrow - Get events happening tomorrow
 * GET /api/n8n/events/ended/today - Get events that ended today
 */

// GET /api/n8n/judge/:judgeId
router.get('/judge/:judgeId', n8nController.getJudgeDetails);

// GET /api/n8n/event/:eventId
router.get('/event/:eventId', n8nController.getEventDetails);

// GET /api/n8n/event/:eventId/judges/approved
router.get('/event/:eventId/judges/approved', n8nController.getApprovedJudgesForEvent);

// GET /api/n8n/events/upcoming/tomorrow
router.get('/events/upcoming/tomorrow', n8nController.getEventsHappeningTomorrow);

// GET /api/n8n/events/ended/today
router.get('/events/ended/today', n8nController.getEventsEndedToday);

module.exports = router;

