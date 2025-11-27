# Create Event - Request Body Examples

This document provides valid request body examples for the `POST /api/events` endpoint.

## Endpoint
```
POST /api/events
```

## Minimal Request Body (Required Fields Only)

```json
{
  "eventInfo": {
    "name": "Hackathon 2024",
    "description": "Annual coding competition for students"
  }
}
```

## Complete Request Body (All Fields)

```json
{
  "eventInfo": {
    "name": "Hackathon 2024",
    "description": "Annual coding competition for students to showcase their programming skills",
    "date": "2024-06-15T10:00:00Z",
    "location": "Main Campus Auditorium",
    "organizer": "Computer Science Department"
  },
  "teams": [
    {
      "teamId": "TEAM-001",
      "teamName": "Team Alpha",
      "members": ["STU-001", "STU-002", "STU-003"]
    },
    {
      "teamId": "TEAM-002",
      "teamName": "Team Beta",
      "members": ["STU-004", "STU-005"]
    },
    {
      "teamId": "TEAM-003",
      "teamName": "Team Gamma",
      "members": ["STU-006", "STU-007", "STU-008", "STU-009"]
    }
  ],
  "rubrics": [
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
  "judges": [
    {
      "judgeId": "JUDGE-001",
      "status": "approved"
    },
    {
      "judgeId": "JUDGE-002",
      "status": "approved"
    },
    {
      "judgeId": "JUDGE-003",
      "status": "pending"
    }
  ],
  "scores": []
}
```

## Request Body with Optional eventId

If you want to specify a custom eventId (otherwise it will be auto-generated):

```json
{
  "eventId": "EVT-CUSTOM-123",
  "eventInfo": {
    "name": "Case Competition 2024",
    "description": "Business case analysis competition",
    "date": "2024-07-20T09:00:00Z"
  },
  "teams": [
    {
      "teamId": "TEAM-A",
      "teamName": "Strategy Masters",
      "members": ["STU-101", "STU-102"]
    }
  ],
  "rubrics": [
    {
      "rubricId": "RUB-A",
      "name": "Analysis Depth",
      "maxScore": 40,
      "weight": 0.5
    },
    {
      "rubricId": "RUB-B",
      "name": "Solution Quality",
      "maxScore": 35,
      "weight": 0.3
    },
    {
      "rubricId": "RUB-C",
      "name": "Presentation",
      "maxScore": 25,
      "weight": 0.2
    }
  ],
  "judges": [
    {
      "judgeId": "JUDGE-A",
      "status": "approved"
    }
  ],
  "scores": []
}
```

## Field Descriptions

### eventInfo (required)
- **name** (string, required): Event name
- **description** (string, required): Event description
- **date** (string, optional): Event date in ISO 8601 format
- **location** (string, optional): Event location
- **organizer** (string, optional): Event organizer
- Any other custom fields can be added to eventInfo

### teams (optional, default: [])
Array of team objects:
- **teamId** (string, required): Unique team identifier
- **teamName** (string, required): Team name
- **members** (array of strings, required): Array of student IDs

### rubrics (optional, default: [])
Array of rubric objects:
- **rubricId** (string, required): Unique rubric identifier
- **name** (string, required): Rubric name
- **maxScore** (number, required): Maximum score for this rubric (must be > 0)
- **weight** (number, required): Weight for scoring calculation (must be >= 0)

### judges (optional, default: [])
Array of judge objects:
- **judgeId** (string, required): Unique judge identifier
- **status** (string, required): Must be either "approved" or "pending"

### scores (optional, default: [])
Array of score objects (usually empty when creating event):
- **judgeId** (string, required): Judge who gave the score
- **teamId** (string, required): Team that received the score
- **rubricId** (string, required): Rubric being scored
- **score** (number, required): Score value (must be >= 0 and <= maxScore)
- **timestamp** (string, required): ISO 8601 timestamp

### eventId (optional)
- If not provided, will be auto-generated in format: `EVT-{timestamp}-{random}`

## Example cURL Request

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventInfo": {
      "name": "Hackathon 2024",
      "description": "Annual coding competition",
      "date": "2024-06-15T10:00:00Z"
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
        "name": "Technical Implementation",
        "maxScore": 30,
        "weight": 0.4
      }
    ],
    "judges": [
      {
        "judgeId": "JUDGE-001",
        "status": "approved"
      }
    ],
    "scores": []
  }'
```

## Success Response (201 Created)

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "eventId": "EVT-1718452800000-abc123xyz",
    "eventInfo": {
      "name": "Hackathon 2024",
      "description": "Annual coding competition",
      "date": "2024-06-15T10:00:00Z"
    },
    "teams": [...],
    "rubrics": [...],
    "judges": [...],
    "scores": [],
    "createdAt": "2024-06-15T08:00:00Z",
    "updatedAt": "2024-06-15T08:00:00Z"
  }
}
```

## Error Responses

### Missing Required Fields (400 Bad Request)
```json
{
  "success": false,
  "message": "Failed to create event",
  "error": "eventInfo.name must be a non-empty string"
}
```

### Invalid Data Type (400 Bad Request)
```json
{
  "success": false,
  "message": "Failed to create event",
  "error": "Teams must be an array"
}
```

### Invalid Score Value (400 Bad Request)
```json
{
  "success": false,
  "message": "Failed to create event",
  "error": "Rubric at index 0 must have a valid maxScore (positive number)"
}
```

## Notes

1. **eventId**: If not provided, it will be auto-generated. The format is `EVT-{timestamp}-{random}`.

2. **Validation**: The service layer validates all data according to the event model before creating the event.

3. **Empty Arrays**: You can provide empty arrays for teams, rubrics, judges, and scores. They can be populated later using update operations.

4. **eventInfo**: This is a flexible object. You can add any additional fields to eventInfo as needed (e.g., location, organizer, category, etc.).

5. **Rubric Weights**: The sum of all rubric weights doesn't need to equal 1.0. The leaderboard calculation normalizes weights automatically.

