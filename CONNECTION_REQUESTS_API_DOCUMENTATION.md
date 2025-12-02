# Connection Requests API Documentation

## Overview

This API manages connection requests between students and mentors/alumni. Students can send connection requests to mentors, and mentors can accept, decline, or delete these requests.

## Database Table

The `connection_requests` table has the following structure:

```sql
CREATE TABLE connection_requests (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL,
  mentor_id INTEGER NOT NULL,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined'))
);
```

**Note:** Run `node scripts/create-connection-requests-table.js` to create the table.

## Endpoints

### 1. Create Connection Request

**POST** `/api/connection-requests`

Creates a new connection request from a student to a mentor with status "pending".

**Request Body:**
```json
{
  "student_id": "STU-123",
  "mentor_id": 1,
  "message": "I would like to connect with you regarding career guidance."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Connection request created successfully",
  "data": {
    "id": 1,
    "student_id": "STU-123",
    "mentor_id": 1,
    "message": "I would like to connect with you regarding career guidance.",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/connection-requests \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU-123",
    "mentor_id": 1,
    "message": "I would like to connect with you."
  }'
```

---

### 2. Accept Connection Request

**PUT** `/api/connection-requests/:id/accept`

Accepts a connection request, changing status from "pending" to "accepted".

**Path Parameters:**
- `id` (number) - Connection request ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection request accepted successfully",
  "data": {
    "id": 1,
    "student_id": "STU-123",
    "mentor_id": 1,
    "message": "I would like to connect with you regarding career guidance.",
    "status": "accepted",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:5000/api/connection-requests/1/accept
```

---

### 3. Decline Connection Request

**PUT** `/api/connection-requests/:id/decline`

Declines a connection request, changing status from "pending" to "declined".

**Path Parameters:**
- `id` (number) - Connection request ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection request declined successfully",
  "data": {
    "id": 1,
    "student_id": "STU-123",
    "mentor_id": 1,
    "message": "I would like to connect with you regarding career guidance.",
    "status": "declined",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:5000/api/connection-requests/1/decline
```

---

### 4. Get All Requests for a Mentor

**GET** `/api/connection-requests/mentor/:mentorId`

Retrieves all connection requests (pending, accepted, declined) for a specific mentor.

**Path Parameters:**
- `mentorId` (number) - Mentor ID (user ID from users table)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection requests retrieved successfully",
  "data": [
    {
      "id": 1,
      "student_id": "STU-123",
      "mentor_id": 1,
      "message": "I would like to connect with you.",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "student_id": "STU-456",
      "mentor_id": 1,
      "message": "Looking for mentorship in software engineering.",
      "status": "accepted",
      "created_at": "2024-01-14T09:00:00.000Z",
      "updated_at": "2024-01-14T09:15:00.000Z"
    }
  ],
  "count": 2
}
```

**Example:**
```bash
curl -X GET http://localhost:5000/api/connection-requests/mentor/1
```

---

### 5. Delete Connection Request

**DELETE** `/api/connection-requests/:id`

Deletes a connection request from the database.

**Path Parameters:**
- `id` (number) - Connection request ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection request deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/connection-requests/1
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "error": "student_id is required and must be a valid string"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Connection request not found",
  "error": "Connection request not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create connection request",
  "error": "Error message details"
}
```

---

## Status Values

- `pending` - Request is waiting for mentor response (default)
- `accepted` - Mentor has accepted the request
- `declined` - Mentor has declined the request

---

## Setup Instructions

1. **Create the database table:**
   ```bash
   node scripts/create-connection-requests-table.js
   ```

2. **Verify the table was created:**
   ```sql
   SELECT * FROM connection_requests;
   ```

---

## Notes

- The `mentor_id` must reference an existing user in the `users` table
- The `student_id` is stored as a string (can be UUID or any identifier)
- Status can only be: `pending`, `accepted`, or `declined`
- All endpoints include logging for tracking requests
- The `updated_at` timestamp is automatically updated when status changes

