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
 * @param {string} params.preferredDateTime - Preferred date and time
 * @param {string} params.preferredLocation - Preferred location
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
            <li><strong>Preferred Date/Time:</strong> ${preferredDateTime}</li>
            <li><strong>Preferred Location:</strong> ${preferredLocation}</li>
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
- Preferred Date/Time: ${preferredDateTime}
- Preferred Location: ${preferredLocation}

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
 * Format email body for mentor notification
 * @param {Object} params - Email parameters
 * @param {string} params.mentorName - Mentor's name
 * @param {Array} params.mentees - Array of mentee objects with full profile data
 * @returns {Object} Object with html and text email bodies
 */
const formatMentorNotificationEmail = ({ mentorName, mentees }) => {
  // Build mentee list HTML
  let menteeListHtml = '';
  let menteeListText = '';
  
  mentees.forEach((mentee, index) => {
    const summary = extractMenteeSummary(mentee);
    const linkedinUrl = mentee.linkedin_url || 'Not provided';
    const linkedinDisplay = linkedinUrl !== 'Not provided' 
      ? `<a href="${escapeHtml(linkedinUrl)}">${escapeHtml(linkedinUrl)}</a>`
      : 'Not provided';
    
    const menteeName = mentee.name || 'Unknown Student';
    
    menteeListHtml += `
      <li style="margin-bottom: 15px;">
        <strong>${escapeHtml(menteeName)}</strong><br>
        <span style="color: #666; font-size: 14px;">Summary: ${escapeHtml(summary)}</span><br>
        <span style="color: #666; font-size: 14px;">LinkedIn: ${linkedinDisplay}</span>
      </li>
    `;
    
    menteeListText += `
• ${menteeName}
  - Summary: ${summary}
  - LinkedIn: ${linkedinUrl}
`;
  });
  
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi ${escapeHtml(mentorName)},</p>
        
        <p>Based on your profile and interests, we have identified the following students who closely align with your background. Please review their details and confirm if you're willing to mentor them.</p>
        
        <ul style="list-style-type: none; padding-left: 0;">
          ${menteeListHtml}
        </ul>
        
        <p>Please reply to this email or click the provided link to confirm your participation as a mentor.</p>
        
        <p>Thank you,<br>Mentorship Program Team</p>
      </body>
    </html>
  `;
  
  const textBody = `Hi ${mentorName},

Based on your profile and interests, we have identified the following students who closely align with your background. Please review their details and confirm if you're willing to mentor them.

${menteeListText}

Please reply to this email or click the provided link to confirm your participation as a mentor.

Thank you,
Mentorship Program Team`;
  
  return { htmlBody, textBody };
};

/**
 * Send mentor notification email about assigned mentees
 * @param {Object} params - Email parameters
 * @param {Object} params.mentor - Mentor object (name, email, etc.)
 * @param {Array} params.mentees - Array of mentee objects with full profile data (name, bio/summary, LinkedIn handle)
 * @param {boolean} params.testing - If true, send to ADMIN_EMAIL instead of mentor email
 * @returns {Promise<Object>} Email send response
 */
const sendMentorNotification = async ({
  mentor,
  mentees,
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

  if (!mentees || !Array.isArray(mentees) || mentees.length === 0) {
    throw new Error('At least one mentee is required');
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
    
    const subject = 'Mentorship Request – Review Assigned Students';
    
    // Format email body
    const { htmlBody, textBody } = formatMentorNotificationEmail({
      mentorName: mentor.name,
      mentees: mentees,
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
  ADMIN_EMAIL,
  FROM_EMAIL,
};
