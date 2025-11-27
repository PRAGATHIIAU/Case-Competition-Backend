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
  try {
    const events = await eventService.getAllEvents();

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

/**
 * GET /events/:id
 * Get event by ID
 */
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

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
  try {
    const eventData = req.body;

    const newEvent = await eventService.createEvent(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent,
    });
  } catch (error) {
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
  try {
    const { id } = req.params;

    await eventService.deleteEvent(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

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
  try {
    const { id } = req.params;
    const { alumniEmail, alumniName, preferredDateTime, preferredLocation } = req.body;

    const result = await eventService.registerAlumniAsJudge(id, {
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
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

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
  try {
    const { eventId } = req.params;

    const teams = await eventService.getTeams(eventId);

    res.status(200).json({
      success: true,
      message: 'Teams retrieved successfully',
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

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
  try {
    const { eventId } = req.params;

    const rubrics = await eventService.getRubrics(eventId);

    res.status(200).json({
      success: true,
      message: 'Rubrics retrieved successfully',
      data: rubrics,
      count: rubrics.length,
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    console.error('Get rubrics error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve rubrics',
      error: error.message || 'An error occurred while retrieving rubrics',
    });
  }
};

/**
 * POST /events/:eventId/score
 * Submit scores for a team
 */
const submitScores = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { judgeId, teamId, scores } = req.body;

    if (!judgeId || !teamId || !scores) {
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
      });
    }

    console.error('Submit scores error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to submit scores',
      error: error.message || 'An error occurred while submitting scores',
    });
  }
};

/**
 * GET /events/:eventId/leaderboard
 * Get leaderboard for an event
 */
const getLeaderboard = async (req, res) => {
  try {
    const { eventId } = req.params;

    const leaderboard = await eventService.getLeaderboard(eventId);

    res.status(200).json({
      success: true,
      message: 'Leaderboard retrieved successfully',
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

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
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerAlumniAsJudge,
  getTeams,
  getRubrics,
  submitScores,
  getLeaderboard,
};

