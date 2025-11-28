# Student Profile API Documentation

This document provides comprehensive documentation for the Student Profile feature in the CMIS portal backend.

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Request/Response Examples](#requestresponse-examples)
5. [DynamoDB Setup](#dynamodb-setup)
6. [Lambda Deployment](#lambda-deployment)
7. [API Gateway Configuration](#api-gateway-configuration)

---

## Database Schema

### PHASE 1: PostgreSQL RDS - Students Table

Run the following SQL to create the students table:

```sql
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  linkedin_url TEXT,
  major VARCHAR(255),
  grad_year INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
```

**Fields:**
- `student_id` (UUID, PK): Unique identifier for the student
- `name` (VARCHAR): Student's full name
- `email` (VARCHAR, UNIQUE): Student's email address
- `password` (VARCHAR): Hashed password (bcrypt)
- `contact` (VARCHAR, optional): Contact information
- `linkedin_url` (TEXT, optional): LinkedIn profile URL
- `major` (VARCHAR, optional): Student's major
- `grad_year` (INTEGER, optional): Graduation year
- `created_at` (TIMESTAMP): Record creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

---

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/students`

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

### 1. Student Signup

**POST** `/api/students/signup`

Register a new student account.

**Content-Type:** `multipart/form-data` (supports file upload)

**Request Body (form-data):**
- `email` (string, required): Student email
- `name` (string, required): Student name
- `password` (string, required): Password (min 6 characters)
- `contact` (string, optional): Contact information
- `linkedin_url` (string, optional): LinkedIn URL
- `major` (string, optional): Major field
- `grad_year` (integer, optional): Graduation year
- `resume` (file, optional): Resume file (PDF, DOC, DOCX, max 5MB)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "student": {
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact": "+1234567890",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "major": "Computer Science",
      "grad_year": 2025,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already exists

---

### 2. Student Login

**POST** `/api/students/login`

Authenticate a student and receive a JWT token.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "student": {
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact": "+1234567890",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "major": "Computer Science",
      "grad_year": 2025,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid email or password

---

### 3. Get All Students

**GET** `/api/students`

Retrieve all students' basic information.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact": "+1234567890",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "major": "Computer Science",
      "grad_year": 2025,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 4. Get Student by ID

**GET** `/api/students/:id`

Retrieve a specific student's basic information.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student retrieved successfully",
  "data": {
    "student_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "contact": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "major": "Computer Science",
    "grad_year": 2025,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: Student not found

---

### 5. Update Student

**PUT** `/api/students/:id`

Update student information. Only the student themselves can update their own profile.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Content-Type:** `multipart/form-data` (supports file upload)

**Request Body (form-data):**
- `name` (string, optional): Updated name
- `contact` (string, optional): Updated contact
- `linkedin_url` (string, optional): Updated LinkedIn URL
- `major` (string, optional): Updated major
- `grad_year` (integer, optional): Updated graduation year
- `password` (string, optional): New password (min 6 characters)
- `resume` (file, optional): New resume file

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "student_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe Updated",
    "email": "john.doe@example.com",
    "contact": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "major": "Computer Science",
    "grad_year": 2026,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `403 Forbidden`: Not authorized to update this student
- `404 Not Found`: Student not found

---

### 6. Delete Student

**DELETE** `/api/students/:id`

Delete a student account. Only the student themselves can delete their account.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

**Error Responses:**
- `403 Forbidden`: Not authorized to delete this student
- `404 Not Found`: Student not found

---

### 7. Save Extended Profile

**POST** `/api/students/:id/profile`

Save or update extended student profile in DynamoDB. This includes skills, aspirations, projects, experiences, achievements, and resume data.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Content-Type:** `application/json` or `multipart/form-data`

**Request Body (JSON):**
```json
{
  "skills": ["JavaScript", "Python", "React"],
  "aspirations": "To become a full-stack developer",
  "parsed_resume": {
    "education": [...],
    "work_experience": [...]
  },
  "projects": [
    {
      "name": "Project 1",
      "description": "Description",
      "technologies": ["React", "Node.js"]
    }
  ],
  "experiences": [
    {
      "company": "Company Name",
      "position": "Intern",
      "duration": "Summer 2023"
    }
  ],
  "achievements": [
    "Dean's List",
    "Hackathon Winner"
  ],
  "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
}
```

**Request Body (form-data):**
- `skills` (JSON string or array): Array of skills
- `aspirations` (string, optional): Career aspirations
- `parsed_resume` (JSON string or object, optional): Parsed resume data
- `projects` (JSON string or array, optional): Array of projects
- `experiences` (JSON string or array, optional): Array of experiences
- `achievements` (JSON string or array, optional): Array of achievements
- `resume_url` (string, optional): S3 URL of resume
- `resume` (file, optional): Resume file to upload (will update resume_url)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student profile saved successfully",
  "data": {
    "studentId": "550e8400-e29b-41d4-a716-446655440000",
    "skills": ["JavaScript", "Python", "React"],
    "aspirations": "To become a full-stack developer",
    "parsed_resume": {...},
    "projects": [...],
    "experiences": [...],
    "achievements": [...],
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 8. Get Student with Extended Profile

**GET** `/api/students/:id/profile`

Retrieve a student's complete profile, merging RDS (basic info) and DynamoDB (extended profile) data.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student profile retrieved successfully",
  "data": {
    "student_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "contact": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "major": "Computer Science",
    "grad_year": 2025,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "profile": {
      "studentId": "550e8400-e29b-41d4-a716-446655440000",
      "skills": ["JavaScript", "Python", "React"],
      "aspirations": "To become a full-stack developer",
      "parsed_resume": {...},
      "projects": [...],
      "experiences": [...],
      "achievements": [...],
      "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

**Note:** If no extended profile exists, `profile` will be `null`.

---

## DynamoDB Setup

### Create Student Profiles Table

Create a DynamoDB table named `student_profiles` with the following configuration:

**Table Name:** `student_profiles`

**Partition Key:**
- `studentId` (String)

**Table Settings:**
- On-demand capacity mode (recommended) or Provisioned with auto-scaling

**Sample Item Structure:**
```json
{
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "skills": ["JavaScript", "Python", "React"],
  "aspirations": "To become a full-stack developer",
  "parsed_resume": {
    "education": [...],
    "work_experience": [...]
  },
  "projects": [
    {
      "name": "Project 1",
      "description": "Description",
      "technologies": ["React", "Node.js"]
    }
  ],
  "experiences": [
    {
      "company": "Company Name",
      "position": "Intern",
      "duration": "Summer 2023"
    }
  ],
  "achievements": [
    "Dean's List",
    "Hackathon Winner"
  ],
  "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

## Lambda Deployment

### Student Profiles DynamoDB Handler

1. **Create Lambda Function:**
   - Name: `student-profiles-handler`
   - Runtime: Node.js 18.x
   - Handler: `index.handler`

2. **Upload Code:**
   - Copy contents of `lambda/student-profiles-handler.js` to Lambda console
   - Or zip and upload the file

3. **Configure Environment Variables:**
   ```
   STUDENT_PROFILES_TABLE_NAME=student_profiles
   ```

4. **IAM Permissions:**
   Attach the following policy to the Lambda execution role:
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
           "dynamodb:DeleteItem"
         ],
         "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/student_profiles"
       }
     ]
   }
   ```

5. **Configuration:**
   - Timeout: 30 seconds
   - Memory: 256 MB

---

## API Gateway Configuration

### DynamoDB Endpoint

1. **Create API Gateway:**
   - Create a new REST API or use existing
   - Create resource: `/student-profiles` (or use existing DynamoDB endpoint)

2. **Create Method:**
   - Method: POST
   - Integration type: Lambda Function
   - Lambda function: `student-profiles-handler`
   - Enable CORS if needed

3. **Deploy API:**
   - Create a new stage (e.g., `prod`)
   - Note the Invoke URL

4. **Update Environment Variable:**
   Add to your `.env` file:
   ```
   API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/student-profiles
   ```

**Note:** If you're using the same API Gateway endpoint for both Events and Student Profiles, the Lambda function will route based on the `operation` field in the request body.

---

## Example cURL Requests

### Signup
```bash
curl -X POST http://localhost:3000/api/students/signup \
  -F "email=john.doe@example.com" \
  -F "name=John Doe" \
  -F "password=password123" \
  -F "major=Computer Science" \
  -F "grad_year=2025" \
  -F "resume=@/path/to/resume.pdf"
```

### Login
```bash
curl -X POST http://localhost:3000/api/students/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### Get Student Profile
```bash
curl -X GET http://localhost:3000/api/students/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Save Extended Profile
```bash
curl -X POST http://localhost:3000/api/students/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["JavaScript", "Python"],
    "aspirations": "To become a developer",
    "projects": [{"name": "Project 1", "description": "Description"}]
  }'
```

---

## Environment Variables

Add the following to your `.env` file:

```env
# Database (RDS PostgreSQL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AWS API Gateway
API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/student-profiles

# DynamoDB Table Names (for Lambda)
STUDENT_PROFILES_TABLE_NAME=student_profiles
```

---

## Notes

1. **Password Security:** All passwords are hashed using bcrypt (10 salt rounds) before storage.

2. **File Uploads:** Resume files are uploaded to S3 via API Gateway → Lambda. Maximum file size is 5MB. Supported formats: PDF, DOC, DOCX.

3. **Authentication:** JWT tokens expire after 7 days. Include the token in the `Authorization` header as `Bearer <token>`.

4. **Authorization:** Students can only update/delete their own profiles. The `authorizeOwner` middleware enforces this.

5. **Data Storage:**
   - Basic student info: PostgreSQL RDS
   - Extended profile: DynamoDB
   - Resume files: S3

6. **UUID vs Integer IDs:** Students use UUIDs (`student_id`), while alumni/users use integer IDs. The middleware handles both.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description"
}
```

Common HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Not authorized
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists (e.g., duplicate email)
- `500 Internal Server Error`: Server error

---

## Testing

Use Postman or similar tools to test the API. Import the following collection structure:

1. **Student Signup** - POST `/api/students/signup`
2. **Student Login** - POST `/api/students/login`
3. **Get All Students** - GET `/api/students`
4. **Get Student** - GET `/api/students/:id`
5. **Update Student** - PUT `/api/students/:id`
6. **Delete Student** - DELETE `/api/students/:id`
7. **Save Profile** - POST `/api/students/:id/profile`
8. **Get Profile** - GET `/api/students/:id/profile`

---

## Support

For issues or questions, refer to the main project documentation or contact the development team.

