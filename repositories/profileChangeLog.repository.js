const pool = require('../config/db');
const { ProfileChangeLogModel } = require('../models/profileChangeLog.model');

/**
 * Profile Change Log Repository
 * Handles logging of user profile changes
 */

/**
 * Log a user profile change
 * @param {string} userId - User ID (can be number for alumni or UUID for students)
 * @param {string} changeType - 'CREATE' or 'UPDATE'
 * @returns {Promise<Object>} Created log entry
 */
const logUserProfileChange = async (userId, changeType) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (changeType !== ProfileChangeLogModel.CHANGE_TYPES.CREATE && 
      changeType !== ProfileChangeLogModel.CHANGE_TYPES.UPDATE) {
    throw new Error('Change type must be CREATE or UPDATE');
  }

  const query = `
    INSERT INTO ${ProfileChangeLogModel.TABLE_NAME} (user_id, change_type)
    VALUES ($1, $2)
    RETURNING id, user_id, change_type, timestamp
  `;

  try {
    const result = await pool.query(query, [String(userId), changeType]);
    return result.rows[0];
  } catch (error) {
    console.error('Error logging profile change:', error);
    throw error;
  }
};

/**
 * Get count of changes in the last 24 hours
 * @returns {Promise<number>} Count of changes
 */
const getChangesCountLast24Hours = async () => {
  const query = `
    SELECT COUNT(*) as count
    FROM ${ProfileChangeLogModel.TABLE_NAME}
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
  `;

  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error getting changes count:', error);
    throw error;
  }
};

/**
 * Clear all log entries
 * @returns {Promise<number>} Number of deleted entries
 */
const clearAllLogs = async () => {
  const query = `
    DELETE FROM ${ProfileChangeLogModel.TABLE_NAME}
    RETURNING id
  `;

  try {
    const result = await pool.query(query);
    return result.rows.length;
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw error;
  }
};

/**
 * Clear log entries older than specified hours
 * @param {number} hours - Number of hours to keep
 * @returns {Promise<number>} Number of deleted entries
 */
const clearOldLogs = async (hours = 48) => {
  const query = `
    DELETE FROM ${ProfileChangeLogModel.TABLE_NAME}
    WHERE timestamp < NOW() - INTERVAL '${hours} hours'
    RETURNING id
  `;

  try {
    const result = await pool.query(query);
    return result.rows.length;
  } catch (error) {
    console.error('Error clearing old logs:', error);
    throw error;
  }
};

module.exports = {
  logUserProfileChange,
  getChangesCountLast24Hours,
  clearAllLogs,
  clearOldLogs,
};

