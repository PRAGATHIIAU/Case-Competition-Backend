const facultyService = require('../services/faculty.service');

/**
 * GET /faculty/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const data = await facultyService.getFacultyDashboardData(adminId);

    res.status(200).json({
      success: true,
      message: 'Faculty dashboard data retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Faculty dashboard error:', error);
    if (error.message === 'Admin not found') {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve faculty dashboard data',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /faculty/reports
 */
const getExtendedReports = async (req, res) => {
  try {
    const reports = await facultyService.getExtendedReports();

    res.status(200).json({
      success: true,
      message: 'Faculty reports retrieved successfully',
      data: reports,
    });
  } catch (error) {
    console.error('Faculty reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve faculty reports',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /faculty/reviews/pending
 */
const getPendingReviewItems = async (req, res) => {
  try {
    const items = await facultyService.getPendingReviewItems();

    res.status(200).json({
      success: true,
      message: 'Pending review items retrieved successfully',
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Faculty pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending review items',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  getDashboard,
  getExtendedReports,
  getPendingReviewItems,
};

