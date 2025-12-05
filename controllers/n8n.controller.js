const n8nService = require('../services/n8n.service');

/**
 * N8N Controller
 * Handles HTTP requests for n8n workflow endpoints
 */

/**
 * GET /api/n8n/judge/:judgeId
 * Get judge/alumni details for n8n
 */
const getJudgeDetails = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/n8n/judge/:judgeId`);
  try {
    const { judgeId } = req.params;
    
    if (!judgeId) {
      console.log('-> finished endpoint execution GET /api/n8n/judge/:judgeId');
      return res.status(400).json({
        success: false,
        message: 'Judge ID is required',
        error: 'Judge ID parameter is missing',
      });
    }

    const judgeDetails = await n8nService.getJudgeDetails(judgeId);
    
    res.status(200).json({
      success: true,
      message: 'Judge details retrieved successfully',
      data: judgeDetails,
    });
    
    console.log('-> finished endpoint execution GET /api/n8n/judge/:judgeId');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/n8n/judge/:judgeId');
    console.error('Get judge details error:', error);
    
    if (error.message === 'Judge not found') {
      return res.status(404).json({
        success: false,
        message: 'Judge not found',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve judge details',
      error: error.message || 'An error occurred while retrieving judge details',
    });
  }
};

/**
 * GET /api/n8n/event/:eventId
 * Get event details for n8n
 */
const getEventDetails = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/n8n/event/:eventId`);
  try {
    const { eventId } = req.params;
    
    if (!eventId) {
      console.log('-> finished endpoint execution GET /api/n8n/event/:eventId');
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
        error: 'Event ID parameter is missing',
      });
    }

    const eventDetails = await n8nService.getEventDetails(eventId);
    
    res.status(200).json({
      success: true,
      message: 'Event details retrieved successfully',
      data: eventDetails,
    });
    
    console.log('-> finished endpoint execution GET /api/n8n/event/:eventId');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/n8n/event/:eventId');
    console.error('Get event details error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details',
      error: error.message || 'An error occurred while retrieving event details',
    });
  }
};

/**
 * GET /api/n8n/event/:eventId/judges/approved
 * Get approved judges for an event
 */
const getApprovedJudgesForEvent = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/n8n/event/:eventId/judges/approved`);
  try {
    const { eventId } = req.params;
    
    if (!eventId) {
      console.log('-> finished endpoint execution GET /api/n8n/event/:eventId/judges/approved');
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
        error: 'Event ID parameter is missing',
      });
    }

    const approvedJudges = await n8nService.getApprovedJudgesForEvent(eventId);
    
    res.status(200).json({
      success: true,
      message: 'Approved judges retrieved successfully',
      data: approvedJudges,
      count: approvedJudges.length,
    });
    
    console.log('-> finished endpoint execution GET /api/n8n/event/:eventId/judges/approved');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/n8n/event/:eventId/judges/approved');
    console.error('Get approved judges error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approved judges',
      error: error.message || 'An error occurred while retrieving approved judges',
    });
  }
};

/**
 * GET /api/n8n/events/upcoming/tomorrow
 * Get events happening tomorrow
 */
const getEventsHappeningTomorrow = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/n8n/events/upcoming/tomorrow`);
  try {
    const events = await n8nService.getEventsHappeningTomorrow();
    
    res.status(200).json({
      success: true,
      message: 'Events happening tomorrow retrieved successfully',
      data: events,
      count: events.length,
    });
    
    console.log('-> finished endpoint execution GET /api/n8n/events/upcoming/tomorrow');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/n8n/events/upcoming/tomorrow');
    console.error('Get events happening tomorrow error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events happening tomorrow',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

/**
 * GET /api/n8n/events/ended/today
 * Get events that ended today
 */
const getEventsEndedToday = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/n8n/events/ended/today`);
  try {
    const events = await n8nService.getEventsEndedToday();
    
    res.status(200).json({
      success: true,
      message: 'Events that ended today retrieved successfully',
      data: events,
      count: events.length,
    });
    
    console.log('-> finished endpoint execution GET /api/n8n/events/ended/today');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/n8n/events/ended/today');
    console.error('Get events ended today error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events that ended today',
      error: error.message || 'An error occurred while retrieving events',
    });
  }
};

module.exports = {
  getJudgeDetails,
  getEventDetails,
  getApprovedJudgesForEvent,
  getEventsHappeningTomorrow,
  getEventsEndedToday,
};

