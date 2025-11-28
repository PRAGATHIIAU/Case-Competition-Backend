# Alumni/Industry Profile API Documentation

This document provides comprehensive documentation for the Alumni/Industry Profile feature in the CMIS portal backend, following the same hybrid RDS + DynamoDB architecture as students.

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [DynamoDB Setup](#dynamodb-setup)
6. [Lambda Deployment](#lambda-deployment)

---

## Setup Instructions

### Step 1: Update PostgreSQL RDS Schema

The `users` table needs to be updated to remove willingness flags and resume_url. Run the following SQL:

```sql
-- Remove columns that are now in DynamoDB
ALTER TABLE users 
  DROP COLUMN IF EXISTS willing_to_be_mentor,
  DROP COLUMN IF EXISTS mentor_capacity,
  DROP COLUMN IF EXISTS willing_to_be_judge,
  DROP COLUMN IF EXISTS willing_to_be_sponsor,
  DROP COLUMN IF EXISTS resume_url;
```

**OR** if you're creating a fresh table:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  willing_to_be_mentor BOOLEAN DEFAULT FALSE,
  mentor_capacity INTEGER,
  willing_to_be_judge BOOLEAN DEFAULT FALSE,
  willing_to_be_sponsor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### Step 2: Create DynamoDB Table

Create a DynamoDB table named `alumni_profiles`:

**Table Name:** `alumni_profiles`

**Partition Key:**
- `userId` (Number) - matches RDS `users.id`

**Table Settings:**
- On-demand capacity mode (recommended) or Provisioned with auto-scaling

### Step 3: Update Lambda Function

Update your existing `dynamodb-handler` Lambda function:

1. **Update Code:**
   - Copy the updated `lambda/dynamodb-handler.js` to your Lambda console
   - The handler now supports both Events and Alumni Profiles operations

2. **Environment Variables:**
   - `EVENTS_TABLE_NAME=Events` (existing)
   - `ALUMNI_PROFILES_TABLE_NAME=alumni_profiles` (new)

3. **IAM Permissions:**
   - Ensure the Lambda execution role has permissions for both tables:
     - `dynamodb:GetItem`
     - `dynamodb:PutItem`
     - `dynamodb:UpdateItem`
     - `dynamodb:DeleteItem`
   - Resource: `arn:aws:dynamodb:REGION:ACCOUNT_ID:table/alumni_profiles`

### Step 4: Environment Variables

Ensure your `.env` file has:

```env
# Database (RDS PostgreSQL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AWS API Gateway
API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/dynamodb
```

---

## Database Schema

### RDS PostgreSQL - Users Table (Atomic Data)

**Fields:**
- `id` (SERIAL, PK): Unique identifier
- `email` (VARCHAR, UNIQUE): Email address
- `name` (VARCHAR): Full name
- `password` (VARCHAR): Hashed password (bcrypt)
- `contact` (VARCHAR, optional): Contact information
- `willing_to_be_mentor` (Boolean): Willingness to mentor
- `mentor_capacity` (Integer, optional): Number of mentees
- `willing_to_be_judge` (Boolean): Willingness to judge
- `willing_to_be_sponsor` (Boolean): Willingness to sponsor
- `created_at` (TIMESTAMP): Record creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

### DynamoDB - Alumni Profiles Table (Profile Data)

**Fields:**
- `userId` (Number, PK): Matches RDS `users.id`
- `skills[]` (Array): Array of skills
- `aspirations` (String, optional): Career aspirations
- `parsed_resume` (JSON Object, optional): Parsed resume data
- `projects[]` (Array of Objects): Array of project objects
- `experiences[]` (Array of Objects): Array of experience objects
- `achievements[]` (Array): Array of achievements
- `resume_url` (String, optional): S3 URL of resume
- `createdAt` (String): ISO timestamp
- `updatedAt` (String): ISO timestamp

---

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/auth`

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Request/Response Examples

### 1. Alumni Signup

**POST** `/api/auth/signup`

**Content-Type:** `multipart/form-data`

**Request Body (form-data):**
```
email: john.alumni@example.com
name: John Alumni
password: SecurePass123!
contact: +1-555-0100
willing_to_be_mentor: yes
mentor_capacity: 5
willing_to_be_judge: yes
willing_to_be_sponsor: no
skills: ["JavaScript", "Python", "Leadership"]
aspirations: To mentor the next generation of developers
projects: [{"name": "Open Source Project", "description": "..."}]
experiences: [{"company": "Tech Corp", "position": "Senior Engineer", "duration": "2020-2024"}]
achievements: ["Industry Award 2023"]
resume: [file upload - optional]
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=john.alumni@example.com" \
  -F "name=John Alumni" \
  -F "password=SecurePass123!" \
  -F "contact=+1-555-0100" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=5" \
  -F "willing_to_be_judge=yes" \
  -F "willing_to_be_sponsor=no" \
  -F "skills=[\"JavaScript\", \"Python\", \"Leadership\"]" \
  -F "aspirations=To mentor the next generation" \
  -F "projects=[{\"name\": \"Open Source Project\", \"description\": \"Led a team of 10 developers\"}]" \
  -F "resume=@/path/to/resume.pdf"
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john.alumni@example.com",
      "name": "John Alumni",
      "contact": "+1-555-0100",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": true,
      "willing_to_be_sponsor": false,
      "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Minimal Request (Required Fields Only):**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=jane.alumni@example.com" \
  -F "name=Jane Alumni" \
  -F "password=Password123"
```

**Minimal Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 2,
      "email": "jane.alumni@example.com",
      "name": "Jane Alumni",
      "contact": null,
      "created_at": "2024-01-15T10:35:00.000Z",
      "updated_at": "2024-01-15T10:35:00.000Z",
      "willing_to_be_mentor": false,
      "mentor_capacity": null,
      "willing_to_be_judge": false,
      "willing_to_be_sponsor": false,
      "skills": [],
      "aspirations": null,
      "projects": [],
      "experiences": [],
      "achievements": [],
      "parsed_resume": null,
      "resume_url": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Alumni Login

**POST** `/api/auth/login`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "john.alumni@example.com",
  "password": "SecurePass123!"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.alumni@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "john.alumni@example.com",
      "name": "John Alumni",
      "contact": "+1-555-0100",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": true,
      "willing_to_be_sponsor": false,
      "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": "Invalid email or password"
}
```

---

### 3. Get All Users

**GET** `/api/auth/users`

**Headers:**
- `Authorization: Bearer <token>` (required)

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 1,
      "email": "john.alumni@example.com",
      "name": "John Alumni",
      "contact": "+1-555-0100",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": true,
      "willing_to_be_sponsor": false,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "skills": ["JavaScript", "Python", "Leadership"],
      "aspirations": "To mentor the next generation",
      "parsed_resume": null,
      "projects": [{"name": "Open Source Project", "description": "..."}],
      "experiences": [{"company": "Tech Corp", "position": "Senior Engineer"}],
      "achievements": ["Industry Award 2023"],
      "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
    }
  ]
}
```

---

### 4. Get User by ID

**GET** `/api/auth/user/:id`

**Headers:**
- `Authorization: Bearer <token>` (required)

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/user/1 \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "email": "john.alumni@example.com",
    "name": "John Alumni",
    "contact": "+1-555-0100",
    "willing_to_be_mentor": true,
    "mentor_capacity": 5,
    "willing_to_be_judge": true,
    "willing_to_be_sponsor": false,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "skills": ["JavaScript", "Python", "Leadership"],
    "aspirations": "To mentor the next generation",
    "parsed_resume": null,
    "projects": [{"name": "Open Source Project", "description": "..."}],
    "experiences": [{"company": "Tech Corp", "position": "Senior Engineer"}],
    "achievements": ["Industry Award 2023"],
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "error": "User not found"
}
```

---

### 5. Update User (RDS + DynamoDB - Integrated)

**PUT** `/api/auth/user/:id`

**Headers:**
- `Authorization: Bearer <token>` (required)

**Content-Type:** `multipart/form-data`

**Description:** This endpoint updates both RDS (atomic data + willingness flags) and DynamoDB (profile data) in a single request.

**Request Body (form-data):**
```
# RDS Fields (Atomic Data + Willingness Flags)
name: John Alumni Updated
contact: +1-555-0200
willing_to_be_mentor: yes
mentor_capacity: 10
willing_to_be_judge: yes
willing_to_be_sponsor: yes
password: NewPassword123!

# DynamoDB Fields (Profile Data)
skills: ["JavaScript", "Python", "Leadership", "React"]
aspirations: Updated career aspirations
projects: [{"name": "New Project", "description": "..."}]
experiences: [{"company": "New Corp", "position": "Lead Engineer"}]
achievements: ["New Award 2024"]
resume: [file upload - optional, updates resume_url in DynamoDB]
```

**cURL Example (RDS fields only):**
```bash
curl -X PUT http://localhost:3000/api/auth/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=John Alumni Updated" \
  -F "contact=+1-555-0200" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=10" \
  -F "password=NewPassword123!"
```

**cURL Example (RDS + DynamoDB fields):**
```bash
curl -X PUT http://localhost:3000/api/auth/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=John Alumni Updated" \
  -F "contact=+1-555-0200" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=10" \
  -F "skills=[\"JavaScript\", \"Python\", \"Leadership\", \"React\"]" \
  -F "aspirations=Updated career aspirations" \
  -F "projects=[{\"name\": \"New Project\", \"description\": \"...\"}]" \
  -F "resume=@/path/to/new-resume.pdf"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 1,
    "email": "john.alumni@example.com",
    "name": "John Alumni Updated",
    "contact": "+1-555-0200",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "willing_to_be_mentor": true,
    "mentor_capacity": 10,
    "willing_to_be_judge": true,
    "willing_to_be_sponsor": true,
    "skills": ["JavaScript", "Python", "Leadership", "React"],
    "aspirations": "Updated career aspirations",
    "projects": [{"name": "New Project", "description": "..."}],
    "experiences": [{"company": "Tech Corp", "position": "Senior Engineer"}],
    "achievements": ["Industry Award 2023"],
    "parsed_resume": null,
    "resume_url": "https://s3.amazonaws.com/bucket/new-resume.pdf"
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Forbidden",
  "error": "You can only modify your own account"
}
```

---

### 7. Save Extended Profile (DynamoDB Only)

**POST** `/api/auth/user/:id/profile`

**Note:** This endpoint is for updating only DynamoDB profile fields. For updating both RDS and DynamoDB together, use the integrated **PUT /api/auth/user/:id** endpoint instead.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Content-Type:** `multipart/form-data` or `application/json`

**Request Body (form-data):**
```
skills: ["JavaScript", "Python", "React", "Node.js"]
aspirations: To mentor the next generation of developers
projects: [{"name": "Project 1", "description": "..."}]
experiences: [{"company": "Tech Corp", "position": "Senior Engineer", "duration": "2020-2024"}]
achievements: ["Industry Award 2023", "Published Author"]
parsed_resume: {"education": [...], "work_experience": [...]}
resume_url: https://s3.amazonaws.com/bucket/resume.pdf
resume: [file upload - optional, will update resume_url]
```

**cURL Example (form-data):**
```bash
curl -X POST http://localhost:3000/api/auth/user/1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "skills=[\"JavaScript\", \"Python\", \"React\"]" \
  -F "aspirations=To mentor the next generation" \
  -F "projects=[{\"name\": \"Project 1\", \"description\": \"Led development team\"}]" \
  -F "experiences=[{\"company\": \"Tech Corp\", \"position\": \"Senior Engineer\"}]" \
  -F "achievements=[\"Industry Award 2023\"]"
```

**cURL Example (JSON):**
```bash
curl -X POST http://localhost:3000/api/auth/user/1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["JavaScript", "Python", "React"],
    "aspirations": "To mentor the next generation",
    "projects": [{"name": "Project 1", "description": "Led development team"}],
    "experiences": [{"company": "Tech Corp", "position": "Senior Engineer", "duration": "2020-2024"}],
    "achievements": ["Industry Award 2023"],
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alumni profile saved successfully",
  "data": {
    "userId": 1,
    "skills": ["JavaScript", "Python", "React"],
    "aspirations": "To mentor the next generation",
    "projects": [{"name": "Project 1", "description": "Led development team"}],
    "experiences": [{"company": "Tech Corp", "position": "Senior Engineer", "duration": "2020-2024"}],
    "achievements": ["Industry Award 2023"],
    "parsed_resume": null,
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:15:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "error": "User not found"
}
```

---

### 8. Get User with Extended Profile (Alternative to GET /api/auth/user/:id)

**GET** `/api/auth/user/:id/profile`

**Note:** This endpoint is an alternative to **GET /api/auth/user/:id**. Both endpoints return the same merged data from RDS + DynamoDB.

**Headers:**
- `Authorization: Bearer <token>` (required)

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/user/1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 1,
    "email": "john.alumni@example.com",
    "name": "John Alumni",
    "contact": "+1-555-0100",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "willing_to_be_mentor": true,
    "mentor_capacity": 5,
    "willing_to_be_judge": true,
    "willing_to_be_sponsor": false,
    "skills": ["JavaScript", "Python", "Leadership"],
    "aspirations": "To mentor the next generation",
    "projects": [{"name": "Open Source Project", "description": "Led a team of 10 developers"}],
    "experiences": [],
    "achievements": [],
    "parsed_resume": null,
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
  }
}
```

**Response (No Profile Data - Returns Defaults):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 2,
    "email": "jane.alumni@example.com",
    "name": "Jane Alumni",
    "contact": null,
    "created_at": "2024-01-15T10:35:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z",
      "willing_to_be_mentor": false,
      "mentor_capacity": null,
      "willing_to_be_judge": false,
      "willing_to_be_sponsor": false,
      "skills": [],
      "aspirations": null,
      "projects": [],
      "experiences": [],
      "achievements": [],
      "parsed_resume": null,
      "resume_url": null
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "error": "User not found"
}
```

---

### 6. Delete User (RDS + DynamoDB - Integrated)

**DELETE** `/api/auth/user/:id`

**Headers:**
- `Authorization: Bearer <token>` (required)

**Description:** This endpoint deletes the user from both RDS PostgreSQL and DynamoDB in a single request. The deletion is atomic - if DynamoDB deletion fails, the RDS deletion still proceeds (with a warning logged).

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/auth/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "error": "User not found"
}
```

**Note:** The endpoint will:
1. Check if user exists in RDS
2. Delete profile from DynamoDB (if exists)
3. Delete user from RDS
4. Return success response

If DynamoDB deletion fails, a warning is logged but the RDS deletion still proceeds.

---

## DynamoDB Setup

### Create Alumni Profiles Table

1. **Go to DynamoDB Console**
   - Navigate to DynamoDB → Tables → Create table

2. **Table Configuration:**
   - **Table name:** `alumni_profiles`
   - **Partition key:** `userId` (Number)
   - **Table settings:** On-demand (recommended)

3. **Sample Item Structure:**
```json
{
  "userId": 1,
  "skills": ["JavaScript", "Python", "React", "Node.js"],
  "aspirations": "To mentor the next generation of developers",
  "parsed_resume": {
    "education": [...],
    "work_experience": [...]
  },
  "projects": [
    {
      "name": "Open Source Project",
      "description": "Led a team of 10 developers",
      "technologies": ["React", "Node.js"]
    }
  ],
  "experiences": [
    {
      "company": "Tech Corp",
      "position": "Senior Engineer",
      "duration": "2020-2024",
      "description": "Led development of key features"
    }
  ],
  "achievements": ["Industry Award 2023", "Published Author"],
  "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

## Lambda Deployment

### Update Existing DynamoDB Handler

1. **Update Lambda Code:**
   - Copy contents of `lambda/dynamodb-handler.js` to your Lambda console
   - The handler now supports both Events and Alumni Profiles

2. **Environment Variables:**
   ```
   EVENTS_TABLE_NAME=Events
   ALUMNI_PROFILES_TABLE_NAME=alumni_profiles
   ```

3. **IAM Permissions:**
   - Ensure Lambda execution role has permissions for `alumni_profiles` table:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "dynamodb:GetItem",
       "dynamodb:PutItem",
       "dynamodb:UpdateItem",
       "dynamodb:DeleteItem"
     ],
     "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/alumni_profiles"
   }
   ```

---

## Data Flow

### Signup Flow
1. Receives all fields (atomic + profile)
2. Splits data:
   - RDS: `email`, `name`, `password`, `contact`, `willing_to_be_mentor`, `mentor_capacity`, `willing_to_be_judge`, `willing_to_be_sponsor`
   - DynamoDB: `skills`, `aspirations`, `parsed_resume`, `projects`, `experiences`, `achievements`, `resume_url`
3. Stores in both databases
4. Returns merged data

### Retrieval Flow
1. Fetches from RDS (atomic data)
2. Fetches from DynamoDB (profile data)
3. Merges into single response object

---

## Testing Checklist

- [ ] Update PostgreSQL schema (remove willingness flags columns)
- [ ] Create DynamoDB `alumni_profiles` table
- [ ] Update Lambda function with new code
- [ ] Set Lambda environment variable `ALUMNI_PROFILES_TABLE_NAME`
- [ ] Update Lambda IAM permissions
- [ ] Test signup with minimal fields
- [ ] Test signup with all fields
- [ ] Test login
- [ ] Test update user (atomic fields)
- [ ] Test save extended profile
- [ ] Test get user profile (merged data)
- [ ] Test delete user

---

## Error Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Not authorized
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists (e.g., duplicate email)
- `500 Internal Server Error`: Server error

---

## Notes

1. **Password Security:** All passwords are hashed using bcrypt (10 salt rounds)
2. **File Uploads:** Resume files uploaded to S3 via API Gateway → Lambda. Max 5MB. Formats: PDF, DOC, DOCX
3. **Authentication:** JWT tokens expire after 7 days
4. **Authorization:** Users can only update/delete their own profiles
5. **Data Storage:**
   - Basic user info: PostgreSQL RDS
   - Extended profile: DynamoDB
   - Resume files: S3
6. **ID Type:** Alumni use integer IDs (`id`), Students use UUIDs (`student_id`)

---

## Support

For issues or questions, refer to:
- Student Profile Documentation: `STUDENTS_API_DOCUMENTATION.md`
- Data Flow: `STUDENTS_DATA_FLOW.md`

