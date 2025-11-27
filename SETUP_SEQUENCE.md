# Complete Setup Sequence

This document provides the **exact sequence** to follow for setting up the Case Competition Backend from scratch. Follow these steps in order.

## 📋 Setup Checklist

- [ ] Step 1: Database Setup
- [ ] Step 2: AWS S3 Setup
- [ ] Step 3: AWS DynamoDB Setup
- [ ] Step 4: Lambda Functions Setup
- [ ] Step 5: API Gateway Setup
- [ ] Step 6: Email Configuration
- [ ] Step 7: Backend Configuration
- [ ] Step 8: Testing

---

## Step 1: Database Setup

### 1.1 Create PostgreSQL Database

**Option A: AWS RDS**
1. Go to RDS Console → Create database
2. Choose PostgreSQL
3. Configure:
   - **DB instance identifier**: `alumni-portal-db`
   - **Master username**: `admin` (or your choice)
   - **Master password**: Create a strong password
   - **DB instance class**: `db.t3.micro` (free tier)
   - **Storage**: 20 GB (free tier)
4. Click "Create database"
5. Wait for database to be available
6. Note the **Endpoint** (e.g., `alumni-portal-db.xxxxx.us-east-1.rds.amazonaws.com`)

**Option B: Local PostgreSQL**
1. Install PostgreSQL on your machine
2. Create database: `CREATE DATABASE alumni_portal;`
3. Create user: `CREATE USER your_user WITH PASSWORD 'your_password';`
4. Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE alumni_portal TO your_user;`

### 1.2 Initialize Database Schema

1. In your backend project, run:
   ```bash
   node scripts/init-db.js
   ```
2. Verify tables are created (users table should exist)

**✅ Checkpoint**: Database is ready. Note your DB connection details for Step 7.

---

## Step 2: AWS S3 Setup

### 2.1 Create S3 Bucket

1. Go to S3 Console
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `alumni-portal-resumes` (must be globally unique)
   - **Region**: Choose your region (e.g., `us-east-1`)
   - **Block Public Access**: Keep default (all checked - private bucket)
   - **Bucket Versioning**: Disable (unless needed)
   - **Default encryption**: Enable (recommended)
4. Click "Create bucket"

**✅ Checkpoint**: S3 bucket created. Note the bucket name for Step 4 and Step 7.

---

## Step 3: AWS DynamoDB Setup

### 3.1 Create DynamoDB Table

1. Go to DynamoDB Console
2. Click "Create table"
3. Configure:
   - **Table name**: `Events`
   - **Partition key**: `eventId` (type: String)
   - **Table settings**: Use default settings
   - **Capacity mode**: On-demand (or Provisioned with 1 read/write unit for free tier)
4. Click "Create table"
5. Wait for table to be active

**✅ Checkpoint**: DynamoDB table created. Note the table name (Events) for Step 4 and Step 7.

---

## Step 4: Lambda Functions Setup

### 4.1 Create S3 Upload Lambda Function

**Detailed instructions**: See `lambda/README.md` section "S3 Resume Upload Handler Setup"

**Quick steps:**
1. Go to Lambda Console → Create function
2. Choose "Author from scratch"
3. Configure:
   - **Function name**: `s3-resume-upload-handler`
   - **Runtime**: Node.js 18.x
   - **Architecture**: x86_64
4. Click "Create function"
5. Copy code from `lambda/s3-upload-handler.js` → Paste into Lambda editor
6. Set environment variable:
   - Key: `S3_BUCKET_NAME`
   - Value: `alumni-portal-resumes` (your bucket name)
7. Configure IAM permissions (add to execution role):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:PutObjectAcl"
         ],
         "Resource": "arn:aws:s3:::alumni-portal-resumes/*"
       }
     ]
   }
   ```
8. Set timeout: 30 seconds, Memory: 512 MB
9. Click "Deploy"

### 4.2 Create DynamoDB Events Lambda Function

**Detailed instructions**: See `lambda/README.md` section "DynamoDB Events Handler Setup"

**Quick steps:**
1. Go to Lambda Console → Create function
2. Choose "Author from scratch"
3. Configure:
   - **Function name**: `dynamodb-events-handler`
   - **Runtime**: Node.js 18.x
   - **Architecture**: x86_64
4. Click "Create function"
5. Copy code from `lambda/dynamodb-handler.js` → Paste into Lambda editor
6. Set environment variable:
   - Key: `EVENTS_TABLE_NAME`
   - Value: `Events`
7. Configure IAM permissions (add to execution role):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:DeleteItem",
           "dynamodb:Scan"
         ],
         "Resource": "arn:aws:dynamodb:*:*:table/Events"
       }
     ]
   }
   ```
8. Set timeout: 30 seconds, Memory: 256 MB
9. Click "Deploy"

**✅ Checkpoint**: Both Lambda functions created and configured. Ready for API Gateway integration.

---

## Step 5: API Gateway Setup

### 5.1 Create API Gateway REST API

**Detailed instructions**: See `api-gateway-config.md`

**Quick steps:**
1. Go to API Gateway Console → Create API
2. Choose "REST API" → Build
3. Configure:
   - **API name**: `case-competition-api`
   - **Endpoint Type**: Regional
4. Click "Create API"

### 5.2 Configure Upload Endpoint

1. Create resource: `/upload`
2. Create method: `POST`
3. Integration: Lambda Function → `s3-resume-upload-handler` (use Lambda Proxy)
4. Enable binary media types: `multipart/form-data`, `*/*` (in Settings)
5. Configure Method Request: Authorization = None
6. Enable CORS (if needed)

### 5.3 Configure Events Endpoint

1. Create resource: `/events`
2. Create method: `POST`
3. Integration: Lambda Function → `dynamodb-events-handler` (use Lambda Proxy)
4. Configure Method Request: Authorization = None
5. Enable CORS (if needed)

### 5.4 Deploy API

1. Click "Actions" → "Deploy API"
2. Stage: `prod` (or `dev`)
3. Click "Deploy"
4. **Copy the Invoke URL**: `https://xxxxx.execute-api.region.amazonaws.com/prod`

Your endpoints will be:
- Upload: `https://xxxxx.execute-api.region.amazonaws.com/prod/upload`
- Events: `https://xxxxx.execute-api.region.amazonaws.com/prod/events`

**✅ Checkpoint**: API Gateway deployed. Note both endpoint URLs for Step 7.

---

## Step 6: Email Configuration

### 6.1 Set Up Gmail App Password

**Detailed instructions**: See `EMAIL_SETUP.md`

**Quick steps:**
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification if not already enabled
3. Generate App Password:
   - App: Mail
   - Device: Other (Custom name) → "Case Competition Backend"
4. **Copy the 16-character password** (you'll need this in Step 7)

**✅ Checkpoint**: Gmail App Password generated. Note it for Step 7.

---

## Step 7: Backend Configuration

### 7.1 Install Dependencies

```bash
npm install
```

### 7.2 Create `.env` File

Create a `.env` file in the root directory with the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (from Step 1)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=alumni_portal
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_key_here_min_32_characters

# API Gateway URLs (from Step 5)
API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/events

# Email Configuration (from Step 6)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
ADMIN_EMAIL=admin@example.com

# AWS Configuration (for Lambda - used by Lambda, not directly by backend)
S3_BUCKET_NAME=alumni-portal-resumes
EVENTS_TABLE_NAME=Events
```

**Important Notes:**
- Replace all placeholder values with your actual values
- `EMAIL_USER` and `FROM_EMAIL` should be the same Gmail address
- `EMAIL_PASSWORD` is the 16-character App Password (not your regular password)
- `ADMIN_EMAIL` is where judge registration notifications will be sent

### 7.3 Initialize Database

```bash
node scripts/init-db.js
```

This creates the necessary tables in PostgreSQL.

### 7.4 Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

**✅ Checkpoint**: Backend server running on http://localhost:3000

---

## Step 8: Testing

### 8.1 Test User Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test@example.com" \
  -F "name=Test User" \
  -F "password=password123" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=5"
```

**Expected**: 201 response with user data and JWT token

### 8.2 Test User Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Expected**: 200 response with user data and JWT token

### 8.3 Test Events API - Get All Events

```bash
curl -X GET http://localhost:3000/api/events
```

**Expected**: 200 response with events array (may be empty initially)

### 8.4 Test Events API - Create Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "Test Description",
    "photos": [],
    "rubric": ["Criteria 1"],
    "slots": [],
    "teams": []
  }'
```

**Expected**: 201 response with created event data

### 8.5 Test Event Registration (Email Trigger)

First, get an event ID from the previous step, then:

```bash
curl -X POST http://localhost:3000/api/events/EVT-1234567890-abc123/register \
  -H "Content-Type: application/json" \
  -d '{
    "alumniEmail": "alumni@example.com",
    "alumniName": "John Doe",
    "preferredDateTime": "2024-03-15T09:00:00Z",
    "preferredLocation": "Main Hall"
  }'
```

**Expected**: 
- 200 response with success message
- Email sent to `ADMIN_EMAIL` with registration details

**Check your admin email inbox** to verify the email was received.

### 8.6 Test File Upload (with Signup)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test2@example.com" \
  -F "name=Test User 2" \
  -F "password=password123" \
  -F "resume=@/path/to/your/resume.pdf"
```

**Expected**: 201 response with user data including `resume_url` pointing to S3

---

## 🎉 Setup Complete!

If all tests pass, your backend is fully configured and ready to use!

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in `.env`
   - Verify RDS security group allows connections from your IP
   - For local DB, ensure PostgreSQL is running

2. **API Gateway "Missing Authentication Token"**
   - Verify API Gateway is deployed
   - Check URL format (must include `/upload` or `/events`)
   - Ensure Method Request → Authorization = None

3. **Email Not Sending**
   - Verify Gmail App Password is correct (16 characters)
   - Check EMAIL_USER and FROM_EMAIL match
   - See `EMAIL_SETUP.md` for detailed troubleshooting

4. **Lambda Errors**
   - Check CloudWatch logs for Lambda functions
   - Verify IAM permissions are correct
   - Check environment variables in Lambda

5. **File Upload Fails**
   - Verify S3 bucket exists and name is correct
   - Check Lambda execution role has S3 permissions
   - Verify API Gateway binary media types are configured

## Next Steps

- Review API documentation in `README.md`
- Set up frontend to connect to backend
- Configure production environment variables
- Set up monitoring and logging

## Documentation Reference

- **Main README**: `README.md` - API endpoints and overview
- **Lambda Setup**: `lambda/README.md` - Lambda function details
- **API Gateway**: `api-gateway-config.md` - API Gateway configuration
- **Email Setup**: `EMAIL_SETUP.md` - Email configuration details
- **Setup Guide**: `SETUP_GUIDE.md` - Architecture overview

