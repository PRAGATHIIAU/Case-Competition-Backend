const analyticsRepository = require('../repositories/analytics.repository');

/**
 * Analytics Service
 * Handles business logic for admin analytics endpoints.
 */

/**
 * Get basic platform statistics for admin dashboard.
 *
 * @returns {Promise<{totalStudents:number,totalAlumni:number,activeEvents:number,inactiveAlumniCount:number}>}
 */
const getBasicStats = async () => {
  try {
    const counts = await analyticsRepository.fetchCounts();
    return counts;
  } catch (error) {
    throw error;
  }
};

/**
 * Get student engagement statistics for admin dashboard.
 *
 * @returns {Promise<{activeStudents:number,inactiveStudents:number,avgProfileCompletion:number}>}
 */
const getStudentEngagement = async () => {
  try {
    const stats = await analyticsRepository.fetchStudentEngagement();
    return stats;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getBasicStats,
  getStudentEngagement,
  /**
   * Get alumni engagement statistics for admin dashboard.
   *
   * @returns {Promise<{totalAlumni:number,activeAlumni:number,inactiveAlumni:number,judgesThisMonth:number}>}
   */
  getAlumniEngagement: async () => {
    try {
      const stats = await analyticsRepository.fetchAlumniEngagement();
      return stats;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get list of inactive alumni for admin dashboard.
   *
   * @returns {Promise<Array<{id:number,name:string,email:string,lastLogin:string|null}>>}
   */
  getInactiveAlumni: async () => {
    try {
      return await analyticsRepository.fetchInactiveAlumni();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get feedback summary statistics for students & employers.
   *
   * @returns {Promise<{studentFeedbackCount:number,employerFeedbackCount:number,avgStudentRating:number,avgEmployerRating:number}>}
   */
  getFeedbackSummary: async () => {
    try {
      return await analyticsRepository.fetchFeedbackSummary();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get per-event engagement and performance summaries.
   *
   * @returns {Promise<Array<{eventId:string,title:string,teamCount:number,avgScore:number,registeredJudges:number}>>}
   */
  getEventSummaries: async () => {
    try {
      return await analyticsRepository.fetchEventSummaries();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get student-event trend statistics.
   *
   * @returns {Promise<{avgTeamsPerEvent:number,avgStudentsPerTeam:number,mostPopularEvent:null|{eventId:string,title:string,teamCount:number}}>} 
   */
  getStudentEventTrends: async () => {
    try {
      return await analyticsRepository.fetchStudentEventTrends();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get alumni role statistics (mentors, judges, sponsors, multi-role).
   *
   * @returns {Promise<{mentors:number,judges:number,sponsors:number,multiRole:number}>}
   */
  getAlumniRoles: async () => {
    try {
      return await analyticsRepository.fetchAlumniRoles();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get system health status for core dependencies.
   *
   * @returns {Promise<{postgresStatus:string,dynamoDBStatus:string,s3Status:string,lambdaStatus:string}>}
   */
  getSystemHealth: async () => {
    try {
      return await analyticsRepository.fetchSystemHealth();
    } catch (error) {
      throw error;
    }
  },
  /**
   * Get recent admin activity events (placeholder).
   *
   * @returns {Promise<Array<{adminId:string,action:string,timestamp:string}>>}
   */
  getAdminActivity: async () => {
    try {
      return await analyticsRepository.fetchAdminActivity();
    } catch (error) {
      throw error;
    }
  },
};


