const matchingService = require('../services/matching.service');

/**
 * Matching Controller
 * Handles HTTP requests and responses for mentor-mentee matching endpoints
 */

/**
 * GET /api/matching/mentors
 * Get all mentors (alumni willing to be mentors)
 */
const getAllMentors = async (req, res) => {
  try {
    const mentors = await matchingService.getAllMentors();
    
    res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully',
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentors',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/matching/mentees
 * Get all mentees (students)
 */
const getAllMentees = async (req, res) => {
  try {
    const mentees = await matchingService.getAllMentees();
    
    res.status(200).json({
      success: true,
      message: 'Mentees retrieved successfully',
      count: mentees.length,
      data: mentees,
    });
  } catch (error) {
    console.error('Get mentees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentees',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * POST /api/matching/match
 * Perform mentor-mentee matching
 */
const performMatching = async (req, res) => {
  try {
    const result = await matchingService.performMatching();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message || 'Matching completed successfully',
        statistics: result.statistics,
        data: result.matches,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Matching failed',
        data: result.matches || {},
      });
    }
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform matching',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  getAllMentors,
  getAllMentees,
  performMatching
};

