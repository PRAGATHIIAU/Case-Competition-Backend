const axios = require('axios');
const { API_GATEWAY_DYNAMODB_URL } = require('../config/aws');

/**
 * Event Repository
 * Handles all DynamoDB operations for Events via API Gateway → Lambda
 */

/**
 * Generate a unique event ID
 * @returns {string} Unique event ID
 */
const generateEventId = () => {
  return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a unique team ID
 * @returns {string} Unique team ID
 */
const generateTeamId = () => {
  return `TEAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Make API Gateway request to DynamoDB Lambda
 * @param {string} operation - Operation name (get, getAll, create, update, delete)
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response data
 */
const callDynamoDBLambda = async (operation, data = {}) => {
  if (!API_GATEWAY_DYNAMODB_URL) {
    throw new Error(
      'API Gateway DynamoDB URL is not configured. ' +
      'Please set API_GATEWAY_DYNAMODB_URL in your .env file. ' +
      'Example: API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/events'
    );
  }

  try {
    const response = await axios.post(API_GATEWAY_DYNAMODB_URL, {
      operation,
      ...data,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    if (response.data.success === false) {
      throw new Error(response.data.error || 'DynamoDB operation failed');
    }

    return response.data;
  } catch (error) {
    console.error('API Gateway DynamoDB error:', error);
    
    if (error.response) {
      // API Gateway/Lambda returned an error
      const status = error.response.status;
      const responseData = error.response.data;
      
      const errorMessage = typeof responseData === 'string' 
        ? responseData 
        : (responseData?.error || responseData?.message || 'DynamoDB operation failed');
      
      if (status === 404 && errorMessage.includes('not found')) {
        return null; // Return null for not found cases
      }
      
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(
        `DynamoDB service is unavailable. ` +
        `Please check: 1) API Gateway URL is correct (${API_GATEWAY_DYNAMODB_URL}), ` +
        `2) API Gateway is deployed and accessible, 3) Network connectivity.`
      );
    } else {
      // Error setting up the request
      throw new Error(`Failed to call DynamoDB service: ${error.message}`);
    }
  }
};

/**
 * Get all events
 * @returns {Promise<Array>} Array of event objects
 */
const getAllEvents = async () => {
  try {
    const response = await callDynamoDBLambda('getAll');
    return response.data || [];
  } catch (error) {
    console.error('Error getting all events:', error);
    throw new Error(`Failed to retrieve events: ${error.message}`);
  }
};

/**
 * Get all events with type="competition"
 * @returns {Promise<Array>} Array of competition event objects
 */
const getCompetitions = async () => {
  try {
    const response = await callDynamoDBLambda('getCompetitions');
    return response.data || [];
  } catch (error) {
    console.error('Error getting competitions:', error);
    throw new Error(`Failed to retrieve competitions: ${error.message}`);
  }
};

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} Event object or null if not found
 */
const getEventById = async (eventId) => {
  try {
    const response = await callDynamoDBLambda('get', { eventId });
    return response.data || null;
  } catch (error) {
    if (error.message.includes('not found')) {
      return null;
    }
    console.error('Error getting event by ID:', error);
    throw new Error(`Failed to retrieve event: ${error.message}`);
  }
};

/**
 * Create a new event
 * @param {Object} eventData - Event data object
 * @returns {Promise<Object>} Created event object
 */
const createEvent = async (eventData) => {
  try {
    const response = await callDynamoDBLambda('create', eventData);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(`Failed to create event: ${error.message}`);
  }
};

/**
 * Update an existing event
 * @param {string} eventId - Event ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated event object or null if not found
 */
const updateEvent = async (eventId, updateData) => {
  try {
    const response = await callDynamoDBLambda('update', {
      eventId,
      ...updateData,
    });
    
    if (!response.data) {
      return null; // Event not found
    }
    
    return response.data;
  } catch (error) {
    if (error.message.includes('not found')) {
      return null;
    }
    console.error('Error updating event:', error);
    throw new Error(`Failed to update event: ${error.message}`);
  }
};

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} True if event was deleted, false if not found
 */
const deleteEvent = async (eventId) => {
  try {
    const response = await callDynamoDBLambda('delete', { eventId });
    
    if (response.success === false && response.error?.includes('not found')) {
      return false;
    }
    
    return response.success === true;
  } catch (error) {
    if (error.message.includes('not found')) {
      return false;
    }
    console.error('Error deleting event:', error);
    throw new Error(`Failed to delete event: ${error.message}`);
  }
};

/**
 * Update scores for an event (atomic operation)
 * @param {string} eventId - Event ID
 * @param {Array} scores - Array of score entries to replace the entire scores array
 * @returns {Promise<Object|null>} Updated event object or null if not found
 */
const updateScores = async (eventId, scores) => {
  try {
    const response = await callDynamoDBLambda('updateScores', {
      eventId,
      scores,
    });
    
    if (!response.data) {
      return null; // Event not found
    }
    
    return response.data;
  } catch (error) {
    if (error.message.includes('not found')) {
      return null;
    }
    console.error('Error updating scores:', error);
    throw new Error(`Failed to update scores: ${error.message}`);
  }
};

module.exports = {
  getAllEvents,
  getCompetitions,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  updateScores,
  generateEventId,
  generateTeamId,
};
