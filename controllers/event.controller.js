const eventService = require('../services/event.service');

/**
 * Event Controller
 * Handles HTTP requests and responses for event endpoints
 */

/**
 * GET /events
 * Get all events
 */
const getAllEvents = async (req, res) => {
  console.log('-> triggered endpoint GET /api/events');
  try {
    const events = await eventService.getAllEvents();

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      count: events.length,
    });
    console.log('-> finished endpoint execution GET /api/events');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/events');
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

/**
 * GET /events/competitions
 * Get all events with type="competition"
 */
const getCompetitions = async (req, res) => {
  console.log('-> triggered endpoint GET /api/events/competitions');
  try {
    const competitions = await eventService.getCompetitions();

    res.status(200).json({
      success: true,
      message: 'Competitions retrieved successfully',
      data: competitions,
      count: competitions.length,
    });
    console.log('-> finished endpoint execution GET /api/events/competitions');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/events/competitions');
    console.error('Get competitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve competitions',
      error: error.message || 'An error occurred while retrieving competitions',
    });
  }
};

/**
 * GET /events/:id
 * Get event by ID
 */
const getEventById = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/:id`);
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    });
    console.log('-> finished endpoint execution GET /api/events/:id');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution GET /api/events/:id');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/events/:id');
    console.error('Get event by ID error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve event',
      error: error.message || 'An error occurred while retrieving event',
    });
  }
};

/**
 * POST /events
 * Create a new event
 */
const createEvent = async (req, res) => {
  console.log('-> triggered endpoint POST /api/events');
  try {
    const eventData = req.body;

    const newEvent = await eventService.createEvent(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent,
    });
    console.log('-> finished endpoint execution POST /api/events');
  } catch (error) {
    console.log('-> finished endpoint execution POST /api/events');
    console.error('Create event error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create event',
      error: error.message || 'An error occurred while creating event',
    });
  }
};

/**
 * PUT /events/:id
 * Update an existing event
 */
const updateEvent = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/events/:id`);
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedEvent = await eventService.updateEvent(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
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

    console.log('-> finished endpoint execution PUT /api/events/:id');
    console.error('Update event error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event',
      error: error.message || 'An error occurred while updating event',
    });
  }
};

/**
 * DELETE /events/:id
 * Delete an event
 */
const deleteEvent = async (req, res) => {
  console.log(`-> triggered endpoint DELETE /api/events/:id`);
  try {
    const { id } = req.params;

    await eventService.deleteEvent(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
    console.log('-> finished endpoint execution DELETE /api/events/:id');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution DELETE /api/events/:id');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution DELETE /api/events/:id');
    console.error('Delete event error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message || 'An error occurred while deleting event',
    });
  }
};

/**
 * POST /events/:id/register
 * Register alumni as judge for an event
 */
const registerAlumniAsJudge = async (req, res) => {
  console.log(`-> triggered endpoint POST /api/events/:id/register`);
  try {
    const { id: eventId } = req.params;
    const { id, alumniEmail, alumniName, preferredDateTime, preferredLocation } = req.body;

    const result = await eventService.registerAlumniAsJudge(eventId, {
      id,
      alumniEmail,
      alumniName,
      preferredDateTime,
      preferredLocation,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        eventId: result.eventId,
        eventTitle: result.eventTitle,
      },
    });
    console.log('-> finished endpoint execution POST /api/events/:id/register');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution POST /api/events/:id/register');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution POST /api/events/:id/register');
    console.error('Register alumni as judge error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to register alumni as judge',
      error: error.message || 'An error occurred while registering',
    });
  }
};

/**
 * GET /events/:eventId/teams
 * Get teams for an event with total scores
 */
const getTeams = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/:eventId/teams`);
  try {
    const { eventId } = req.params;

    const teams = await eventService.getTeams(eventId);

    res.status(200).json({
      success: true,
      message: 'Teams retrieved successfully',
      data: teams,
      count: teams.length,
    });
    console.log('-> finished endpoint execution GET /api/events/:eventId/teams');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution GET /api/events/:eventId/teams');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/events/:eventId/teams');
    console.error('Get teams error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve teams',
      error: error.message || 'An error occurred while retrieving teams',
    });
  }
};

/**
 * GET /events/:eventId/rubrics
 * Get rubrics for an event
 */
const getRubrics = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/:eventId/rubrics`);
  try {
    const { eventId } = req.params;

    const rubrics = await eventService.getRubrics(eventId);

    res.status(200).json({
      success: true,
      message: 'Rubrics retrieved successfully',
      data: rubrics,
      count: rubrics.length,
    });
    console.log('-> finished endpoint execution GET /api/events/:eventId/rubrics');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution GET /api/events/:eventId/rubrics');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/events/:eventId/rubrics');
    console.error('Get rubrics error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve rubrics',
      error: error.message || 'An error occurred while retrieving rubrics',
    });
  }
};

/**
 * PUT /events/:eventId/teams
 * Update team details for an existing event
 * teamId is generated automatically and stored
 */
const updateTeamDetails = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/events/:eventId/teams`);
  try {
    const { eventId } = req.params;
    const { teamName, members, slotPreference } = req.body;

    const updatedEvent = await eventService.updateTeamDetails(eventId, {
      teamName,
      members,
      slotPreference,
    });

    res.status(200).json({
      success: true,
      message: 'Team details updated successfully',
      data: updatedEvent,
    });
    console.log('-> finished endpoint execution PUT /api/events/:eventId/teams');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution PUT /api/events/:eventId/teams');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution PUT /api/events/:eventId/teams');
    console.error('Update team details error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update team details',
      error: error.message || 'An error occurred while updating team details',
    });
  }
};

/**
 * POST /events/:eventId/score
 * Submit scores for a team
 */
const submitScores = async (req, res) => {
  console.log(`-> triggered endpoint POST /api/events/:eventId/score`);
  try {
    const { eventId } = req.params;
    const { judgeId, teamId, scores } = req.body;

    if (!judgeId || !teamId || !scores) {
      console.log('-> finished endpoint execution POST /api/events/:eventId/score');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'judgeId, teamId, and scores are required',
      });
    }

    const updatedEvent = await eventService.submitScores(eventId, judgeId, teamId, scores);

    res.status(200).json({
      success: true,
      message: 'Scores submitted successfully',
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

    if (
      error.message.includes('Judge not found') ||
      error.message.includes('Judge is not approved') ||
      error.message.includes('Team not found') ||
      error.message.includes('Rubric') ||
      error.message.includes('exceeds maximum score')
    ) {
      console.log('-> finished endpoint execution POST /api/events/:eventId/score');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution POST /api/events/:eventId/score');
    console.error('Submit scores error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to submit scores',
      error: error.message || 'An error occurred while submitting scores',
    });
  }
};

/**
 * GET /events/judged-by/:userId
 * Get all events where the user is assigned as a judge
 */
const getEventsJudgedBy = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/judged-by/:userId`);
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      console.log('-> finished endpoint execution GET /api/events/judged-by/:userId');
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
        error: 'userId is required and must be a valid string',
      });
    }

    const events = await eventService.getEventsJudgedBy(userId.trim());

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      count: events.length,
    });
    console.log('-> finished endpoint execution GET /api/events/judged-by/:userId');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/events/judged-by/:userId');
    console.error('Get events judged by error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

/**
 * GET /events/judged-by/:userId/rubrics
 * Get all rubrics for events where the user is assigned as a judge
 */
const getRubricsForJudge = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/judged-by/:userId/rubrics`);
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      console.log('-> finished endpoint execution GET /api/events/judged-by/:userId/rubrics');
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
        error: 'userId is required and must be a valid string',
      });
    }

    const rubrics = await eventService.getRubricsForJudge(userId.trim());

    res.status(200).json({
      success: true,
      message: 'Rubrics retrieved successfully',
      data: rubrics,
      count: rubrics.length,
    });
    console.log('-> finished endpoint execution GET /api/events/judged-by/:userId/rubrics');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/events/judged-by/:userId/rubrics');
    console.error('Get rubrics for judge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rubrics',
      error: error.message || 'An error occurred while retrieving rubrics',
    });
  }
};

/**
 * GET /events/:eventId/leaderboard
 * Get leaderboard for an event
 */
const getLeaderboard = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/:eventId/leaderboard`);
  try {
    const { eventId } = req.params;

    const leaderboard = await eventService.getLeaderboard(eventId);

    res.status(200).json({
      success: true,
      message: 'Leaderboard retrieved successfully',
      data: leaderboard,
      count: leaderboard.length,
    });
    console.log('-> finished endpoint execution GET /api/events/:eventId/leaderboard');
  } catch (error) {
    if (error.message === 'Event not found') {
      console.log('-> finished endpoint execution GET /api/events/:eventId/leaderboard');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/events/:eventId/leaderboard');
    console.error('Get leaderboard error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve leaderboard',
      error: error.message || 'An error occurred while retrieving leaderboard',
    });
  }
};

module.exports = {
  getAllEvents,
  getCompetitions,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerAlumniAsJudge,
  getEventsJudgedBy,
  getRubricsForJudge,
  getTeams,
  getRubrics,
  updateTeamDetails,
  submitScores,
  getLeaderboard,
};

