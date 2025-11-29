# Admin Data Flow

This document explains how admin data is stored and managed in the Case Competition Backend.

## Data Storage Strategy

### PostgreSQL RDS (Single Source of Truth)

Unlike Students and Alumni which use a hybrid RDS + DynamoDB architecture, **Admins use only PostgreSQL** for data storage.

**Table:** `admins`

**Fields:**
- `id` (SERIAL, Primary Key)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `role` (VARCHAR, default: 'admin')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Why PostgreSQL Only?**
- Admins have simple, structured data (no extended profiles needed)
- Fast authentication lookups (indexed email)
- No need for flexible schema (unlike user profiles)
- Simpler architecture for admin management

---

## Authentication Flow

### Login Process

#### Request
```
POST /admin/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "admin123"
}
```

#### Process
1. **Validate Input**
   - Check email and password are provided
   - Trim email whitespace

2. **Query Database**
   - Look up admin by email in `admins` table
   - Use indexed email for fast lookup

3. **Verify Password**
   - Compare provided password with stored `password_hash`
   - Use bcrypt.compare() for secure comparison

4. **Generate JWT Token**
   - Create token with payload: `{ adminId, email, role }`
   - Sign with JWT_SECRET
   - Set expiration: 7 days

5. **Return Response**
   - Remove password_hash from response
   - Return admin data + token

#### Response
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

---

## Protected Endpoint Flow

### Request Flow

```
Client Request
    ↓
Express Route (admin.routes.js)
    ↓
authenticateAdmin Middleware
    ↓
[Token Validation]
    ↓
[Check adminId in token]
    ↓
Attach admin info to req.admin
    ↓
Controller (admin.controller.js)
    ↓
Service (admin.service.js)
    ↓
Repository (admin.repository.js)
    ↓
PostgreSQL Database
```

### Token Validation Process

1. **Extract Token**
   - Get Authorization header
   - Extract token from "Bearer <token>" format

2. **Verify Token**
   - Verify JWT signature using JWT_SECRET
   - Check token expiration
   - Decode token payload

3. **Validate Admin Token**
   - Check if token contains `adminId` field
   - Reject if token is for user/student (has `userId` instead)

4. **Attach to Request**
   - Add admin info to `req.admin`:
     ```javascript
     req.admin = {
       adminId: decoded.adminId,
       email: decoded.email,
       role: decoded.role
     }
     ```

5. **Continue to Controller**
   - If validation passes, proceed to route handler
   - If validation fails, return 401/403 error

---

## Get Profile Flow

### Request
```
GET /admin/profile
Authorization: Bearer <token>
```

### Process
1. **Extract Admin ID**
   - Get `adminId` from `req.admin.adminId` (set by middleware)

2. **Query Database**
   - Query `admins` table by `id`
   - SELECT: id, email, first_name, last_name, role, created_at, updated_at
   - Exclude password_hash

3. **Return Response**
   - Return admin data

### Response
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

---

## Get All Students Flow

### Request
```
GET /admin/students
Authorization: Bearer <token>
```

### Process
1. **Validate Admin Token** (middleware)
2. **Call Student Repository**
   - Reuse existing `student.repository.js`
   - Call `getAllStudents()` or `getAll()` method
3. **Return Response**
   - Return array of all students

### Data Source
- **Primary:** PostgreSQL `students` table (via student.repository)
- **Note:** If student repository doesn't exist, returns error

---

## Get All Alumni Flow

### Request
```
GET /admin/alumni
Authorization: Bearer <token>
```

### Process
1. **Validate Admin Token** (middleware)
2. **Call Alumni Repository**
   - Reuse existing `alumni.repository.js` or `user.repository.js`
   - Call `getAllAlumni()` or `getAll()` method
3. **Return Response**
   - Return array of all alumni/users

### Data Source
- **Primary:** PostgreSQL `users` table (via user.repository)
- **Note:** If alumni repository doesn't exist, returns error

---

## Get All Events Flow

### Request
```
GET /admin/events
Authorization: Bearer <token>
```

### Process
1. **Validate Admin Token** (middleware)
2. **Call Event Repository**
   - Reuse existing `event.repository.js`
   - Call `getAllEvents()` method
3. **Return Response**
   - Return array of all events

### Data Source
- **Primary:** DynamoDB `Events` table (via event.repository)
- **Note:** Events are stored in DynamoDB, accessed via API Gateway → Lambda

---

## Update Event Status Flow

### Request
```
PUT /admin/events/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved"
}
```

### Process
1. **Validate Admin Token** (middleware)
2. **Extract Parameters**
   - Get event ID from URL params
   - Get status from request body
3. **Validate Input**
   - Check status is provided and is a valid string
4. **Update Event**
   - Call `eventRepository.updateEvent(eventId, { status })`
   - This updates DynamoDB via API Gateway → Lambda
5. **Return Response**
   - Return updated event data

### Data Source
- **Primary:** DynamoDB `Events` table (via event.repository → API Gateway → Lambda)

---

## Admin Creation Flow

### Script Execution
```
node scripts/create-admin.js
```

### Process
1. **Check Table Exists**
   - Query PostgreSQL to verify `admins` table exists
   - Exit with error if table doesn't exist

2. **Check Existing Admin**
   - Query `admins` table by email
   - Exit if admin already exists

3. **Hash Password**
   - Use bcrypt.hash() with 10 salt rounds
   - Generate password_hash

4. **Insert Admin**
   - INSERT into `admins` table:
     - email
     - password_hash
     - first_name
     - last_name
     - role (default: 'admin')
   - RETURNING: id, email, first_name, last_name, role, created_at

5. **Return Success**
   - Display admin details
   - Show login credentials

---

## Event Management Flow (Admin-Only)

### Create Event
```
POST /api/events
Authorization: Bearer <admin_token>
```

**Flow:**
1. `authenticateAdmin` middleware validates admin token
2. Controller receives request
3. Service validates event data
4. Repository sends to API Gateway → Lambda → DynamoDB
5. Event created in DynamoDB

### Update Event
```
PUT /api/events/:id
Authorization: Bearer <admin_token>
```

**Flow:**
1. `authenticateAdmin` middleware validates admin token
2. Controller receives request
3. Service validates update data
4. Repository sends to API Gateway → Lambda → DynamoDB
5. Event updated in DynamoDB

### Delete Event
```
DELETE /api/events/:id
Authorization: Bearer <admin_token>
```

**Flow:**
1. `authenticateAdmin` middleware validates admin token
2. Controller receives request
3. Service validates event exists
4. Repository sends to API Gateway → Lambda → DynamoDB
5. Event deleted from DynamoDB

---

## Token Lifecycle

### Token Generation
- **Trigger:** Successful admin login
- **Payload:** `{ adminId, email, role }`
- **Expiration:** 7 days
- **Secret:** JWT_SECRET (from environment)

### Token Usage
- **Storage:** Client stores token (localStorage, sessionStorage, etc.)
- **Transmission:** Sent in `Authorization: Bearer <token>` header
- **Validation:** Every protected request validates token

### Token Expiration
- **After 7 days:** Token becomes invalid
- **Response:** 401 Unauthorized with "Token expired" message
- **Action Required:** Admin must login again to get new token

---

## Error Handling Flow

### Authentication Errors

**Missing Token:**
```
Request: GET /admin/profile (no Authorization header)
Response: 401 Unauthorized
{
  "success": false,
  "message": "Authentication required",
  "error": "No authorization header provided"
}
```

**Invalid Token:**
```
Request: GET /admin/profile (invalid token)
Response: 401 Unauthorized
{
  "success": false,
  "message": "Invalid token",
  "error": "Token verification failed"
}
```

**Expired Token:**
```
Request: GET /admin/profile (expired token)
Response: 401 Unauthorized
{
  "success": false,
  "message": "Token expired",
  "error": "Please login again"
}
```

**Non-Admin Token:**
```
Request: GET /admin/profile (user/student token)
Response: 403 Forbidden
{
  "success": false,
  "message": "Forbidden",
  "error": "Admin access required"
}
```

---

## Data Consistency

### Single Source of Truth
- **Admins:** PostgreSQL `admins` table only
- **No Data Duplication:** All admin data in one place
- **No Merging Required:** Unlike students/alumni, no need to merge RDS + DynamoDB

### Transaction Safety
- **Atomic Operations:** All admin operations are atomic (single database transaction)
- **No Partial Updates:** Either complete success or complete failure

---

## Benefits of PostgreSQL-Only Architecture

1. **Simplicity:** Single database, no data merging needed
2. **Performance:** Fast lookups with indexed email
3. **Consistency:** No sync issues between databases
4. **Cost:** Lower cost (no DynamoDB needed for admins)
5. **Maintenance:** Easier to maintain and debug

---

## Comparison with Other User Types

| Feature | Admins | Students | Alumni |
|---------|--------|----------|--------|
| **Database** | PostgreSQL only | PostgreSQL + DynamoDB | PostgreSQL + DynamoDB |
| **Table** | `admins` | `students` + `student_profiles` | `users` + `alumni_profiles` |
| **ID Type** | Integer (SERIAL) | UUID | Integer (SERIAL) |
| **Extended Profile** | No | Yes (DynamoDB) | Yes (DynamoDB) |
| **Resume Upload** | No | Yes (S3) | Yes (S3) |
| **Token Field** | `adminId` | `studentId` | `userId` |

---

## Security Considerations

1. **Password Hashing:** All passwords hashed with bcrypt (10 rounds)
2. **Token Security:** Tokens signed with secret key, expire after 7 days
3. **SQL Injection:** All queries use parameterized statements
4. **Token Validation:** Every request validates token signature and expiration
5. **Role Separation:** Admin tokens cannot be used for user endpoints and vice versa

---

## Summary

The Admin module uses a **simple, single-database architecture**:
- All data stored in PostgreSQL `admins` table
- No DynamoDB or S3 needed
- Fast authentication with indexed email lookups
- JWT tokens for secure API access
- Reuses existing repositories for students/alumni/events data access

This architecture is optimized for admin management where simplicity and security are prioritized over flexible schema requirements.

