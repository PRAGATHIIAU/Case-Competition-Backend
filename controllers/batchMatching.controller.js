const batchMatchingService = require('../services/batchMatching.service');

/**
 * Batch Matching Controller
 * Handles batch processing endpoints for N8N and frontend
 */

/**
 * GET /api/matching/check-changes
 * Check if there are profile changes in the last 24 hours
 */
const checkChanges = async (req, res) => {
  console.log('-> triggered endpoint GET /api/matching/check-changes');
  try {
    const changesCount = await batchMatchingService.getChangesCountLast24Hours();
    
    res.status(200).json({
      success: true,
      changesCount,
      hasChanges: changesCount > 0,
      message: changesCount > 0 
        ? `Found ${changesCount} profile changes in the last 24 hours`
        : 'No profile changes in the last 24 hours',
    });
  } catch (error) {
    console.error('Check changes error:', error);
    console.log('-> finished endpoint execution GET /api/matching/check-changes');
    res.status(500).json({
      success: false,
      message: 'Failed to check changes',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * POST /api/matching/run-batch
 * Run batch matching process (called by N8N)
 */
const runBatch = async (req, res) => {
  console.log('-> triggered endpoint POST /api/matching/run-batch');
  try {
    const result = await batchMatchingService.runBatchMatching();
    
    console.log('-> finished endpoint execution POST /api/matching/run-batch');
    res.status(200).json(result);
  } catch (error) {
    console.error('Batch matching error:', error);
    console.log('-> finished endpoint execution POST /api/matching/run-batch');
    res.status(500).json({
      success: false,
      message: 'Batch matching failed',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * POST /api/matching/clear-log
 * Clear all profile change logs (called by N8N after batch processing)
 */
const clearLog = async (req, res) => {
  console.log('-> triggered endpoint POST /api/matching/clear-log');
  try {
    const deletedCount = await batchMatchingService.clearAllLogs();
    
    console.log('-> finished endpoint execution POST /api/matching/clear-log');
    res.status(200).json({
      success: true,
      message: `Cleared ${deletedCount} log entries`,
      deletedCount,
    });
  } catch (error) {
    console.error('Clear log error:', error);
    console.log('-> finished endpoint execution POST /api/matching/clear-log');
    res.status(500).json({
      success: false,
      message: 'Failed to clear logs',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/matching/recommendations/:studentId
 * Get recommendations for a student (assigned mentor + similarity scores)
 */
const getRecommendations = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/matching/recommendations/${req.params.studentId}`);
  try {
    const { studentId } = req.params;
    const recommendations = await batchMatchingService.getStudentRecommendations(studentId);
    
    console.log('-> finished endpoint execution GET /api/matching/recommendations/:studentId');
    res.status(200).json({
      success: true,
      message: 'Recommendations retrieved successfully',
      data: recommendations,
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    console.log('-> finished endpoint execution GET /api/matching/recommendations/:studentId');
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/matching/assigned/:studentId
 * Get assignment details for a student
 */
const getAssigned = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/matching/assigned/${req.params.studentId}`);
  try {
    const { studentId } = req.params;
    const assignment = await batchMatchingService.getStudentAssignment(studentId);
    
    console.log('-> finished endpoint execution GET /api/matching/assigned/:studentId');
    res.status(200).json({
      success: true,
      message: 'Assignment retrieved successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    console.log('-> finished endpoint execution GET /api/matching/assigned/:studentId');
    res.status(500).json({
      success: false,
      message: 'Failed to get assignment',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  checkChanges,
  runBatch,
  clearLog,
  getRecommendations,
  getAssigned,
};

