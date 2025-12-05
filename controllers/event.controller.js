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

/**
 * GET /events/student/:studentId/registered
 * Get all events where a student is registered as a team member
 */
const getRegisteredEventsForStudent = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/events/student/:studentId/registered`);
  try {
    const { studentId } = req.params;

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      console.log('-> finished endpoint execution GET /api/events/student/:studentId/registered');
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
        error: 'Student ID is required and must be a valid string',
      });
    }

    const registeredEvents = await eventService.getRegisteredEventsForStudent(studentId.trim());

    res.status(200).json({
      success: true,
      message: 'Registered events retrieved successfully',
      data: registeredEvents,
      count: registeredEvents.length,
    });
    console.log('-> finished endpoint execution GET /api/events/student/:studentId/registered');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/events/student/:studentId/registered');
    console.error('Get registered events for student error:', error);

    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
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
      message: 'Failed to retrieve registered events',
      error: error.message || 'An error occurred while retrieving registered events',
    });
  }
};

/**
 * POST /events/:eventId/teams/:teamId/submit
 * Submit competition document for a team
 */
const submitCompetitionDocument = async (req, res) => {
  console.log(`-> triggered endpoint POST /api/events/:eventId/teams/:teamId/submit`);
  try {
    const { eventId, teamId } = req.params;

    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      console.log('-> finished endpoint execution POST /api/events/:eventId/teams/:teamId/submit');
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID',
        error: 'Event ID is required and must be a valid string',
      });
    }

    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
      console.log('-> finished endpoint execution POST /api/events/:eventId/teams/:teamId/submit');
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID',
        error: 'Team ID is required and must be a valid string',
      });
    }

    // Get uploaded file from multer
    const file = req.file;
    if (!file) {
      console.log('-> finished endpoint execution POST /api/events/:eventId/teams/:teamId/submit');
      return res.status(400).json({
        success: false,
        message: 'File is required',
        error: 'Please upload a document file (PDF, DOC, or DOCX)',
      });
    }

    // Submit the document
    const result = await eventService.submitCompetitionDocument(
      eventId.trim(),
      teamId.trim(),
      file.buffer,
      file.originalname,
      file.mimetype
    );

    res.status(200).json({
      success: true,
      message: 'Competition document submitted successfully',
      data: result,
    });
    console.log('-> finished endpoint execution POST /api/events/:eventId/teams/:teamId/submit');
  } catch (error) {
    console.log('-> finished endpoint execution POST /api/events/:eventId/teams/:teamId/submit');
    console.error('Submit competition document error:', error);

    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }

    if (error.message === 'Team not found in event') {
      return res.status(404).json({
        success: false,
        message: 'Team not found in event',
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
      message: 'Failed to submit competition document',
      error: error.message || 'An error occurred while submitting the document',
    });
  }
};

/**
 * PUT /api/events/:eventId/judges/:judgeId/status
 * Update judge status for an event (Admin only)
 */
const updateJudgeStatus = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/events/:eventId/judges/:judgeId/status`);
  try {
    const { eventId, judgeId } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== 'string' || !status.trim()) {
      console.log('-> finished endpoint execution PUT /api/events/:eventId/judges/:judgeId/status');
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        error: 'Status must be "approved" or "denied"',
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    if (normalizedStatus !== 'approved' && normalizedStatus !== 'denied') {
      console.log('-> finished endpoint execution PUT /api/events/:eventId/judges/:judgeId/status');
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        error: 'Status must be either "approved" or "denied"',
      });
    }

    const updatedEvent = await eventService.updateJudgeStatus(eventId, judgeId, normalizedStatus);

    res.status(200).json({
      success: true,
      message: `Judge status updated to ${normalizedStatus} successfully`,
      data: {
        eventId: updatedEvent.eventId,
        judgeId: judgeId.trim(),
        status: normalizedStatus,
        updatedAt: updatedEvent.updatedAt,
      },
    });

    console.log('-> finished endpoint execution PUT /api/events/:eventId/judges/:judgeId/status');
  } catch (error) {
    console.log('-> finished endpoint execution PUT /api/events/:eventId/judges/:judgeId/status');
    console.error('Update judge status error:', error);

    if (error.message === 'Event not found' || error.message === 'Judge not found in event') {
      return res.status(404).json({
        success: false,
        message: error.message,
        error: error.message,
      });
    }

    if (error.message.includes('required') || error.message.includes('Status must')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update judge status',
      error: error.message || 'An error occurred while updating judge status',
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
  getRegisteredEventsForStudent,
  submitCompetitionDocument,
  updateJudgeStatus,
};

