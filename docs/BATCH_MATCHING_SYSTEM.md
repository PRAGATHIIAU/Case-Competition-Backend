# Batch Matching System Documentation

## Overview

The batch matching system enables automated nightly processing of mentor-mentee matching. It tracks profile changes, runs matching algorithms, and stores results in the database for frontend consumption.

## Architecture

### Components

1. **Profile Change Logging**
   - Automatically logs user profile creation and updates
   - Stored in `user_profile_change_log` table

2. **Batch Processing Service**
   - Checks for changes in last 24 hours
   - Runs Python matching script
   - Saves similarity scores and mappings

3. **N8N Integration**
   - Scheduled workflow (2 AM daily)
   - Triggers batch processing
   - Clears logs after completion

4. **Frontend Endpoints**
   - Get recommendations for students
   - Get assignment details

## Database Schema

### Tables

#### `user_profile_change_log`
Tracks profile changes for batch triggers.

```sql
- id: SERIAL PRIMARY KEY
- user_id: VARCHAR(100) NOT NULL
- change_type: VARCHAR(20) NOT NULL ('CREATE' or 'UPDATE')
- timestamp: TIMESTAMP DEFAULT NOW()
```

#### `nightly_similarity_scores`
Stores all similarity scores from batch runs.

```sql
- id: SERIAL PRIMARY KEY
- mentor_id: INTEGER NOT NULL
- student_id: VARCHAR(100) NOT NULL
- similarity_score: DECIMAL(5, 4) NOT NULL
- batch_timestamp: TIMESTAMP NOT NULL
- created_at: TIMESTAMP DEFAULT NOW()
```

#### `mentor_student_mapping`
Stores active mentor-student assignments.

```sql
- id: SERIAL PRIMARY KEY
- mentor_id: INTEGER NOT NULL
- student_id: VARCHAR(100) NOT NULL
- similarity_score: DECIMAL(5, 4) NOT NULL
- assigned_at: TIMESTAMP DEFAULT NOW()
- batch_timestamp: TIMESTAMP NOT NULL
- is_active: BOOLEAN DEFAULT TRUE
```

## API Endpoints

### Batch Processing (N8N)

#### `GET /api/matching/check-changes`
Check if there are profile changes in the last 24 hours.

**Response:**
```json
{
  "success": true,
  "changesCount": 5,
  "hasChanges": true,
  "message": "Found 5 profile changes in the last 24 hours"
}
```

#### `POST /api/matching/run-batch`
Run batch matching process.

**Response:**
```json
{
  "success": true,
  "message": "Batch run completed",
  "stats": {
    "changesCount": 5,
    "mentorsCount": 10,
    "menteesCount": 20,
    "scoresSaved": 200,
    "mappingsUpdated": 10
  },
  "updatedMappingsCount": 10
}
```

#### `POST /api/matching/clear-log`
Clear all profile change logs.

**Response:**
```json
{
  "success": true,
  "message": "Cleared 5 log entries",
  "deletedCount": 5
}
```

### Frontend Integration

#### `GET /api/matching/recommendations/:studentId`
Get recommendations for a student.

**Response:**
```json
{
  "success": true,
  "message": "Recommendations retrieved successfully",
  "data": {
    "assignedMentor": {
      "id": 1,
      "mentor_id": 1,
      "student_id": "uuid-123",
      "similarity_score": 0.85,
      "mentor_name": "John Doe",
      "mentor_email": "john@example.com"
    },
    "similarityScores": [
      {
        "mentor_id": 1,
        "similarity_score": 0.85,
        "mentor_name": "John Doe"
      }
    ],
    "hasAssignment": true
  }
}
```

#### `GET /api/matching/assigned/:studentId`
Get assignment details for a student.

**Response:**
```json
{
  "success": true,
  "message": "Assignment retrieved successfully",
  "data": {
    "assigned": true,
    "mentor": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "metadata": {
      "similarityScore": 0.85,
      "assignedAt": "2024-01-15T10:00:00Z",
      "batchTimestamp": "2024-01-15T02:00:00Z"
    }
  }
}
```

## Setup Instructions

### 1. Database Migration

Run the SQL migration script:

```bash
psql -U your_user -d your_database -f database/migrations/001_create_batch_matching_tables.sql
```

### 2. Verify Tables

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profile_change_log', 'nightly_similarity_scores', 'mentor_student_mapping');
```

### 3. Test Profile Logging

Create or update a user profile and verify logging:

```sql
SELECT * FROM user_profile_change_log ORDER BY timestamp DESC LIMIT 10;
```

### 4. Test Batch Endpoint

```bash
# Check changes
curl http://localhost:5000/api/matching/check-changes

# Run batch
curl -X POST http://localhost:5000/api/matching/run-batch

# Clear logs
curl -X POST http://localhost:5000/api/matching/clear-log
```

### 5. Setup N8N Workflow

Follow instructions in `docs/N8N_WORKFLOW_SETUP.md`

## Data Flow

### Profile Change Flow

```
User Signup/Update
    ↓
Service Layer (auth.service.js / student.service.js)
    ↓
logUserProfileChange(userId, 'CREATE' | 'UPDATE')
    ↓
user_profile_change_log table
```

### Batch Processing Flow

```
N8N Cron (2 AM)
    ↓
GET /api/matching/check-changes
    ↓
IF changes > 0:
    ↓
POST /api/matching/run-batch
    ↓
Fetch mentors & mentees
    ↓
Execute Python script (STDIN/STDOUT)
    ↓
Save similarity scores → nightly_similarity_scores
    ↓
Save mappings → mentor_student_mapping
    ↓
POST /api/matching/clear-log
```

### Frontend Query Flow

```
Frontend Request
    ↓
GET /api/matching/recommendations/:studentId
    ↓
Query mentor_student_mapping (active assignments)
    ↓
Query nightly_similarity_scores (top matches)
    ↓
Return recommendations
```

## Python Script Integration

The Python script (`matching/mentor_mentee_matcher.py`) supports STDIN input:

**Input Format (JSON via STDIN):**
```json
{
  "mentors": [
    {
      "id": 1,
      "name": "John Doe",
      "skills": ["Python", "JavaScript"],
      ...
    }
  ],
  "mentees": [
    {
      "id": "uuid-123",
      "student_id": "uuid-123",
      "name": "Jane Smith",
      "skills": ["Python"],
      ...
    }
  ]
}
```

**Output Format (JSON via STDOUT):**
```json
{
  "success": true,
  "message": "Successfully matched 10 mentees to mentors",
  "statistics": {
    "total_mentors": 10,
    "total_mentees": 20,
    "total_mentees_assigned": 10
  },
  "matches": {
    "1": {
      "mentor_id": 1,
      "mentor_name": "John Doe",
      "mentees": [
        {
          "mentee_id": "uuid-123",
          "mentee_name": "Jane Smith",
          "similarity_score": 0.85
        }
      ]
    }
  }
}
```

## Error Handling

### Service Layer Errors

- Profile logging failures don't block signup/update
- Batch processing errors are logged and returned
- Database errors are caught and handled gracefully

### Python Script Errors

- Script errors are caught and returned as JSON
- Exit codes are checked
- STDERR is captured for debugging

## Performance Considerations

1. **Batch Size**
   - Process all mentors and mentees in single batch
   - Python script handles vectorization efficiently

2. **Database Indexes**
   - Indexes on foreign keys and timestamps
   - Optimized queries for recommendations

3. **Log Cleanup**
   - Logs cleared after each batch run
   - Prevents table growth

## Monitoring

### Key Metrics

- Batch execution time
- Number of changes detected
- Number of mappings created/updated
- Error rates

### Logging

- All endpoints log execution
- Python script logs to STDERR
- Database operations logged

## Troubleshooting

See `docs/N8N_WORKFLOW_SETUP.md` for detailed troubleshooting guide.

## Future Enhancements

- Incremental matching (only process changed profiles)
- Real-time matching for new signups
- Matching history and versioning
- Advanced filtering and preferences
- Email notifications for new assignments

