# Rubrics for Judge Endpoint

## Overview

This endpoint retrieves all rubrics from events where a specific user is assigned as a judge. It combines the functionality of:
- `GET /api/events/judged-by/:userId` - to get events where user is a judge
- `GET /api/events/:eventId/rubrics` - to get rubrics for each event

## Endpoint

**GET** `/api/events/judged-by/:userId/rubrics`

## Description

- Reads the `userId` from the request path parameters
- Gets all events where the user is assigned as a judge
- Collects rubrics from all those events
- Returns an array of rubrics with event context (eventId, eventName, eventDescription)

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | The user ID (judgeId) to search for |

### Example Request

```bash
GET http://localhost:5000/api/events/judged-by/JUDGE-001/rubrics
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Rubrics retrieved successfully",
  "data": [
    {
      "rubricId": "RUB-A",
      "name": "Analysis Depth",
      "maxScore": 40,
      "weight": 0.5,
      "eventId": "EVT-123",
      "eventName": "Case Competition 2024",
      "eventDescription": "Business case analysis competition"
    },
    {
      "rubricId": "RUB-B",
      "name": "Solution Quality",
      "maxScore": 35,
      "weight": 0.3,
      "eventId": "EVT-123",
      "eventName": "Case Competition 2024",
      "eventDescription": "Business case analysis competition"
    },
    {
      "rubricId": "RUB-C",
      "name": "Presentation",
      "maxScore": 25,
      "weight": 0.2,
      "eventId": "EVT-123",
      "eventName": "Case Competition 2024",
      "eventDescription": "Business case analysis competition"
    },
    {
      "rubricId": "RUB-D",
      "name": "Technical Implementation",
      "maxScore": 30,
      "weight": 0.4,
      "eventId": "EVT-456",
      "eventName": "Hackathon 2024",
      "eventDescription": "Annual coding competition"
    }
  ],
  "count": 4
}
```

### Empty Response (200 OK)

If no events are found where the user is a judge, or if those events have no rubrics:

```json
{
  "success": true,
  "message": "Rubrics retrieved successfully",
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
  "message": "Failed to retrieve rubrics",
  "error": "Error message details"
}
```

## Example Test Payloads

### Test Case 1: Valid userId with events and rubrics

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001/rubrics
```

**Expected Response:**
- Status: 200 OK
- Returns all rubrics from all events where JUDGE-001 is assigned as a judge
- Each rubric includes event context (eventId, eventName, eventDescription)

### Test Case 2: Valid userId with events but no rubrics

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001/rubrics
```

**Expected Response:**
- Status: 200 OK
- Returns empty array if events exist but have no rubrics: `{ "success": true, "data": [], "count": 0 }`

### Test Case 3: Valid userId with no matching events

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-999/rubrics
```

**Expected Response:**
- Status: 200 OK
- Returns empty array: `{ "success": true, "data": [], "count": 0 }`

### Test Case 4: Invalid userId (empty string)

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by//rubrics
```

**Expected Response:**
- Status: 400 Bad Request
- Error message about invalid userId

### Test Case 5: Multiple events with rubrics

**Request:**
```bash
curl -X GET http://localhost:5000/api/events/judged-by/JUDGE-001/rubrics
```

**Expected Response:**
- Status: 200 OK
- Returns rubrics from all events where JUDGE-001 is assigned, with event context for each rubric

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
async function getRubricsForJudge(userId) {
  try {
    const response = await fetch(`http://localhost:5000/api/events/judged-by/${userId}/rubrics`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.count} rubrics across all events`);
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
const rubrics = await getRubricsForJudge('JUDGE-001');
rubrics.forEach(rubric => {
  console.log(`${rubric.name} (Event: ${rubric.eventName})`);
});
```

### Using Axios

```javascript
const axios = require('axios');

async function getRubricsForJudge(userId) {
  try {
    const response = await axios.get(`http://localhost:5000/api/events/judged-by/${userId}/rubrics`);
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
const rubrics = await getRubricsForJudge('JUDGE-001');
```

### Using cURL (PowerShell)

```powershell
$userId = "JUDGE-001"
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/events/judged-by/$userId/rubrics" -Method GET
Write-Output $response
```

### Using cURL (Bash)

```bash
USER_ID="JUDGE-001"
curl -X GET "http://localhost:5000/api/events/judged-by/$USER_ID/rubrics" \
  -H "Content-Type: application/json"
```

## Response Structure

Each rubric in the response includes:

| Field | Type | Description |
|-------|------|-------------|
| `rubricId` | string | Unique rubric identifier |
| `name` | string | Rubric name |
| `maxScore` | number | Maximum score for this rubric |
| `weight` | number | Weight for scoring calculation |
| `eventId` | string | ID of the event this rubric belongs to |
| `eventName` | string | Name of the event |
| `eventDescription` | string | Description of the event |

## Implementation Details

### Service Function

The endpoint uses two existing service functions:
1. `getEventsJudgedBy(userId)` - Gets all events where the user is a judge
2. Extracts rubrics from each event and adds event context

### Performance

- Uses DynamoDB scan operation (via `getEventsJudgedBy`)
- Filtering and aggregation done in Node.js
- **Note:** For large datasets, consider implementing pagination

### Security

- Returns only rubrics from events where the judge matches the provided userId
- No authentication required (public endpoint)
- Consider adding authentication/authorization if needed

### Error Handling

- Invalid userId → 400 Bad Request
- DynamoDB errors → 500 Internal Server Error (wrapped in try/catch)
- No events/rubrics found → 200 OK with empty array (not an error)

## Use Cases

1. **Judge Dashboard**: Display all rubrics a judge needs to evaluate across all their assigned events
2. **Scoring Interface**: Get all rubrics for a judge to submit scores
3. **Analytics**: Analyze rubric distribution across events for a specific judge

