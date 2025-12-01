const analyticsService = require('../services/analytics.service');

/**
 * Analytics Controller
 * Handles HTTP requests and responses for admin analytics endpoints.
 */

/**
 * GET /admin/analytics/basic-stats
 *
 * Returns basic platform statistics for the admin dashboard:
 * {
 *   "totalStudents": number,
 *   "totalAlumni": number,
 *   "activeEvents": number,
 *   "inactiveAlumniCount": number
 * }
 */
const getBasicStats = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/basic-stats');
  try {
    const stats = await analyticsService.getBasicStats();

    // Return exactly the shape requested in the spec
    console.log('-> finished endpoint execution GET /admin/analytics/basic-stats');
    return res.status(200).json({
      totalStudents: stats.totalStudents,
      totalAlumni: stats.totalAlumni,
      activeEvents: stats.activeEvents,
      inactiveAlumniCount: stats.inactiveAlumniCount,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/basic-stats');
    console.error('Get basic analytics stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve basic analytics statistics',
      error: error.message || 'An error occurred while retrieving basic stats',
    });
  }
};

/**
 * GET /admin/analytics/student-engagement
 *
 * Returns student engagement statistics for the admin dashboard:
 * {
 *   "activeStudents": number,     // last_login within last 30 days
 *   "inactiveStudents": number,   // last_login older than 60 days
 *   "avgProfileCompletion": number
 * }
 */
const getStudentEngagement = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/student-engagement');
  try {
    const stats = await analyticsService.getStudentEngagement();

    console.log('-> finished endpoint execution GET /admin/analytics/student-engagement');
    return res.status(200).json({
      activeStudents: stats.activeStudents,
      inactiveStudents: stats.inactiveStudents,
      avgProfileCompletion: stats.avgProfileCompletion,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/student-engagement');
    console.error('Get student engagement analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student engagement statistics',
      error: error.message || 'An error occurred while retrieving student engagement stats',
    });
  }
};

/**
 * GET /admin/analytics/alumni-engagement
 *
 * Returns alumni engagement statistics for the admin dashboard:
 * {
 *   "totalAlumni": number,
 *   "activeAlumni": number,   // last_login within last 45 days
 *   "inactiveAlumni": number,
 *   "judgesThisMonth": number
 * }
 */
const getAlumniEngagement = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/alumni-engagement');
  try {
    const stats = await analyticsService.getAlumniEngagement();

    console.log('-> finished endpoint execution GET /admin/analytics/alumni-engagement');
    return res.status(200).json({
      totalAlumni: stats.totalAlumni,
      activeAlumni: stats.activeAlumni,
      inactiveAlumni: stats.inactiveAlumni,
      judgesThisMonth: stats.judgesThisMonth,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/alumni-engagement');
    console.error('Get alumni engagement analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alumni engagement statistics',
      error: error.message || 'An error occurred while retrieving alumni engagement stats',
    });
  }
};

/**
 * GET /admin/analytics/inactive-alumni
 *
 * Returns a list of inactive alumni:
 * [
 *   { "id": string, "name": string, "email": string, "lastLogin": string }
 * ]
 *
 * Inactive = last_login older than 60 days.
 */
const getInactiveAlumni = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/inactive-alumni');
  try {
    const list = await analyticsService.getInactiveAlumni();
    console.log('-> finished endpoint execution GET /admin/analytics/inactive-alumni');
    return res.status(200).json(list);
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/inactive-alumni');
    console.error('Get inactive alumni analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inactive alumni',
      error: error.message || 'An error occurred while retrieving inactive alumni',
    });
  }
};

/**
 * GET /admin/analytics/feedback-summary
 *
 * Returns summary counts and average ratings for students & employers:
 * {
 *   "studentFeedbackCount": number,
 *   "employerFeedbackCount": number,
 *   "avgStudentRating": number,
 *   "avgEmployerRating": number
 * }
 *
 * If the "feedback" table or required columns do not exist, returns zeros
 * and logs a TODO in the server logs.
 */
const getFeedbackSummary = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/feedback-summary');
  // Note: This endpoint currently only returns data from the "feedback" table.
  // Future enhancements can join with students (last_login) and student_profiles
  // to add richer engagement context.
  try {
    const summary = await analyticsService.getFeedbackSummary();

    console.log('-> finished endpoint execution GET /admin/analytics/feedback-summary');
    return res.status(200).json({
      studentFeedbackCount: summary.studentFeedbackCount,
      employerFeedbackCount: summary.employerFeedbackCount,
      avgStudentRating: summary.avgStudentRating,
      avgEmployerRating: summary.avgEmployerRating,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/feedback-summary');
    console.error('Get feedback summary analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback summary statistics',
      error: error.message || 'An error occurred while retrieving feedback summary',
    });
  }
};

/**
 * GET /admin/analytics/events/summary
 *
 * Returns event-level engagement & performance summaries:
 * [
 *   {
 *     "eventId": string,
 *     "title": string,
 *     "teamCount": number,
     "avgScore": number,
     "registeredJudges": number
 *   }
 * ]
 *
 * Data source: DynamoDB Events table (via eventRepository.getAllEvents()).
 */
const getEventSummaries = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/events/summary');
  try {
    const summaries = await analyticsService.getEventSummaries();
    console.log('-> finished endpoint execution GET /admin/analytics/events/summary');
    return res.status(200).json(summaries);
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/events/summary');
    console.error('Get event summaries analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event summaries',
      error: error.message || 'An error occurred while retrieving event summaries',
    });
  }
};

/**
 * GET /admin/analytics/student-event-trends
 *
 * Shows how many students and teams engage across events:
 * {
 *   "avgTeamsPerEvent": number,
 *   "avgStudentsPerTeam": number,
 *   "mostPopularEvent": {
 *     "eventId": string,
 *     "title": string,
 *     "teamCount": number
 *   }
 * }
 *
 * Data source: DynamoDB Events table (via eventRepository.getAllEvents()).
 */
const getStudentEventTrends = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/student-event-trends');
  try {
    const stats = await analyticsService.getStudentEventTrends();

    console.log('-> finished endpoint execution GET /admin/analytics/student-event-trends');
    return res.status(200).json({
      avgTeamsPerEvent: stats.avgTeamsPerEvent,
      avgStudentsPerTeam: stats.avgStudentsPerTeam,
      mostPopularEvent: stats.mostPopularEvent,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/student-event-trends');
    console.error('Get student-event trends analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student-event trend statistics',
      error: error.message || 'An error occurred while retrieving student-event trends',
    });
  }
};

/**
 * GET /admin/analytics/alumni-roles
 *
 * Returns counts of alumni roles based on willingness flags:
 * {
 *   "mentors": number,
 *   "judges": number,
 *   "sponsors": number,
 *   "multiRole": number
 * }
 *
 * Data source: users table (willing_to_be_mentor, willing_to_be_judge, willing_to_be_sponsor).
 */
const getAlumniRoles = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/alumni-roles');
  try {
    const stats = await analyticsService.getAlumniRoles();

    console.log('-> finished endpoint execution GET /admin/analytics/alumni-roles');
    return res.status(200).json({
      mentors: stats.mentors,
      judges: stats.judges,
      sponsors: stats.sponsors,
      multiRole: stats.multiRole,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/alumni-roles');
    console.error('Get alumni roles analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alumni role statistics',
      error: error.message || 'An error occurred while retrieving alumni roles',
    });
  }
};

/**
 * GET /admin/analytics/system-health
 *
 * Returns high-level status for core dependencies:
 * {
 *   "postgresStatus": "UP" | "DOWN",
 *   "dynamoDBStatus": "UP" | "DOWN",
 *   "s3Status": "UP" | "DOWN",
 *   "lambdaStatus": "UP" | "DOWN"
 * }
 */
const getSystemHealth = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/system-health');
  try {
    const health = await analyticsService.getSystemHealth();
    console.log('-> finished endpoint execution GET /admin/analytics/system-health');
    return res.status(200).json(health);
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/system-health');
    console.error('Get system health analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health',
      error: error.message || 'An error occurred while retrieving system health',
    });
  }
};

/**
 * GET /admin/analytics/admin-activity
 *
 * Returns a lightweight placeholder list of recent admin actions:
 * {
 *   "recentActions": [
 *     { "adminId": "id", "action": "updated event status", "timestamp": "2024-12-01T05:00:00Z" }
 *   ]
 * }
 *
 * TODO: Wire this up to a real admin activity/audit log in the database.
 */
const getAdminActivity = async (req, res) => {
  console.log('-> triggered endpoint GET /admin/analytics/admin-activity');
  try {
    const actions = await analyticsService.getAdminActivity();

    console.log('-> finished endpoint execution GET /admin/analytics/admin-activity');
    return res.status(200).json({
      recentActions: actions,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /admin/analytics/admin-activity');
    console.error('Get admin activity analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin activity',
      error: error.message || 'An error occurred while retrieving admin activity',
    });
  }
};

module.exports = {
  getBasicStats,
  getStudentEngagement,
  getAlumniEngagement,
  getInactiveAlumni,
  getFeedbackSummary,
  getEventSummaries,
  getStudentEventTrends,
  getAlumniRoles,
  getAdminActivity,
  getSystemHealth,
};


