const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticateAdmin } = require('../middleware/adminAuth');
const upload = require('../middleware/upload');

/**
 * Event Routes
 * GET /api/events - Get all events
 * GET /api/events/competitions - Get all events with type="competition"
 * GET /api/events/:id - Get event by ID
 * GET /api/events/judged-by/:userId - Get all events where user is assigned as judge
 * GET /api/events/judged-by/:userId/rubrics - Get all rubrics for events where user is a judge
 * GET /api/events/student/:studentId/registered - Get all events where student is registered
 * POST /api/events - Create a new event (Admin only)
 * PUT /api/events/:id - Update an event (Admin only)
 * DELETE /api/events/:id - Delete an event (Admin only)
 * POST /api/events/:id/register - Register alumni as judge
 * GET /api/events/:eventId/teams - Get teams with total scores
 * PUT /api/events/:eventId/teams - Update team details (teamId is generated automatically)
 * POST /api/events/:eventId/teams/:teamId/submit - Submit competition document for a team
 * GET /api/events/:eventId/rubrics - Get rubrics
 * POST /api/events/:eventId/score - Submit scores
 * GET /api/events/:eventId/leaderboard - Get leaderboard
 */

// GET /api/events
router.get('/', eventController.getAllEvents);

// GET /api/events/competitions (must come before /:id route)
router.get('/competitions', eventController.getCompetitions);

// POST /api/events (Admin only - requires authentication)
router.post('/', authenticateAdmin, eventController.createEvent);

// Specific routes must come before generic :id route to avoid conflicts
// GET /api/events/judged-by/:userId/rubrics (must come before /judged-by/:userId)
router.get('/judged-by/:userId/rubrics', eventController.getRubricsForJudge);

// GET /api/events/judged-by/:userId
router.get('/judged-by/:userId', eventController.getEventsJudgedBy);

// GET /api/events/student/:studentId/registered (must come before /:eventId routes)
router.get('/student/:studentId/registered', eventController.getRegisteredEventsForStudent);

// GET /api/events/:eventId/teams
router.get('/:eventId/teams', eventController.getTeams);

// PUT /api/events/:eventId/teams
router.put('/:eventId/teams', eventController.updateTeamDetails);

// POST /api/events/:eventId/teams/:teamId/submit (must come before /:eventId/rubrics to avoid conflicts)
router.post('/:eventId/teams/:teamId/submit', upload.single('document'), eventController.submitCompetitionDocument);

// GET /api/events/:eventId/rubrics
router.get('/:eventId/rubrics', eventController.getRubrics);

// GET /api/events/:eventId/leaderboard
router.get('/:eventId/leaderboard', eventController.getLeaderboard);

// POST /api/events/:eventId/score
router.post('/:eventId/score', eventController.submitScores);

// PUT /api/events/:eventId/judges/:judgeId/status (Admin only - must come before /:id/register)
router.put('/:eventId/judges/:judgeId/status', authenticateAdmin, eventController.updateJudgeStatus);

// POST /api/events/:id/register
router.post('/:id/register', eventController.registerAlumniAsJudge);

// Generic routes (must come after specific routes)
// GET /api/events/:id
router.get('/:id', eventController.getEventById);

// PUT /api/events/:id (Admin only - requires authentication)
router.put('/:id', authenticateAdmin, eventController.updateEvent);

// DELETE /api/events/:id (Admin only - requires authentication)
router.delete('/:id', authenticateAdmin, eventController.deleteEvent);

module.exports = router;

