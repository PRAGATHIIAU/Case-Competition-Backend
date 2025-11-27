# Events API Endpoints Documentation

This document describes the new Events module API endpoints for teams, rubrics, scoring, and leaderboard.

## Table of Contents
1. [GET /events/:eventId/teams](#get-eventsteams)
2. [GET /events/:eventId/rubrics](#get-eventsrubrics)
3. [POST /events/:eventId/score](#post-eventsscore)
4. [GET /events/:eventId/leaderboard](#get-eventsleaderboard)

---

## GET /events/:eventId/teams

Returns a list of teams for an event with their members and total scores.

### Endpoint
```
GET /api/events/:eventId/teams
```

### Path Parameters
- `eventId` (string, required) - The ID of the event

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Teams retrieved successfully",
  "data": [
    {
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002", "STU-003"],
      "totalScore": 85.5
    },
    {
      "teamId": "TEAM-002",
      "teamName": "Team Beta",
      "members": ["STU-004", "STU-005"],
      "totalScore": 92.0
    }
  ],
  "count": 2
}
```

**Error (404 Not Found)**
```json
{
  "success": false,
  "message": "Event not found",
  "error": "Event not found"
}
```

**Error (400 Bad Request)**
```json
{
  "success": false,
  "message": "Failed to retrieve teams",
  "error": "Event ID is required and must be a valid string"
}
```

### Example Request
```bash
curl -X GET http://localhost:3000/api/events/EVT-123/teams
```

---

## GET /events/:eventId/rubrics

Returns the rubrics (evaluation criteria) for an event.

### Endpoint
```
GET /api/events/:eventId/rubrics
```

### Path Parameters
- `eventId` (string, required) - The ID of the event

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Rubrics retrieved successfully",
  "data": [
    {
      "rubricId": "RUB-001",
      "name": "Technical Implementation",
      "maxScore": 30,
      "weight": 0.4
    },
    {
      "rubricId": "RUB-002",
      "name": "Presentation Quality",
      "maxScore": 25,
      "weight": 0.3
    },
    {
      "rubricId": "RUB-003",
      "name": "Innovation",
      "maxScore": 20,
      "weight": 0.3
    }
  ],
  "count": 3
}
```

**Error (404 Not Found)**
```json
{
  "success": false,
  "message": "Event not found",
  "error": "Event not found"
}
```

### Example Request
```bash
curl -X GET http://localhost:3000/api/events/EVT-123/rubrics
```

---

## POST /events/:eventId/score

Allows a judge to submit rubric-wise scores for a team. This operation is atomic and validates:
- Judge exists and has "approved" status
- Team exists in the event
- All rubric IDs are valid
- Scores do not exceed maximum scores

### Endpoint
```
POST /api/events/:eventId/score
```

### Path Parameters
- `eventId` (string, required) - The ID of the event

### Request Body
```json
{
  "judgeId": "JUDGE-001",
  "teamId": "TEAM-001",
  "scores": [
    {
      "rubricId": "RUB-001",
      "score": 28
    },
    {
      "rubricId": "RUB-002",
      "score": 22
    },
    {
      "rubricId": "RUB-003",
      "score": 18
    }
  ]
}
```

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Scores submitted successfully",
  "data": {
    "eventId": "EVT-123",
    "eventInfo": {
      "name": "Hackathon 2024",
      "description": "Annual coding competition",
      "date": "2024-06-15T10:00:00Z"
    },
    "teams": [...],
    "rubrics": [...],
    "judges": [...],
    "scores": [
      {
        "judgeId": "JUDGE-001",
        "teamId": "TEAM-001",
        "rubricId": "RUB-001",
        "score": 28,
        "timestamp": "2024-06-15T14:30:00Z"
      },
      {
        "judgeId": "JUDGE-001",
        "teamId": "TEAM-001",
        "rubricId": "RUB-002",
        "score": 22,
        "timestamp": "2024-06-15T14:30:00Z"
      },
      {
        "judgeId": "JUDGE-001",
        "teamId": "TEAM-001",
        "rubricId": "RUB-003",
        "score": 18,
        "timestamp": "2024-06-15T14:30:00Z"
      }
    ],
    "createdAt": "2024-06-01T00:00:00Z",
    "updatedAt": "2024-06-15T14:30:00Z"
  }
}
```

**Error (400 Bad Request) - Missing Fields**
```json
{
  "success": false,
  "message": "Missing required fields",
  "error": "judgeId, teamId, and scores are required"
}
```

**Error (400 Bad Request) - Judge Not Approved**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Judge is not approved. Only approved judges can submit scores."
}
```

**Error (400 Bad Request) - Score Exceeds Maximum**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Score 35 exceeds maximum score 30 for rubric Technical Implementation"
}
```

**Error (404 Not Found)**
```json
{
  "success": false,
  "message": "Event not found",
  "error": "Event not found"
}
```

### Example Request
```bash
curl -X POST http://localhost:3000/api/events/EVT-123/score \
  -H "Content-Type: application/json" \
  -d '{
    "judgeId": "JUDGE-001",
    "teamId": "TEAM-001",
    "scores": [
      {"rubricId": "RUB-001", "score": 28},
      {"rubricId": "RUB-002", "score": 22},
      {"rubricId": "RUB-003", "score": 18}
    ]
  }'
```

---

## GET /events/:eventId/leaderboard

Returns a ranked leaderboard of teams based on weighted scores from all judges.

### Endpoint
```
GET /api/events/:eventId/leaderboard
```

### Path Parameters
- `eventId` (string, required) - The ID of the event

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": [
    {
      "rank": 1,
      "teamId": "TEAM-002",
      "teamName": "Team Beta",
      "members": ["STU-004", "STU-005"],
      "finalScore": 92.45
    },
    {
      "rank": 2,
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002", "STU-003"],
      "finalScore": 87.23
    },
    {
      "rank": 3,
      "teamId": "TEAM-003",
      "teamName": "Team Gamma",
      "members": ["STU-006", "STU-007", "STU-008"],
      "finalScore": 75.67
    }
  ],
  "count": 3
}
```

### Scoring Algorithm

The leaderboard uses a weighted scoring system:

1. **Normalize scores per rubric**: `normalizedScore = score / maxScore`
2. **Apply weight**: `weightedScore = normalizedScore * weight`
3. **Sum weighted scores**: Sum all weighted scores from all judges for all rubrics
4. **Calculate final score**: `finalScore = (totalWeightedScore / totalWeight) * 100`

The final score is scaled to 100 and rounded to 2 decimal places.

**Note**: If multiple scores exist for the same judge+team+rubric combination, the latest score (by timestamp) is used.

**Error (404 Not Found)**
```json
{
  "success": false,
  "message": "Event not found",
  "error": "Event not found"
}
```

### Example Request
```bash
curl -X GET http://localhost:3000/api/events/EVT-123/leaderboard
```

---

## Events Table Structure

The Events table in DynamoDB has the following structure:

```json
{
  "eventId": "EVT-123",
  "eventInfo": {
    "name": "Hackathon 2024",
    "description": "Annual coding competition",
    "date": "2024-06-15T10:00:00Z"
  },
  "teams": [
    {
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002", "STU-003"]
    }
  ],
  "rubrics": [
    {
      "rubricId": "RUB-001",
      "name": "Technical Implementation",
      "maxScore": 30,
      "weight": 0.4
    }
  ],
  "judges": [
    {
      "judgeId": "JUDGE-001",
      "status": "approved"
    },
    {
      "judgeId": "JUDGE-002",
      "status": "pending"
    }
  ],
  "scores": [
    {
      "judgeId": "JUDGE-001",
      "teamId": "TEAM-001",
      "rubricId": "RUB-001",
      "score": 28,
      "timestamp": "2024-06-15T14:30:00Z"
    }
  ],
  "createdAt": "2024-06-01T00:00:00Z",
  "updatedAt": "2024-06-15T14:30:00Z"
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description"
}
```

### Common HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Notes

1. **Atomic Operations**: Score submission uses DynamoDB's atomic `list_append` operation to ensure data consistency.

2. **Validation**: All endpoints validate:
   - Event existence
   - Judge approval status (for score submission)
   - Team existence
   - Rubric validity
   - Score limits (score ≤ maxScore)

3. **Performance**: All operations use DynamoDB primary key lookups (no table scans) for optimal performance.

4. **Data Consistency**: The leaderboard calculation uses the latest score when multiple scores exist for the same judge+team+rubric combination.

