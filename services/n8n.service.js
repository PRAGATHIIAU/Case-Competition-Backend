const eventRepository = require('../repositories/event.repository');
const userRepository = require('../repositories/user.repository');
const { getAlumniProfile } = require('./auth.service');
const axios = require('axios');

/**
 * N8N Service
 * Provides data endpoints for n8n workflows to fetch event and judge information
 */

/**
 * Get judge/alumni details for n8n
 * @param {string|number} judgeId - Judge ID (user ID)
 * @returns {Promise<Object>} Judge details with profile information
 */
const getJudgeDetails = async (judgeId) => {
  try {
    // Convert judgeId to number if it's a string
    const userId = typeof judgeId === 'string' ? parseInt(judgeId, 10) : Number(judgeId);
    
    if (isNaN(userId)) {
      throw new Error('Invalid judge ID. Must be a valid number.');
    }

    // Get user from RDS
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('Judge not found');
    }

    // Get profile from DynamoDB
    const profile = await getAlumniProfile(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      contact: user.contact || null,
      linkedin_url: profile?.linkedin_url || null,
      location: profile?.location || null,
      bio: profile?.bio || null,
      skills: profile?.skills || [],
      aspirations: profile?.aspirations || null,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get event details for n8n
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event details
 */
const getEventDetails = async (eventId) => {
  try {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    return {
      eventId: event.eventId,
      name: event.eventInfo?.name || event.title || 'Untitled Event',
      description: event.eventInfo?.description || event.description || null,
      date: event.eventInfo?.date || null,
      location: event.eventInfo?.location || null,
      eventInfo: event.eventInfo || {},
      slots: event.slots || [],
      createdAt: event.createdAt || null,
      updatedAt: event.updatedAt || null,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get approved judges for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of approved judge details
 */
const getApprovedJudgesForEvent = async (eventId) => {
  try {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const judges = event.judges || [];
    const approvedJudges = judges.filter(judge => judge.status === 'approved');

    // Fetch judge details for each approved judge
    const judgeDetails = await Promise.allSettled(
      approvedJudges.map(async (judge) => {
        try {
          const details = await getJudgeDetails(judge.judgeId);
          return {
            judgeId: judge.judgeId,
            status: judge.status,
            ...details,
          };
        } catch (error) {
          console.error(`Error fetching judge ${judge.judgeId}:`, error.message);
          return {
            judgeId: judge.judgeId,
            status: judge.status,
            error: error.message,
          };
        }
      })
    );

    return judgeDetails
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  } catch (error) {
    throw error;
  }
};

/**
 * Get events happening tomorrow
 * @returns {Promise<Array>} Array of events happening tomorrow
 */
const getEventsHappeningTomorrow = async () => {
  try {
    const allEvents = await eventRepository.getAllEvents();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowEvents = allEvents.filter(event => {
      const eventDate = event.eventInfo?.date;
      if (!eventDate) return false;

      try {
        const eventDateObj = new Date(eventDate);
        return eventDateObj >= tomorrow && eventDateObj <= tomorrowEnd;
      } catch (error) {
        console.error(`Invalid date format for event ${event.eventId}:`, eventDate);
        return false;
      }
    });

    // For each event, fetch approved judges
    const eventsWithJudges = await Promise.all(
      tomorrowEvents.map(async (event) => {
        const approvedJudges = await getApprovedJudgesForEvent(event.eventId).catch(() => []);
        return {
          eventId: event.eventId,
          name: event.eventInfo?.name || event.title || 'Untitled Event',
          description: event.eventInfo?.description || event.description || null,
          date: event.eventInfo?.date || null,
          location: event.eventInfo?.location || null,
          slots: event.slots || [],
          approvedJudges: approvedJudges || [],
        };
      })
    );

    return eventsWithJudges;
  } catch (error) {
    throw error;
  }
};

/**
 * Get events that ended today
 * @returns {Promise<Array>} Array of events that ended today
 */
const getEventsEndedToday = async () => {
  try {
    const allEvents = await eventRepository.getAllEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const endedEvents = allEvents.filter(event => {
      const eventDate = event.eventInfo?.date;
      if (!eventDate) return false;

      try {
        const eventDateObj = new Date(eventDate);
        return eventDateObj >= today && eventDateObj <= todayEnd;
      } catch (error) {
        console.error(`Invalid date format for event ${event.eventId}:`, eventDate);
        return false;
      }
    });

    // For each event, fetch approved judges
    const eventsWithJudges = await Promise.all(
      endedEvents.map(async (event) => {
        const approvedJudges = await getApprovedJudgesForEvent(event.eventId).catch(() => []);
        return {
          eventId: event.eventId,
          name: event.eventInfo?.name || event.title || 'Untitled Event',
          description: event.eventInfo?.description || event.description || null,
          date: event.eventInfo?.date || null,
          location: event.eventInfo?.location || null,
          approvedJudges: approvedJudges || [],
        };
      })
    );

    return eventsWithJudges;
  } catch (error) {
    throw error;
  }
};

/**
 * Call n8n webhook
 * @param {string} webhookUrl - n8n webhook URL
 * @param {Object} data - Data to send to webhook
 * @returns {Promise<Object>} Response from webhook
 */
const callN8nWebhook = async (webhookUrl, data) => {
  try {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      throw new Error('Webhook URL is required');
    }

    const response = await axios.post(webhookUrl.trim(), data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    // Log error but don't throw - n8n webhook failures shouldn't break the main flow
    console.error('Failed to call n8n webhook:', error.message);
    if (error.response) {
      console.error('Webhook response error:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  getJudgeDetails,
  getEventDetails,
  getApprovedJudgesForEvent,
  getEventsHappeningTomorrow,
  getEventsEndedToday,
  callN8nWebhook,
};

