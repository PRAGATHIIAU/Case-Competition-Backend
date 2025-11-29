# Admin Module – Frontend Integration Guide

This guide explains how a frontend (React, Angular, Vue, etc.) should integrate with the **Admin** part of this backend.

It focuses on:
- How to log in as an admin and store the token
- How to call protected admin endpoints
- How to manage events with admin-only permissions
- Common patterns, headers, and error handling

---

## 1. Base URLs & Routing

- **Backend base URL (local dev)**: `http://localhost:3000`
- **Admin base path**: `/admin`
- **Events base path**: `/api/events`

All admin endpoints (except login) require a **JWT token** in the `Authorization` header.

```text
Authorization: Bearer <admin_jwt_token>
```

---

## 2. Admin Login Flow

### Endpoint
- **POST** `/admin/login`

### Request
- **Content-Type**: `application/json`

```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

### Successful Response (200)

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

### Frontend Usage Pattern

1. **Submit login form** to `/admin/login`
2. On success:
   - Save `data.token` in secure storage (see below)
   - Save minimal admin info (`id`, `email`, `role`) in app state
3. Redirect to admin dashboard

### Token Storage Recommendations

- **Preferred**: HTTP-only secure cookie (set by your frontend/backend deployment setup)
- **Simple dev option**: `localStorage` or `sessionStorage`

Example (React):

```ts
// after successful login
localStorage.setItem("adminToken", response.data.token);
localStorage.setItem("adminInfo", JSON.stringify(response.data.admin));
```

Then attach token on each admin request:

```ts
const token = localStorage.getItem("adminToken");

const headers = {
  Authorization: `Bearer ${token}`,
};
```

---

## 3. Authenticated Admin Requests

All admin-protected endpoints expect:

```text
Authorization: Bearer <admin_jwt_token>
```

If:
- Token is missing/invalid → **401 Unauthorized**
- Token is valid but not an admin token (no `adminId`) → **403 Forbidden**

### Example Axios Instance (Recommended)

```ts
import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Use `adminApi` for all admin and admin-protected event endpoints.

---

## 4. Admin Profile

### Get Current Admin Profile

- **GET** `/admin/profile`

Headers:

```text
Authorization: Bearer <token>
```

Response (200):

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

Frontend usage:
- Call this on app load (if token exists) to validate session and hydrate admin context/state.

---

## 5. Admin: Students & Alumni Lists

These endpoints are useful for admin dashboards showing lists of users.

### Get All Students

- **GET** `/admin/students`

Response structure:

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

### Get All Alumni

- **GET** `/admin/alumni`

Response structure (simplified):

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

Frontend tips:
- Use `data` array to render tables.
- Use `count` for pagination/summary.

---

## 6. Admin: Events Management

There are **two kinds** of event endpoints:
- **Public** events API: `/api/events/...`
- **Admin view**: `/admin/events`

### 6.1 List All Events (Admin View)

- **GET** `/admin/events`

Headers:

```text
Authorization: Bearer <token>
```

Response structure (simplified):

```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "title": "Case Competition 2024",
      "description": "Annual case competition event",
      "photos": [],
      "rubric": ["Criteria 1", "Criteria 2"],
      "slots": [],
      "teams": [],
      "status": "approved",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

Use this to power:
- Admin events table
- Filters by `status`
- Links to event detail pages

### 6.2 Create Event (Admin Only)

- **POST** `/api/events`

Headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

Body example:

```json
{
  "title": "Case Competition 2024",
  "description": "Annual case competition event",
  "photos": [],
  "rubric": ["Criteria 1", "Criteria 2"],
  "slots": [],
  "teams": []
}
```

Frontend:
- Build a form that matches the expected event schema.
- On success, show confirmation and redirect/refresh list.

### 6.3 Update Event (Admin Only)

- **PUT** `/api/events/:id`

Use this to update **event content** (title, description, rubric, slots, etc.).

Headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

Body (partial update allowed, depending on backend implementation):

```json
{
  "title": "Updated Event Title",
  "description": "Updated description"
}
```

### 6.4 Delete Event (Admin Only)

- **DELETE** `/api/events/:id`

Headers:

```text
Authorization: Bearer <token>
```

Use this for:
- Admin \"Delete\" button in events table
- Always confirm with a modal on frontend before calling this

### 6.5 Update Event Status (Admin Only)

- **PUT** `/admin/events/:id/status`

Use this endpoint for **status changes** only, e.g.:
- `pending` → `approved`
- `approved` → `archived`

Headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "status": "approved"
}
```

Frontend:
- Ideal for a dropdown or buttons (Approve / Reject / Archive).

---

## 7. Error Handling (Frontend)

All endpoints return a consistent error shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Detailed error description (optional)"
}
```

### Common Cases

- **401 Unauthorized**
  - Missing/invalid/expired token
  - Frontend action: 
    - Clear stored token
    - Redirect to admin login page

- **403 Forbidden**
  - Token is valid but not an admin token
  - Frontend action:
    - Show \"Access denied\" message
    - Redirect to a safe page (e.g., home/login)

- **400 Bad Request**
  - Validation errors (e.g., missing status)
  - Frontend action:
    - Show `message` and possibly `error` near the form

- **404 Not Found**
  - Event not found when updating/deleting
  - Frontend action:
    - Show notification and refresh list

---

## 8. Recommended Frontend Architecture

- **Auth Context / Store**
  - Store: `admin`, `adminToken`, `isAdminAuthenticated`
  - Expose: `login(email, password)`, `logout()`, `loadAdminFromToken()`

- **Protected Routes**
  - Admin routes should require:
    - `adminToken` present
    - Optionally, a valid `admin` object (from `/admin/profile`)

- **API Layer**
  - Use a dedicated `adminApi` (Axios/fetch wrapper) with interceptor for headers
  - Keep raw URLs in **one place** to avoid duplication

---

## 9. Quick Integration Checklist

- [ ] Implement Admin Login page hitting `POST /admin/login`
- [ ] Store `token` securely on success
- [ ] Create an API client that attaches `Authorization: Bearer <token>`
- [ ] Protect all admin-only routes in the frontend
- [ ] Use:
  - `GET /admin/profile` to hydrate admin context
  - `GET /admin/events` for admin events table
  - `POST /api/events` for event creation
  - `PUT /api/events/:id` for event edits
  - `DELETE /api/events/:id` for deletions
  - `PUT /admin/events/:id/status` for status updates
- [ ] Handle 401/403 globally (redirect to admin login on auth failures)

Once these are implemented, your frontend will be fully integrated with the admin/backend flows for this case competition platform.


