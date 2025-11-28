# Complete Admin & Events API Guide

This document provides a comprehensive guide to all available endpoints, data structures, and operations.

---

## 🔐 ADMIN ENDPOINTS

All admin endpoints (except login) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### 1. POST /admin/login
**Purpose:** Authenticate as admin and get JWT token

**Request:**
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Response:**
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

**PowerShell:**
```powershell
$body = @{ email = "admin@test.com"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
```

---

### 2. GET /admin/profile
**Purpose:** Get admin profile information

**Headers:** `Authorization: Bearer <token>`

**Response:**
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

**PowerShell:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 3. GET /admin/events
**Purpose:** Get all events (admin view)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "eventInfo": {
        "name": "Case Competition 2024",
        "description": "Annual case competition event",
        "date": "2024-04-15T09:00:00Z"
      },
      "teams": [],
      "rubrics": [],
      "judges": [],
      "scores": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 4. PUT /admin/events/:id/status
**Purpose:** Update event status (e.g., "approved", "pending", "cancelled")

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "status": "approved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event status updated successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "status": "approved",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**PowerShell:**
```powershell
$updateBody = @{ status = "approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/admin/events/EVT-1234567890-abc123/status" -Method PUT -Headers $headers -Body $updateBody | ConvertTo-Json
```

---

### 5. GET /admin/students
**Purpose:** Get all students (requires studentRepository)

**Headers:** `Authorization: Bearer <token>`

**Status:** ⚠️ Needs `repositories/student.repository.js` with `getAllStudents()` method

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/students" -Method GET -Headers $headers | ConvertTo-Json
```

---

### 6. GET /admin/alumni
**Purpose:** Get all alumni (requires alumniRepository)

**Headers:** `Authorization: Bearer <token>`

**Status:** ⚠️ Needs `repositories/alumni.repository.js` with `getAllAlumni()` method

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/alumni" -Method GET -Headers $headers | ConvertTo-Json
```

---

## 📅 EVENTS API ENDPOINTS

These endpoints are public (no authentication required) unless specified.

### 1. GET /api/events
**Purpose:** Get all events

**Response:**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "eventInfo": {
        "name": "Case Competition 2024",
        "description": "Annual case competition event",
        "date": "2024-04-15T09:00:00Z"
      },
      "teams": [],
      "rubrics": [],
      "judges": [],
      "scores": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method GET | ConvertTo-Json
```

---

### 2. GET /api/events/:id
**Purpose:** Get a specific event by ID

**Response:**
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "eventInfo": {
      "name": "Case Competition 2024",
      "description": "Annual case competition event"
    },
    "teams": [],
    "rubrics": [],
    "judges": [],
    "scores": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123" -Method GET | ConvertTo-Json
```

---

### 3. POST /api/events
**Purpose:** Create a new event

**Request Body Structure:**
```json
{
  "eventInfo": {
    "name": "Case Competition 2024",
    "description": "Annual case competition event",
    "date": "2024-04-15T09:00:00Z"
  },
  "teams": [
    {
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002"]
    }
  ],
  "rubrics": [
    {
      "rubricId": "RUB-001",
      "name": "Presentation Quality",
      "maxScore": 25,
      "weight": 0.3
    },
    {
      "rubricId": "RUB-002",
      "name": "Solution Quality",
      "maxScore": 50,
      "weight": 0.5
    }
  ],
  "judges": [
    {
      "judgeId": "JUDGE-001",
      "status": "approved"
    }
  ],
  "scores": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "eventInfo": {
      "name": "Case Competition 2024",
      "description": "Annual case competition event"
    },
    "teams": [],
    "rubrics": [],
    "judges": [],
    "scores": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**PowerShell:**
```powershell
$eventBody = @{
    eventInfo = @{
        name = "Case Competition 2024"
        description = "Annual case competition event"
        date = "2024-04-15T09:00:00Z"
    }
    teams = @()
    rubrics = @(
        @{
            rubricId = "RUB-001"
            name = "Presentation Quality"
            maxScore = 25
            weight = 0.3
        }
    )
    judges = @()
    scores = @()
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method POST -Body $eventBody -ContentType "application/json" | ConvertTo-Json
```

---

### 4. PUT /api/events/:id
**Purpose:** Update an existing event

**Request:** (You can update any fields)
```json
{
  "eventInfo": {
    "name": "Updated Event Name",
    "description": "Updated description"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "eventInfo": {
      "name": "Updated Event Name",
      "description": "Updated description"
    },
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**PowerShell:**
```powershell
$updateBody = @{
    eventInfo = @{
        name = "Updated Event Name"
        description = "Updated description"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123" -Method PUT -Body $updateBody -ContentType "application/json" | ConvertTo-Json
```

---

### 5. DELETE /api/events/:id
**Purpose:** Delete an event

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123" -Method DELETE | ConvertTo-Json
```

---

### 6. GET /api/events/:eventId/teams
**Purpose:** Get all teams for an event with their total scores

**Response:**
```json
{
  "success": true,
  "message": "Teams retrieved successfully",
  "data": [
    {
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002"],
      "totalScore": 85
    }
  ],
  "count": 1
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123/teams" -Method GET | ConvertTo-Json
```

---

### 7. GET /api/events/:eventId/rubrics
**Purpose:** Get all rubrics for an event

**Response:**
```json
{
  "success": true,
  "message": "Rubrics retrieved successfully",
  "data": [
    {
      "rubricId": "RUB-001",
      "name": "Presentation Quality",
      "maxScore": 25,
      "weight": 0.3
    },
    {
      "rubricId": "RUB-002",
      "name": "Solution Quality",
      "maxScore": 50,
      "weight": 0.5
    }
  ],
  "count": 2
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123/rubrics" -Method GET | ConvertTo-Json
```

---

### 8. POST /api/events/:eventId/score
**Purpose:** Submit scores for a team (judges only)

**Request:**
```json
{
  "judgeId": "JUDGE-001",
  "teamId": "TEAM-001",
  "scores": [
    {
      "rubricId": "RUB-001",
      "score": 20
    },
    {
      "rubricId": "RUB-002",
      "score": 45
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scores submitted successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "scores": [
      {
        "judgeId": "JUDGE-001",
        "teamId": "TEAM-001",
        "rubricId": "RUB-001",
        "score": 20,
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**PowerShell:**
```powershell
$scoreBody = @{
    judgeId = "JUDGE-001"
    teamId = "TEAM-001"
    scores = @(
        @{
            rubricId = "RUB-001"
            score = 20
        },
        @{
            rubricId = "RUB-002"
            score = 45
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123/score" -Method POST -Body $scoreBody -ContentType "application/json" | ConvertTo-Json
```

---

### 9. GET /api/events/:eventId/leaderboard
**Purpose:** Get ranked leaderboard with final weighted scores

**Response:**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": [
    {
      "rank": 1,
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002"],
      "finalScore": 87.5
    },
    {
      "rank": 2,
      "teamId": "TEAM-002",
      "teamName": "Team Beta",
      "members": ["STU-003", "STU-004"],
      "finalScore": 82.3
    }
  ],
  "count": 2
}
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123/leaderboard" -Method GET | ConvertTo-Json
```

---

### 10. POST /api/events/:id/register
**Purpose:** Register alumni as judge for an event (sends email to admin)

**Request:**
```json
{
  "alumniEmail": "alumni@example.com",
  "alumniName": "John Doe",
  "preferredDateTime": "2024-03-15T09:00:00Z",
  "preferredLocation": "Main Hall"
}
```

**Response:**
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

**PowerShell:**
```powershell
$registerBody = @{
    alumniEmail = "alumni@example.com"
    alumniName = "John Doe"
    preferredDateTime = "2024-03-15T09:00:00Z"
    preferredLocation = "Main Hall"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/events/EVT-1234567890-abc123/register" -Method POST -Body $registerBody -ContentType "application/json" | ConvertTo-Json
```

---

## 📊 DATA STRUCTURES

### Event Object Structure
```json
{
  "eventId": "string (auto-generated: EVT-timestamp-random)",
  "eventInfo": {
    "name": "string (required)",
    "description": "string (required)",
    "date": "string (ISO 8601, optional)"
  },
  "teams": [
    {
      "teamId": "string (required)",
      "teamName": "string (required)",
      "members": ["string array of student IDs"]
    }
  ],
  "rubrics": [
    {
      "rubricId": "string (required)",
      "name": "string (required)",
      "maxScore": "number (required, > 0)",
      "weight": "number (required, >= 0)"
    }
  ],
  "judges": [
    {
      "judgeId": "string (required)",
      "status": "string (required: 'approved' | 'pending')"
    }
  ],
  "scores": [
    {
      "judgeId": "string (required)",
      "teamId": "string (required)",
      "rubricId": "string (required)",
      "score": "number (required, >= 0, <= maxScore)",
      "timestamp": "string (ISO 8601, auto-generated)"
    }
  ],
  "createdAt": "string (ISO 8601, auto-generated)",
  "updatedAt": "string (ISO 8601, auto-generated)"
}
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLES

### Example 1: Create Event with Teams and Rubrics
```powershell
$eventBody = @{
    eventInfo = @{
        name = "Spring Case Competition 2024"
        description = "Annual spring case competition"
        date = "2024-04-15T09:00:00Z"
    }
    teams = @(
        @{
            teamId = "TEAM-001"
            teamName = "Team Alpha"
            members = @("STU-001", "STU-002", "STU-003")
        },
        @{
            teamId = "TEAM-002"
            teamName = "Team Beta"
            members = @("STU-004", "STU-005")
        }
    )
    rubrics = @(
        @{
            rubricId = "RUB-001"
            name = "Presentation"
            maxScore = 30
            weight = 0.3
        },
        @{
            rubricId = "RUB-002"
            name = "Solution Quality"
            maxScore = 50
            weight = 0.5
        },
        @{
            rubricId = "RUB-003"
            name = "Teamwork"
            maxScore = 20
            weight = 0.2
        }
    )
    judges = @(
        @{
            judgeId = "JUDGE-001"
            status = "approved"
        }
    )
    scores = @()
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method POST -Body $eventBody -ContentType "application/json"
$eventId = $response.data.eventId
Write-Host "Created event: $eventId"
```

### Example 2: Submit Scores and View Leaderboard
```powershell
# Submit scores for Team Alpha
$scoreBody = @{
    judgeId = "JUDGE-001"
    teamId = "TEAM-001"
    scores = @(
        @{ rubricId = "RUB-001"; score = 28 }
        @{ rubricId = "RUB-002"; score = 45 }
        @{ rubricId = "RUB-003"; score = 18 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/events/$eventId/score" -Method POST -Body $scoreBody -ContentType "application/json"

# View leaderboard
Invoke-RestMethod -Uri "http://localhost:3000/api/events/$eventId/leaderboard" -Method GET | ConvertTo-Json
```

---

## ✅ SUMMARY

### Admin Endpoints (6 total)
- ✅ Login
- ✅ Get Profile
- ✅ Get All Events
- ✅ Update Event Status
- ⚠️ Get Students (needs repository)
- ⚠️ Get Alumni (needs repository)

### Events Endpoints (10 total)
- ✅ Get All Events
- ✅ Get Event by ID
- ✅ Create Event
- ✅ Update Event
- ✅ Delete Event
- ✅ Get Teams
- ✅ Get Rubrics
- ✅ Submit Scores
- ✅ Get Leaderboard
- ✅ Register as Judge

### What You Can Do
1. **Create** events with teams, rubrics, judges
2. **Read** all events or specific event
3. **Update** event information
4. **Delete** events
5. **Submit** scores for teams
6. **View** leaderboards with weighted scores
7. **Manage** events as admin (view all, update status)

---

## 🚀 Quick Start Commands

```powershell
# 1. Login as admin
$body = @{ email = "admin@test.com"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
$headers = @{ Authorization = "Bearer $token" }

# 2. View all events (admin)
Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers | ConvertTo-Json

# 3. Create an event
$event = @{ eventInfo = @{ name = "Test Event"; description = "Test" }; teams = @(); rubrics = @(); judges = @(); scores = @() } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method POST -Body $event -ContentType "application/json" | ConvertTo-Json
```

