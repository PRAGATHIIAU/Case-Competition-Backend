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

module.exports = {
  sendJudgeInterestNotification,
  ADMIN_EMAIL,
  FROM_EMAIL,
};
