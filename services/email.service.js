require('dotenv').config();
const nodemailer = require('nodemailer');
const { EMAIL_CONFIG, ADMIN_EMAIL, FROM_EMAIL } = require('../config/email');

/**
 * Email Service
 * Handles sending emails via Nodemailer (Gmail SMTP or other SMTP providers)
 * 
 * This is a free alternative to AWS SES, suitable for AWS Academy accounts
 * that don't have access to SES.
 */

// Create reusable transporter object using SMTP transport
let transporter = null;

/**
 * Initialize email transporter
 * @returns {Object} Nodemailer transporter
 */
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!EMAIL_CONFIG) {
    throw new Error(
      'Email configuration is not set. ' +
      'Please configure SMTP settings in your .env file. ' +
      'See EMAIL_SETUP.md for instructions.'
    );
  }

  transporter = nodemailer.createTransport(EMAIL_CONFIG);
  return transporter;
};

/**
 * Send email notification to admin about alumni judge interest
 * @param {Object} params - Email parameters
 * @param {string} params.alumniEmail - Email of the alumni who registered
 * @param {string} params.alumniName - Name of the alumni (optional)
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.preferredDateTime - Preferred date and time (optional)
 * @param {string} params.preferredLocation - Preferred location (optional)
 * @returns {Promise<Object>} Email send response
 */
const sendJudgeInterestNotification = async ({
  alumniEmail,
  alumniName = 'Alumni',
  eventId,
  eventTitle,
  preferredDateTime,
  preferredLocation,
}) => {
  if (!ADMIN_EMAIL || !FROM_EMAIL) {
    throw new Error(
      'ADMIN_EMAIL and FROM_EMAIL must be configured in your .env file.'
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(alumniEmail)) {
    throw new Error('Invalid alumni email format');
  }

  try {
    const emailTransporter = getTransporter();
    
    const subject = `New Judge Interest: ${eventTitle}`;
    
    const htmlBody = `
      <html>
        <body>
          <h2>New Judge Interest Notification</h2>
          <p>An alumni has expressed interest in participating as a judge for an event.</p>
          
          <h3>Event Details:</h3>
          <ul>
            <li><strong>Event ID:</strong> ${eventId}</li>
            <li><strong>Event Title:</strong> ${eventTitle}</li>
          </ul>
          
          <h3>Alumni Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${alumniName}</li>
            <li><strong>Email:</strong> ${alumniEmail}</li>
          </ul>
          
          <h3>Preferences:</h3>
          <ul>
            <li><strong>Preferred Date/Time:</strong> ${preferredDateTime || 'Not specified'}</li>
            <li><strong>Preferred Location:</strong> ${preferredLocation || 'Not specified'}</li>
          </ul>
          
          <p>Please review and contact the alumni to confirm their participation.</p>
        </body>
      </html>
    `;
    
    const textBody = `
New Judge Interest Notification

An alumni has expressed interest in participating as a judge for an event.

Event Details:
- Event ID: ${eventId}
- Event Title: ${eventTitle}

Alumni Details:
- Name: ${alumniName}
- Email: ${alumniEmail}

Preferences:
- Preferred Date/Time: ${preferredDateTime || 'Not specified'}
- Preferred Location: ${preferredLocation || 'Not specified'}

Please review and contact the alumni to confirm their participation.
    `;

    const mailOptions = {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: alumniEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return {
      MessageId: info.messageId,
      success: true,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your SMTP credentials (EMAIL_USER and EMAIL_PASSWORD).';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'SMTP connection timed out. Please check your network connection and SMTP settings.';
    }
    
    throw new Error(`Failed to send email: ${errorMessage}`);
  }
};

/**
 * Find the most common interest between mentor and student
 * Checks skills, major, projects, and relevant coursework
 * @param {Object} mentor - Mentor object with profile data
 * @param {Object} student - Student object with profile data
 * @returns {string|null} Most common interest or null if none found
 */
const findMostCommonInterest = (mentor, student) => {
  // Normalize strings for comparison (lowercase, trim)
  const normalize = (str) => String(str || '').toLowerCase().trim();
  
  // Check skills first (most specific)
  const mentorSkills = (mentor.skills || []).map(s => normalize(s));
  const studentSkills = (student.skills || []).map(s => normalize(s));
  
  // Find common skills
  const commonSkills = mentorSkills.filter(skill => 
    studentSkills.some(studentSkill => 
      studentSkill.includes(skill) || skill.includes(studentSkill) ||
      studentSkill === skill
    )
  );
  
  if (commonSkills.length > 0) {
    // Return the first common skill (most relevant)
    return commonSkills[0].charAt(0).toUpperCase() + commonSkills[0].slice(1);
  }
  
  // Check major
  const mentorMajor = normalize(mentor.major || '');
  const studentMajor = normalize(student.major || '');
  
  if (mentorMajor && studentMajor && 
      (mentorMajor.includes(studentMajor) || studentMajor.includes(mentorMajor) || mentorMajor === studentMajor)) {
    return studentMajor.charAt(0).toUpperCase() + studentMajor.slice(1);
  }
  
  // Check relevant coursework (for students)
  const studentCoursework = (student.relevant_coursework || []).map(c => normalize(c));
  const courseworkMatch = studentCoursework.find(course => 
    mentorSkills.some(skill => 
      course.includes(skill) || skill.includes(course)
    )
  );
  
  if (courseworkMatch) {
    return courseworkMatch.charAt(0).toUpperCase() + courseworkMatch.slice(1);
  }
  
  // Check if mentor has experiences/projects that match student interests
  // Extract technologies from mentor projects
  const mentorProjectTechs = [];
  if (mentor.projects && Array.isArray(mentor.projects)) {
    mentor.projects.forEach(project => {
      if (typeof project === 'object' && project !== null) {
        Object.values(project).forEach(value => {
          if (typeof value === 'string') {
            const techs = value.toLowerCase().split(/[\s,]+/);
            mentorProjectTechs.push(...techs);
          }
        });
      }
    });
  }
  
  // Check if any student skill matches mentor project techs
  for (const studentSkill of studentSkills) {
    if (mentorProjectTechs.some(tech => tech.includes(studentSkill) || studentSkill.includes(tech))) {
      return studentSkill.charAt(0).toUpperCase() + studentSkill.slice(1);
    }
  }
  
  return null;
};

/**
 * Extract brief summary from mentee profile (1-2 lines max)
 * @param {Object} mentee - Mentee object with profile data
 * @returns {string} Brief summary text
 */
const extractMenteeSummary = (mentee) => {
  // Priority order: aspirations > parsed_resume summary > skills > major
  if (mentee.aspirations && mentee.aspirations.trim()) {
    const aspirations = mentee.aspirations.trim();
    // Take first 150 characters or first sentence
    const firstSentence = aspirations.split(/[.!?]/)[0];
    if (firstSentence.length <= 150) {
      return firstSentence;
    }
    return aspirations.substring(0, 147) + '...';
  }
  
  if (mentee.parsed_resume && mentee.parsed_resume.summary) {
    const summary = mentee.parsed_resume.summary.trim();
    if (summary.length <= 150) {
      return summary;
    }
    return summary.substring(0, 147) + '...';
  }
  
  if (mentee.skills && Array.isArray(mentee.skills) && mentee.skills.length > 0) {
    const topSkills = mentee.skills.slice(0, 3).join(', ');
    const major = mentee.major ? ` (${mentee.major})` : '';
    return `Interested in ${topSkills}${major}`;
  }
  
  if (mentee.major) {
    return `Student majoring in ${mentee.major}`;
  }
  
  return 'Student seeking mentorship';
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Format email body for mentor notification (single student)
 * @param {Object} params - Email parameters
 * @param {string} params.mentorName - Mentor's name
 * @param {Object} params.mentor - Full mentor object with profile data
 * @param {Object} params.student - Single student object with full profile data
 * @param {string} params.commonInterest - Most common interest between mentor and student
 * @returns {Object} Object with html and text email bodies
 */
const formatMentorNotificationEmail = ({ mentorName, mentor, student, commonInterest }) => {
  const studentName = student.name || 'a student';
  const linkedinUrl = student.linkedin_url || null;
  const linkedinDisplay = linkedinUrl 
    ? `<a href="${escapeHtml(linkedinUrl)}" style="color: #0077b5; text-decoration: none;">LinkedIn Profile</a>`
    : 'Not provided';
  
  // Build personalized greeting based on common interest
  const greetingHtml = `Howdy ${escapeHtml(mentorName)}`;
  const greetingText = `Howdy ${mentorName}`;
  
  let interestPhraseHtml = '';
  let interestPhraseText = '';
  
  if (commonInterest) {
    interestPhraseHtml = `since you work in ${escapeHtml(commonInterest)}`;
    interestPhraseText = `since you work in ${commonInterest}`;
  } else {
    // Fallback: try to use mentor's field/domain
    const mentorField = mentor.major || 
                        (mentor.skills && mentor.skills.length > 0 ? mentor.skills[0] : null) ||
                        'your field';
    interestPhraseHtml = `based on your background in ${escapeHtml(mentorField)}`;
    interestPhraseText = `based on your background in ${mentorField}`;
  }
  
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="font-size: 16px;">${greetingHtml}, ${interestPhraseHtml}, would you mentor ${escapeHtml(studentName)}?</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">About ${escapeHtml(studentName)}:</h3>
          ${student.major ? `<p><strong>Major:</strong> ${escapeHtml(student.major)}</p>` : ''}
          ${student.skills && student.skills.length > 0 ? `<p><strong>Skills:</strong> ${escapeHtml(student.skills.slice(0, 5).join(', '))}</p>` : ''}
          ${student.aspirations ? `<p><strong>Aspirations:</strong> ${escapeHtml(student.aspirations.substring(0, 200))}${student.aspirations.length > 200 ? '...' : ''}</p>` : ''}
          <p><strong>LinkedIn:</strong> ${linkedinDisplay}</p>
        </div>
        
        <p style="margin-top: 20px;">Please reply to this email if you're interested in mentoring ${escapeHtml(studentName)}.</p>
        
        <p style="margin-top: 20px;">Thank you,<br>Mentorship Program Team</p>
      </body>
    </html>
  `;
  
  const textBody = `${greetingText}, ${interestPhraseText}, would you mentor ${studentName}?

About ${studentName}:
${student.major ? `Major: ${student.major}` : ''}
${student.skills && student.skills.length > 0 ? `Skills: ${student.skills.slice(0, 5).join(', ')}` : ''}
${student.aspirations ? `Aspirations: ${student.aspirations.substring(0, 200)}${student.aspirations.length > 200 ? '...' : ''}` : ''}
LinkedIn: ${linkedinUrl || 'Not provided'}

Please reply to this email if you're interested in mentoring ${studentName}.

Thank you,
Mentorship Program Team`;
  
  return { htmlBody, textBody };
};

/**
 * Send mentor notification email about a single assigned student
 * @param {Object} params - Email parameters
 * @param {Object} params.mentor - Mentor object (name, email, and full profile data)
 * @param {Object} params.student - Single student object with full profile data
 * @param {boolean} params.testing - If true, send to ADMIN_EMAIL instead of mentor email
 * @returns {Promise<Object>} Email send response
 */
const sendMentorNotification = async ({
  mentor,
  student,
  testing = false,
}) => {
  if (!ADMIN_EMAIL || !FROM_EMAIL) {
    throw new Error(
      'ADMIN_EMAIL and FROM_EMAIL must be configured in your .env file.'
    );
  }

  if (!mentor || !mentor.name) {
    throw new Error('Mentor name is required');
  }

  if (!student) {
    throw new Error('Student is required');
  }

  // Determine recipient email
  const recipientEmail = testing ? ADMIN_EMAIL : (mentor.email || ADMIN_EMAIL);
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    throw new Error(`Invalid recipient email format: ${recipientEmail}`);
  }

  try {
    const emailTransporter = getTransporter();
    
    // Find most common interest between mentor and student
    const commonInterest = findMostCommonInterest(mentor, student);
    
    const studentName = student.name || 'a student';
    const subject = `Mentorship Request – Would you mentor ${studentName}?`;
    
    // Format email body
    const { htmlBody, textBody } = formatMentorNotificationEmail({
      mentorName: mentor.name,
      mentor: mentor,
      student: student,
      commonInterest: commonInterest,
    });

    const mailOptions = {
      from: FROM_EMAIL,
      to: recipientEmail,
      replyTo: FROM_EMAIL,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    // If testing, add note in subject
    if (testing) {
      mailOptions.subject = `[TEST] ${subject} - For: ${mentor.name} (${mentor.email || 'No email'})`;
    }

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully to ${testing ? 'ADMIN (testing mode)' : recipientEmail}:`, info.messageId);
    return {
      MessageId: info.messageId,
      success: true,
      recipient: recipientEmail,
      testing: testing,
      studentName: studentName,
      commonInterest: commonInterest,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your SMTP credentials (EMAIL_USER and EMAIL_PASSWORD).';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'SMTP connection timed out. Please check your network connection and SMTP settings.';
    }
    
    throw new Error(`Failed to send email: ${errorMessage}`);
  }
};

module.exports = {
  sendJudgeInterestNotification,
  sendMentorNotification,
  extractMenteeSummary,
  formatMentorNotificationEmail,
  findMostCommonInterest,
  ADMIN_EMAIL,
  FROM_EMAIL,
};
