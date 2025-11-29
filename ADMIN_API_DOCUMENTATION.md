# Admin API Documentation

This document provides comprehensive documentation for the Admin module in the Case Competition Backend.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Setup Instructions](#setup-instructions)
4. [API Endpoints](#api-endpoints)
5. [Authentication](#authentication)
6. [Request/Response Examples](#requestresponse-examples)
7. [Error Handling](#error-handling)
8. [Security Features](#security-features)
9. [Admin Analytics](#admin-analytics)

---

## Overview

The Admin module provides a separate authentication and management system for platform administrators. Admins have elevated privileges to:

- Manage events (create, update, delete)
- View all students, alumni, and events
- Update event statuses
- Access admin-only endpoints

**Key Features:**
- Separate admin authentication system (independent from users/students)
- JWT-based authentication with 7-day token expiry
- Role-based access control
- Password hashing with bcrypt (10 salt rounds)
- Admin-only event management

---

## Database Schema

### PostgreSQL RDS - Admins Table

The `admins` table stores all admin account information in PostgreSQL.

**Table Name:** `admins`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
```

**Fields:**
- `id` (SERIAL, PK): Unique identifier for the admin
- `email` (VARCHAR, UNIQUE): Admin's email address (used for login)
- `password_hash` (VARCHAR): Hashed password (bcrypt)
- `first_name` (VARCHAR): Admin's first name
- `last_name` (VARCHAR): Admin's last name
- `role` (VARCHAR): Admin role (default: 'admin')
- `created_at` (TIMESTAMP): Record creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- Primary key on `id`
- Unique index on `email` for fast lookups

---

## Setup Instructions

### Step 1: Initialize Database

Run the database initialization script to create the `admins` table:

```bash
node scripts/init-db.js
```

This script creates both `users` and `admins` tables. If you only need the admins table, you can run the SQL directly from `models/admin.model.js`.

### Step 2: Create Initial Admin User

After the table is created, create your first admin user:

```bash
node scripts/create-admin.js
```

**Default Credentials:**
- Email: `admin@test.com`
- Password: `admin123`

**To customize:** Edit `scripts/create-admin.js` and modify:
```javascript
const email = 'your-admin@example.com';
const password = 'your-secure-password';
const firstName = 'Your';
const lastName = 'Name';
```

### Step 3: Environment Variables

Ensure your `.env` file has:

```env
# Database (RDS PostgreSQL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Secret (shared with other auth systems)
JWT_SECRET=your-secret-key-change-in-production
```

### Step 4: Verify Setup

1. Check that `admins` table exists in PostgreSQL
2. Verify admin user was created successfully
3. Test login endpoint (see examples below)

---

## API Endpoints

### Base URL
All admin endpoints are prefixed with `/admin`

### Authentication
All endpoints (except login) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

### 1. Admin Login

**POST** `/admin/login`

Authenticate as admin and receive a JWT token.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@test.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

**400 Bad Request** - Missing email or password:
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

**401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": "Invalid email or password"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**PowerShell Example:**
```powershell
$body = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"
```

---

### 2. Get Admin Profile

**GET** `/admin/profile`

Get the authenticated admin's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "email": "admin@test.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

**401 Unauthorized** - Missing or invalid token:
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "No authorization header provided"
}
```

**404 Not Found** - Admin not found:
```json
{
  "success": false,
  "message": "Admin not found",
  "error": "Admin not found"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$headers = @{
    Authorization = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 3. Get All Students

**GET** `/admin/students`

Get a list of all students in the system (admin-only).

**Headers:**
```
Authorization: Bearer <token>
```

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
  ],
  "count": 1
}
```

**Note:** This endpoint requires the `student.repository.js` to exist. If it doesn't exist, you'll get an error message.

**cURL Example:**
```bash
curl -X GET http://localhost:3000/admin/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/students" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 4. Get All Alumni

**GET** `/admin/alumni`

Get a list of all alumni/industry users in the system (admin-only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alumni retrieved successfully",
  "data": [
    {
      "id": 1,
      "email": "alumni@example.com",
      "name": "Jane Alumni",
      "contact": "+1234567890",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": true,
      "willing_to_be_sponsor": false,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Note:** This endpoint requires the `alumni.repository.js` to exist. If it doesn't exist, you'll get an error message.

**cURL Example:**
```bash
curl -X GET http://localhost:3000/admin/alumni \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/alumni" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 5. Get All Events

**GET** `/admin/events`

Get a list of all events in the system (admin-only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
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
          "scores": [85, 90, 88]
        }
      ],
      "status": "approved",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 6. Update Event Status

**PUT** `/admin/events/:id/status`

Update the status of an event (e.g., "approved", "pending", "rejected").

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string, required): Event ID (e.g., "EVT-1234567890-abc123")

**Request Body:**
```json
{
  "status": "approved"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event status updated successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "title": "Case Competition 2024",
    "status": "approved",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Missing status:
```json
{
  "success": false,
  "message": "Status is required"
}
```

**404 Not Found** - Event not found:
```json
{
  "success": false,
  "message": "Event not found",
  "error": "Event not found"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/admin/events/EVT-1234567890-abc123/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

**PowerShell Example:**
```powershell
$headers = @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
}
$body = @{ status = "approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/admin/events/EVT-1234567890-abc123/status" -Method PUT -Headers $headers -Body $body | ConvertTo-Json
```

---

## Admin Analytics

### GET /admin/analytics/basic-stats

**Purpose:** Return basic platform statistics for the admin dashboard.

**Method:** `GET`  
**URL:** `/admin/analytics/basic-stats`  
**Auth:** Admin JWT required

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "totalStudents": 42,
  "totalAlumni": 130,
  "activeEvents": 3,
  "inactiveAlumniCount": 15
}
```

**Field Descriptions:**
- `totalStudents`: Total number of student records (`students` table).
- `totalAlumni`: Total number of alumni/user records (`users` table).
- `activeEvents`: Number of events whose date is today or in the future (via DynamoDB `Events` table).
- `inactiveAlumniCount`: Number of alumni whose `last_login` is older than 90 days.

**cURL Example:**
```bash
curl -X GET http://localhost:3000/admin/analytics/basic-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/basic-stats" -Method GET -Headers $headers | ConvertTo-Json
```

For more details, see `ADMIN_ANALYTICS_GUIDE.md`.

---

## Authentication

### JWT Token Structure

Admin tokens contain the following payload:
```json
{
  "adminId": 1,
  "email": "admin@test.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1235173890
}
```

**Key Fields:**
- `adminId`: Admin's database ID
- `email`: Admin's email address
- `role`: Admin role (always "admin")
- `iat`: Token issued at timestamp
- `exp`: Token expiration timestamp (7 days from issue)

### Token Expiration

Admin tokens expire after **7 days**. After expiration, you must login again to get a new token.

### Token Validation

The `authenticateAdmin` middleware validates:
1. Token presence in Authorization header
2. Token signature (using JWT_SECRET)
3. Token expiration
4. Token contains `adminId` (not a regular user token)

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
- Missing Authorization header
- Invalid token
- Expired token
- Token doesn't contain adminId

**403 Forbidden:**
- Token is valid but not for an admin (e.g., user/student token)

**404 Not Found:**
- Admin not found
- Event not found

**500 Internal Server Error:**
- Database connection issues
- Unexpected server errors

### Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Detailed error description (optional)"
}
```

---

## Security Features

### 1. Password Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Passwords are never returned in API responses
- Password hashes are stored securely in the database

### 2. JWT Authentication
- Tokens are signed with a secret key (JWT_SECRET)
- Tokens expire after 7 days
- Tokens are validated on every protected request

### 3. Role-Based Access Control
- Admin tokens must contain `adminId` field
- Regular user/student tokens are rejected
- Admin-only endpoints are protected by `authenticateAdmin` middleware

### 4. Event Management Restrictions
- Event creation (`POST /api/events`) requires admin authentication
- Event updates (`PUT /api/events/:id`) require admin authentication
- Event deletion (`DELETE /api/events/:id`) requires admin authentication

### 5. SQL Injection Protection
- All database queries use parameterized statements
- User input is validated and sanitized

---

## Complete Workflow Example

### 1. Create Admin User
```bash
node scripts/create-admin.js
```

### 2. Login as Admin
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**Save the token from the response.**

### 3. Get Admin Profile
```bash
curl -X GET http://localhost:3000/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. View All Events
```bash
curl -X GET http://localhost:3000/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Create New Event (Admin Only)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Case Competition",
    "description": "Description here",
    "rubric": ["Criteria 1", "Criteria 2"],
    "slots": [],
    "teams": []
  }'
```

### 6. Update Event Status
```bash
curl -X PUT http://localhost:3000/admin/events/EVT-1234567890-abc123/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

---

## Testing

See `TEST_ADMIN_API.md` for comprehensive PowerShell testing commands.

---

## File Structure

```
Case-Competition-Backend/
├── models/
│   └── admin.model.js              # Admin table schema
├── repositories/
│   └── admin.repository.js         # Database operations
├── services/
│   └── admin.service.js            # Business logic
├── controllers/
│   └── admin.controller.js         # HTTP request handlers
├── routes/
│   └── admin.routes.js             # API routes
├── middleware/
│   └── adminAuth.js                # Admin authentication middleware
├── scripts/
│   ├── init-db.js                  # Database initialization (includes admins)
│   └── create-admin.js             # Create initial admin user
└── ADMIN_API_DOCUMENTATION.md      # This file
```

---

## Differences from User/Student Authentication

1. **Separate Table:** Admins use `admins` table, not `users` or `students`
2. **Separate Tokens:** Admin tokens contain `adminId`, user tokens contain `userId`
3. **Separate Middleware:** Uses `authenticateAdmin` instead of `authenticate`
4. **Elevated Privileges:** Admins can manage events and view all users
5. **No Profile System:** Admins don't have extended profiles (only basic info in PostgreSQL)

---

## Next Steps

1. ✅ Database table created
2. ✅ Admin user created
3. ✅ Backend endpoints implemented
4. ⏳ Test all endpoints
5. ⏳ Integrate with frontend
6. ⏳ Set up production admin accounts

---

## Support

For additional information, see:
- `ADMIN_QUICK_START.md` - Quick setup guide
- `ADMIN_SETUP_CHECKLIST.md` - Setup checklist
- `ADMIN_DATA_FLOW.md` - Data flow documentation
- `TEST_ADMIN_API.md` - Testing commands

