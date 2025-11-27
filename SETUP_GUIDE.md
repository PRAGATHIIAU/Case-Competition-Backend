# Setup Guide: Complete Backend Setup

This guide provides an overview of the complete setup process for the Case Competition Backend.

## Architecture Overview

```
Backend (Node.js/Express)
├── PostgreSQL Database (User data, authentication)
├── API Gateway → Lambda → S3 (File uploads)
├── API Gateway → Lambda → DynamoDB (Events CRUD)
└── Nodemailer → SMTP (Email notifications)
```

Since AWS Academy doesn't allow IAM users/roles/access keys, we use:
- **API Gateway**: Receives requests
- **Lambda**: Uses auto-generated execution role to access AWS services
- **S3**: Stores resume files
- **DynamoDB**: Stores event data
- **Nodemailer**: Sends emails via SMTP (free alternative to SES)

## Prerequisites

1. AWS Academy account with access to:
   - Lambda
   - API Gateway
   - S3
   - DynamoDB
2. PostgreSQL database (RDS or local)
3. Gmail account (or other SMTP provider) for email
4. Node.js and npm installed

## Quick Setup Overview

For detailed step-by-step instructions, see **`SETUP_SEQUENCE.md`** which provides the complete setup sequence.

### Main Setup Steps:

1. **Database Setup** - PostgreSQL configuration
2. **AWS S3 Setup** - Create bucket for file uploads
3. **AWS DynamoDB Setup** - Create table for events
4. **Lambda Functions** - Deploy S3 upload and DynamoDB handlers
5. **API Gateway** - Configure endpoints for uploads and events
6. **Email Configuration** - Set up Nodemailer with Gmail
7. **Backend Configuration** - Configure `.env` and start server

### Detailed Guides:

- **Complete Setup Sequence**: See `SETUP_SEQUENCE.md`
- **Lambda Functions**: See `lambda/README.md`
- **API Gateway**: See `api-gateway-config.md`
- **Email Setup**: See `EMAIL_SETUP.md`
- **Main README**: See `README.md`

## Testing

See `SETUP_SEQUENCE.md` for comprehensive testing instructions for all components.

### Quick Test Commands:

**Test User Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test@example.com" \
  -F "name=Test User" \
  -F "password=password123"
```

**Test User Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Test Events API:**
```bash
curl -X GET http://localhost:3000/api/events
```

**Test Event Registration (with email):**
```bash
curl -X POST http://localhost:3000/api/events/EVT-123/register \
  -H "Content-Type: application/json" \
  -d '{
    "alumniEmail": "alumni@example.com",
    "alumniName": "John Doe",
    "preferredDateTime": "2024-03-15T09:00:00Z",
    "preferredLocation": "Main Hall"
  }'
```

## Troubleshooting

### Lambda receives empty body
- **Solution**: Ensure binary media types are configured in API Gateway
- Check that `isBase64Encoded` is `true` in API Gateway response

### 502 Bad Gateway from API Gateway
- **Solution**: Check Lambda function logs in CloudWatch
- Verify Lambda execution role has S3 permissions
- Verify `S3_BUCKET_NAME` environment variable is set

### CORS errors
- **Solution**: Enable CORS in API Gateway
- Add CORS headers in Lambda response (already included)

### File upload fails in backend
- **Solution**: Check that `API_GATEWAY_UPLOAD_URL` is correct in `.env`
- Verify API Gateway is deployed
- Check backend logs for error messages

### File type validation fails
- **Solution**: Ensure file is PDF, DOC, or DOCX
- Check file extension and MIME type

## System Flows

### File Upload Flow:
1. **Backend receives file** (via multer middleware)
2. **Backend validates file** (type, size)
3. **Backend sends to API Gateway** (via axios POST with form-data)
4. **API Gateway forwards to Lambda** (base64-encoded)
5. **Lambda decodes and uploads to S3** (using execution role)
6. **Lambda returns S3 URL** to API Gateway
7. **API Gateway returns to Backend**
8. **Backend stores URL in PostgreSQL**

### Events Flow:
1. **Backend receives event request** (CRUD operation)
2. **Backend sends to API Gateway** (JSON with operation type)
3. **API Gateway forwards to Lambda**
4. **Lambda performs DynamoDB operation** (using execution role)
5. **Lambda returns result** to API Gateway
6. **API Gateway returns to Backend**
7. **Backend returns response** to client

### Email Flow:
1. **Alumni registers as judge** for an event
2. **Backend calls email service** (Nodemailer)
3. **Email service connects to SMTP** (Gmail/Outlook)
4. **Email sent to admin** with registration details
5. **No AWS services required** for email

## Security Notes

- Files are stored as private in S3 (ACL: private)
- Lambda execution role only has `s3:PutObject` and `s3:PutObjectAcl` permissions
- File size limit: 5MB (enforced in both backend and Lambda)
- File type validation: Only PDF, DOC, DOCX allowed
- Passwords are hashed with bcrypt (10 salt rounds)

## Cost Considerations

- **API Gateway**: Pay per request (first 1M requests/month free)
- **Lambda**: Pay per invocation and duration (1M requests/month free)
- **S3**: Pay for storage and requests (5GB storage free tier)

For a small application, costs should be minimal or free within AWS free tier limits.

