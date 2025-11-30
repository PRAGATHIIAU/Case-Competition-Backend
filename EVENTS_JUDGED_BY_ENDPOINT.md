# Events Judged By Endpoint

## Overview

This endpoint retrieves all events from DynamoDB where a specific user is assigned as a judge.

## Endpoint

**GET** `/api/events/judged-by/:userId`

## Description

- Reads the `userId` from the request path parameters
- Scans all events from DynamoDB (Events table)
- Filters events where `event.judges.some(j => j.judgeId === userId)`
- Returns only events where the user is assigned as a judge

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | The user ID (judgeId) to search for |

### Example Request

```bash
GET http://localhost:5000/api/events/judged-by/JUDGE-001
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [
    {
      "eventId": "EVT-123",
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
      "scores": [],
      "createdAt": "2024-06-01T00:00:00Z",
      "updatedAt": "2024-06-15T14:30:00Z"
    }
  ],
  "count": 1
}
```

### Empty Response (200 OK)

If no events are found where the user is a judge:

```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [],
  "count": 0
}
```

### Error Responses

#### Invalid userId (400 Bad Request)

```json
{
  "success": false,
  "message": "Invalid userId",
  "error": "userId is required and must be a valid string"
}
```

#### Server Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to retrieve events",
  "error": "Error message details"
}
```

## Example Test Payloads

### Test Case 1: Valid userId with matching events

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001
```

**Expected Response:**
- Status: 200 OK
- Returns all events where `judges` array contains an object with `judgeId: "JUDGE-001"`

### Test Case 2: Valid userId with no matching events

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-999
```

**Expected Response:**
- Status: 200 OK
- Returns empty array: `{ "success": true, "data": [], "count": 0 }`

### Test Case 3: Invalid userId (empty string)

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/
```

**Expected Response:**
- Status: 400 Bad Request
- Error message about invalid userId

### Test Case 4: Invalid userId (missing)

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/
```

**Expected Response:**
- Status: 400 Bad Request or 404 Not Found (depending on routing)

### Test Case 5: userId with special characters

**Request:**
```bash
curl -X GET "http://localhost:5000/api/events/judged-by/JUDGE-001%20TEST"
```

**Expected Response:**
- Status: 200 OK
- Returns events matching the exact userId (URL decoded)

### Test Case 6: Multiple events with same judge

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001
```

**Expected Response:**
- Status: 200 OK
- Returns all events where JUDGE-001 is assigned, regardless of status

### Test Case 7: Judge with different statuses

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001
```

**Expected Response:**
- Status: 200 OK
- Returns events where JUDGE-001 is assigned, whether status is "approved" or "pending"

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
async function getEventsJudgedBy(userId) {
  try {
    const response = await fetch(`http://localhost:5000/api/events/judged-by/${userId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.count} events`);
      return data.data;
    } else {
      console.error('Error:', data.error);
      return [];
    }
  } catch (error) {
    console.error('Network error:', error);
    return [];
  }
}

// Usage
const events = await getEventsJudgedBy('JUDGE-001');
```

### Using Axios

```javascript
const axios = require('axios');

async function getEventsJudgedBy(userId) {
  try {
    const response = await axios.get(`http://localhost:5000/api/events/judged-by/${userId}`);
    return response.data.data;
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data.error);
    } else {
      console.error('Network error:', error.message);
    }
    return [];
  }
}

// Usage
const events = await getEventsJudgedBy('JUDGE-001');
```

### Using cURL (PowerShell)

```powershell
$userId = "JUDGE-001"
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/events/judged-by/$userId" -Method GET
Write-Output $response
```

### Using cURL (Bash)

```bash
USER_ID="JUDGE-001"
curl -X GET "http://localhost:5000/api/events/judged-by/$USER_ID" \
  -H "Content-Type: application/json"
```

## Implementation Details

### Performance

- Uses DynamoDB `scan()` operation to retrieve all events
- Filtering is performed in Node.js after scanning
- **Note:** For large datasets, consider implementing pagination or using DynamoDB query with GSI

### Security

- Returns only events where the judge matches the provided userId
- No authentication required (public endpoint)
- Consider adding authentication/authorization if needed

### Error Handling

- Invalid userId → 400 Bad Request
- DynamoDB errors → 500 Internal Server Error (wrapped in try/catch)
- No events found → 200 OK with empty array (not an error)

## Event Structure

Events in DynamoDB have the following structure:

```json
{
  "eventId": "EVT-123",
  "eventInfo": {
    "name": "Event Name",
    "description": "Event Description",
    "date": "2024-07-20T09:00:00Z"
  },
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
  "teams": [],
  "rubrics": [],
  "scores": [],
  "createdAt": "2024-06-01T00:00:00Z",
  "updatedAt": "2024-06-15T14:30:00Z"
}
```

The endpoint filters events where `judges` array contains an object with `judgeId` matching the provided `userId`.

