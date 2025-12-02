const adminRepository = require('../repositories/admin.repository');
const analyticsService = require('./analytics.service');
const eventRepository = require('../repositories/event.repository');

/**
 * Faculty Service
 * Provides faculty-specific aggregations using existing repositories/services.
 */

/**
 * Build dashboard data for a faculty member.
 * @param {number} adminId
 * @returns {Promise<Object>}
 */
const getFacultyDashboardData = async (adminId) => {
  const profile = await adminRepository.getAdminById(adminId);
  if (!profile) {
    throw new Error('Admin not found');
  }

  const [basicStats, alumniEngagement] = await Promise.all([
    analyticsService.getBasicStats(),
    analyticsService.getAlumniEngagement(),
  ]);

  return {
    profile,
    stats: basicStats,
    alumniEngagement,
  };
};

/**
 * Extended reporting data for faculty insights.
 * @returns {Promise<Object>}
 */
const getExtendedReports = async () => {
  const [eventSummaries, studentTrends, alumniRoles] = await Promise.all([
    analyticsService.getEventSummaries(),
    analyticsService.getStudentEventTrends(),
    analyticsService.getAlumniRoles(),
  ]);

  return {
    eventSummaries,
    studentTrends,
    alumniRoles,
  };
};

/**
 * Identify pending review items from events (e.g., judges awaiting approval).
 * @returns {Promise<Array>}
 */
const getPendingReviewItems = async () => {
  const events = await eventRepository.getAllEvents();

  const pending = (events || []).flatMap((event) => {
    const pendingJudges = (event.judges || [])
      .filter((judge) => judge.status && judge.status !== 'approved')
      .map((judge) => ({
        type: 'judgeApproval',
        eventId: event.eventId,
        eventTitle: event.title || event?.eventInfo?.name || 'Untitled Event',
        judgeId: judge.judgeId,
        status: judge.status,
      }));

    return pendingJudges;
  });

  return pending;
};

module.exports = {
  getFacultyDashboardData,
  getExtendedReports,
  getPendingReviewItems,
};

