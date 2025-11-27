require('dotenv').config();

/**
 * AWS Configuration
 * Note: We use API Gateway → Lambda → AWS Services instead of direct AWS SDK
 * because AWS Academy doesn't allow IAM users/roles/access keys
 */

/**
 * API Gateway URL for file uploads
 * This endpoint triggers a Lambda function that uploads to S3
 */
const API_GATEWAY_UPLOAD_URL = process.env.API_GATEWAY_UPLOAD_URL;

/**
 * API Gateway URL for DynamoDB operations
 * This endpoint triggers a Lambda function that performs DynamoDB operations
 */
const API_GATEWAY_DYNAMODB_URL = process.env.API_GATEWAY_DYNAMODB_URL;

/**
 * API Gateway URL for SES email sending (DEPRECATED)
 * This endpoint is no longer used. Email is now sent via Nodemailer (SMTP).
 * See config/email.js for email configuration.
 * @deprecated Use Nodemailer with SMTP instead (see EMAIL_SETUP.md)
 */
const API_GATEWAY_SES_URL = process.env.API_GATEWAY_SES_URL;

/**
 * S3 bucket name (used by Lambda, not directly by backend)
 */
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * DynamoDB table name for Events (used by Lambda, not directly by backend)
 */
const EVENTS_TABLE_NAME = process.env.EVENTS_TABLE_NAME || 'Events';

/**
 * Admin email address (recipient for notifications)
 * @deprecated Moved to config/email.js - kept here for backward compatibility
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

/**
 * From email address
 * @deprecated Moved to config/email.js - kept here for backward compatibility
 */
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';

/**
 * Allowed file types for resume uploads
 */
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Allowed file extensions for resume uploads
 */
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

module.exports = {
  API_GATEWAY_UPLOAD_URL,
  API_GATEWAY_DYNAMODB_URL,
  API_GATEWAY_SES_URL,
  S3_BUCKET_NAME,
  EVENTS_TABLE_NAME,
  ADMIN_EMAIL,
  FROM_EMAIL,
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
};

