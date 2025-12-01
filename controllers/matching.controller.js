const matchingService = require('../services/matching.service');
const { sendMentorNotification } = require('../services/email.service');

/**
 * Matching Controller
 * Handles HTTP requests and responses for mentor-mentee matching endpoints
 */

/**
 * GET /api/matching/mentors
 * Get all mentors (alumni willing to be mentors)
 */
const getAllMentors = async (req, res) => {
  console.log('-> triggered endpoint GET /api/matching/mentors');
  try {
    const mentors = await matchingService.getAllMentors();
    
    res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully',
      count: mentors.length,
      data: mentors,
    });
    console.log('-> finished endpoint execution GET /api/matching/mentors');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/matching/mentors');
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
  console.log('-> triggered endpoint GET /api/matching/mentees');
  try {
    const mentees = await matchingService.getAllMentees();
    
    res.status(200).json({
      success: true,
      message: 'Mentees retrieved successfully',
      count: mentees.length,
      data: mentees,
    });
    console.log('-> finished endpoint execution GET /api/matching/mentees');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/matching/mentees');
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
 * Query params:
 *   - testing: boolean (default: false) - If true, send emails to ADMIN_EMAIL instead of mentor emails
 */
const performMatching = async (req, res) => {
  console.log('-> triggered endpoint POST /api/matching/match');
  try {
    // Get testing parameter from query string
    const testing = req.query.testing === 'true' || req.query.testing === true;
    
    // Perform matching
    const result = await matchingService.performMatching();
    
    if (!result.success) {
      console.log('-> finished endpoint execution POST /api/matching/match');
      return res.status(400).json({
        success: false,
        message: result.message || 'Matching failed',
        data: result.matches || {},
      });
    }
    
    // If matching was successful and there are matches, send email notifications
    const emailResults = [];
    if (result.matches && Object.keys(result.matches).length > 0) {
      try {
        // Get full mentor and mentee data for mapping
        const [mentors, mentees] = await Promise.all([
          matchingService.getAllMentors(),
          matchingService.getAllMentees(),
        ]);
        
        // Create lookup maps
        const mentorMap = new Map(mentors.map(m => [String(m.id), m]));
        const menteeMap = new Map();
        
        // Handle both student_id (UUID) and id fields for mentees
        mentees.forEach(mentee => {
          if (mentee.student_id) {
            menteeMap.set(String(mentee.student_id), mentee);
          }
          if (mentee.id) {
            menteeMap.set(String(mentee.id), mentee);
          }
        });
        
        // Send emails to each mentor with their assigned mentees
        for (const [mentorIdStr, matchData] of Object.entries(result.matches)) {
          const mentor = mentorMap.get(mentorIdStr);
          if (!mentor) {
            console.warn(`Mentor ${mentorIdStr} not found in mentor map`);
            continue;
          }
          
          // Map mentee IDs to full mentee objects
          const fullMentees = matchData.mentees
            .map(assignedMentee => {
              const menteeId = String(assignedMentee.mentee_id);
              const fullMentee = menteeMap.get(menteeId);
              if (!fullMentee) {
                console.warn(`Mentee ${menteeId} not found in mentee map`);
                // Return partial data if full mentee not found
                return {
                  name: assignedMentee.mentee_name || 'Unknown Student',
                  email: assignedMentee.mentee_email || '',
                  linkedin_url: null,
                  skills: [],
                  aspirations: null,
                  parsed_resume: null,
                  major: null,
                };
              }
              return fullMentee;
            })
            .filter(mentee => mentee !== null); // Remove any null entries
          
          if (fullMentees.length === 0) {
            console.warn(`No valid mentees found for mentor ${mentorIdStr}`);
            continue;
          }
          
          try {
            // Send email notification
            const emailResult = await sendMentorNotification({
              mentor: {
                name: mentor.name || matchData.mentor_name || 'Mentor',
                email: mentor.email || matchData.mentor_email,
              },
              mentees: fullMentees,
              testing: testing,
            });
            
            emailResults.push({
              mentorId: mentorIdStr,
              mentorName: mentor.name,
              mentorEmail: testing ? 'ADMIN_EMAIL (testing)' : (mentor.email || 'No email'),
              menteeCount: fullMentees.length,
              emailSent: true,
              messageId: emailResult.MessageId,
            });
          } catch (emailError) {
            console.error(`Failed to send email to mentor ${mentorIdStr}:`, emailError);
            emailResults.push({
              mentorId: mentorIdStr,
              mentorName: mentor.name,
              mentorEmail: mentor.email || 'No email',
              menteeCount: fullMentees.length,
              emailSent: false,
              error: emailError.message,
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending mentor notification emails:', emailError);
        // Don't fail the entire request if email sending fails
        emailResults.push({
          error: 'Failed to send emails',
          details: emailError.message,
        });
      }
    }
    
    // Return matching results with email notification status
    res.status(200).json({
      success: true,
      message: result.message || 'Matching completed successfully',
      statistics: result.statistics,
      data: result.matches,
      emailNotifications: {
        sent: emailResults.filter(r => r.emailSent !== false).length,
        failed: emailResults.filter(r => r.emailSent === false).length,
        total: emailResults.length,
        testing: testing,
        results: emailResults,
      },
    });
    console.log('-> finished endpoint execution POST /api/matching/match');
  } catch (error) {
    console.log('-> finished endpoint execution POST /api/matching/match');
    console.error('Matching error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform matching',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/matching/mentor/:mentorId/similar-students
 * Get similar students for a specific mentor, ordered by similarity score
 */
const getSimilarStudentsForMentor = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/matching/mentor/:mentorId/similar-students`);
  try {
    const { mentorId } = req.params;
    const mentorIdNum = parseInt(mentorId);

    if (isNaN(mentorIdNum)) {
      console.log('-> finished endpoint execution GET /api/matching/mentor/:mentorId/similar-students');
      return res.status(400).json({
        success: false,
        message: 'Invalid mentor ID',
        error: 'Mentor ID must be a valid number',
      });
    }

    const studentScores = await matchingService.findSimilarStudentsForMentor(mentorIdNum);

    res.status(200).json({
      success: true,
      message: 'Similar students retrieved successfully',
      data: studentScores,
      count: studentScores.length,
    });
    console.log('-> finished endpoint execution GET /api/matching/mentor/:mentorId/similar-students');
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/matching/mentor/:mentorId/similar-students');
    console.error('Get similar students for mentor error:', error);
    if (error.message === 'Mentor not found') {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found',
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve similar students',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  getAllMentors,
  getAllMentees,
  performMatching,
  getSimilarStudentsForMentor
};

