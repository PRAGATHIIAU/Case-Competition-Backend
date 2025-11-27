# Case-Competition-Backend

Backend framework for events site built with Node.js and Express.

## Project Structure

```
├── config/          # Configuration files (server settings, database config, etc.)
├── controllers/     # Request handlers (handle HTTP requests/responses)
├── services/        # Business logic layer
├── repositories/    # Data access layer (database queries, external APIs)
├── models/          # Data models and schemas
├── routes/          # Route definitions
└── server.js        # Application entry point
```

## Setup

**🚀 New to this project?** Start with **`SETUP_SEQUENCE.md`** for a complete step-by-step setup guide in the correct order.

**Quick Setup:**
1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Create a `.env` file in the root directory
   - Copy the following variables and fill in your values:
   ```
   PORT=3000
   NODE_ENV=development
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_PORT=5432
   DB_NAME=alumni_portal
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   JWT_SECRET=your_jwt_secret_key_here
   
   # API Gateway URLs (required for AWS Academy - no IAM users/roles/access keys allowed)
   API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
   API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/events
   
   # Email Configuration (using Nodemailer - free alternative to AWS SES)
   # See EMAIL_SETUP.md for detailed setup instructions
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-gmail-app-password
   FROM_EMAIL=your-email@gmail.com
   ADMIN_EMAIL=admin@example.com
   
   # Optional: Custom SMTP (defaults to Gmail if not specified)
   # SMTP_HOST=smtp.gmail.com
   # SMTP_PORT=587
   # SMTP_SECURE=false
   
   # Configuration for Lambda functions (used by Lambda, not directly by backend)
   S3_BUCKET_NAME=alumni-portal-resumes
   EVENTS_TABLE_NAME=Events
   ```
   
   **Note**: This backend uses API Gateway → Lambda → AWS Services for AWS operations (required for AWS Academy).
   - `API_GATEWAY_UPLOAD_URL`: The API Gateway endpoint URL that triggers the S3 upload Lambda function
   - `API_GATEWAY_DYNAMODB_URL`: The API Gateway endpoint URL that triggers the DynamoDB Lambda function
   - `EMAIL_USER`: Your email address (Gmail recommended - see EMAIL_SETUP.md)
   - `EMAIL_PASSWORD`: Your email App Password (not your regular password - see EMAIL_SETUP.md)
   - `FROM_EMAIL`: Email address to send emails from (should match EMAIL_USER for Gmail)
   - `ADMIN_EMAIL`: Email address to receive judge registration notifications
   - `S3_BUCKET_NAME`: Your S3 bucket name (used by Lambda, not directly by backend)
   - `EVENTS_TABLE_NAME`: DynamoDB table name for Events (default: Events, used by Lambda)
   
   **Important**: Before using the Events API:
   1. Deploy the Lambda functions (see `lambda/README.md`):
      - `dynamodb-events-handler` for DynamoDB operations
   2. Set up API Gateway endpoints (see `api-gateway-config.md`):
      - POST endpoint for DynamoDB operations
   3. Create a DynamoDB table named "Events" with `eventId` as the partition key (string type)
   4. **Configure email settings** (see `EMAIL_SETUP.md` for detailed instructions):
      - Set up Gmail App Password (recommended) or use another SMTP provider
      - Configure `EMAIL_USER`, `EMAIL_PASSWORD`, `FROM_EMAIL`, and `ADMIN_EMAIL` in `.env`
   5. Configure the API Gateway URLs in your `.env` file

3. Initialize database:
```bash
node scripts/init-db.js
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### GET /
Returns a hello world message.

**Response:**
```json
{
  "message": "Hello world"
}
```

### POST /api/auth/signup
Register a new alumni user.

**Request (form-data):**
- `email` (string, required): User email
- `name` (string, required): User name
- `password` (string, required): Password (min 6 characters)
- `contact` (string, optional): Contact information
- `willing_to_be_mentor` (string, optional): "yes" or "no" (default: "no")
- `mentor_capacity` (integer, required if willing_to_be_mentor="yes"): Number of mentees
- `willing_to_be_judge` (string, optional): "yes" or "no" (default: "no")
- `willing_to_be_sponsor` (string, optional): "yes" or "no" (default: "no")
- `resume` (file, optional): Resume file (PDF, DOC, or DOCX, max 5MB)

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "contact": "1234567890",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": false,
      "willing_to_be_sponsor": false,
      "resume_url": "https://s3.amazonaws.com/...",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/login
Authenticate user and get access token.

**Request (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "contact": "1234567890",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": false,
      "willing_to_be_sponsor": false,
      "resume_url": "https://s3.amazonaws.com/...",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### PUT /api/auth/user/:id
Update user information. Requires authentication (JWT token).

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request (form-data or JSON):**
- `name` (string, optional): User name
- `contact` (string, optional): Contact information
- `willing_to_be_mentor` (string, optional): "yes" or "no"
- `mentor_capacity` (integer, optional): Required if willing_to_be_mentor="yes"
- `willing_to_be_judge` (string, optional): "yes" or "no"
- `willing_to_be_sponsor` (string, optional): "yes" or "no"
- `password` (string, optional): New password (min 6 characters)
- `resume` (file, optional): New resume file (PDF, DOC, or DOCX, max 5MB)

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe Updated",
    "contact": "1234567890",
    "willing_to_be_mentor": true,
    "mentor_capacity": 10,
    "willing_to_be_judge": true,
    "willing_to_be_sponsor": false,
    "resume_url": "https://s3.amazonaws.com/...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Note:** Users can only update their own account. The `:id` in the URL must match the authenticated user's ID.

### DELETE /api/auth/user/:id
Delete user account. Requires authentication (JWT token).

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Note:** Users can only delete their own account. The `:id` in the URL must match the authenticated user's ID.

## Events API Endpoints

The Events API provides full CRUD operations for managing events stored in DynamoDB.

### GET /api/events
Get all events.

**Response (200):**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "title": "Case Competition 2024",
      "description": "Annual case competition event",
      "photos": ["https://s3.amazonaws.com/..."],
      "rubric": ["Criteria 1", "Criteria 2"],
      "slots": [
        {
          "slotId": "SLOT-001",
          "startTime": "2024-03-15T09:00:00Z",
          "endTime": "2024-03-15T12:00:00Z",
          "location": "Main Hall",
          "capacity": 50,
          "registeredCount": 10
        }
      ],
      "teams": [
        {
          "teamId": "TEAM-001",
          "teamName": "Team Alpha",
          "members": ["STU-001", "STU-002"],
          "slotId": "SLOT-001",
          "score": 85
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /api/events/:id
Get event by ID.

**Response (200):**
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "title": "Case Competition 2024",
    "description": "Annual case competition event",
    "photos": [],
    "rubric": [],
    "slots": [],
    "teams": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/events
Create a new event.

**Request (JSON):**
```json
{
  "title": "Case Competition 2024",
  "description": "Annual case competition event",
  "photos": ["https://s3.amazonaws.com/..."],
  "rubric": ["Criteria 1", "Criteria 2"],
  "slots": [
    {
      "slotId": "SLOT-001",
      "startTime": "2024-03-15T09:00:00Z",
      "endTime": "2024-03-15T12:00:00Z",
      "location": "Main Hall",
      "capacity": 50,
      "registeredCount": 0
    }
  ],
  "teams": []
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "title": "Case Competition 2024",
    "description": "Annual case competition event",
    "photos": [],
    "rubric": [],
    "slots": [],
    "teams": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/events/:id
Update an existing event.

**Request (JSON):**
```json
{
  "title": "Updated Event Title",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "title": "Updated Event Title",
    "description": "Updated description",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### DELETE /api/events/:id
Delete an event.

**Response (200):**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### POST /api/events/:id/register
Register alumni as judge for an event. Sends email notification to admin.

**Request (JSON):**
```json
{
  "alumniEmail": "alumni@example.com",
  "alumniName": "John Doe",
  "preferredDateTime": "2024-03-15T09:00:00Z",
  "preferredLocation": "Main Hall"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Registration successful. Admin has been notified.",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "eventTitle": "Case Competition 2024"
  }
}
```

## Server

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable.