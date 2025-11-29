# Mentor-Mentee Matching System - Implementation Summary

## Overview

A complete mentor-mentee matching system has been implemented that:
1. Fetches mentor and mentee profiles from RDS (PostgreSQL) and DynamoDB
2. Converts textual profiles to numerical vectors using TF-IDF
3. Computes similarity scores using cosine similarity
4. Matches mentees to mentors based on highest similarity while respecting mentor capacity
5. Runs completely locally without external APIs or restricted AWS services

## Files Created

### Python Scripts
- **`matching/mentor_mentee_matcher.py`**: Main matching algorithm implementation
  - Extracts text from profiles (skills, aspirations, resumes, projects, experiences, achievements)
  - Converts text to TF-IDF vectors using scikit-learn
  - Computes cosine similarity between all mentee-mentor pairs
  - Performs greedy matching algorithm respecting mentor capacity constraints

- **`matching/requirements.txt`**: Python dependencies
  - numpy >= 1.24.0
  - scikit-learn >= 1.3.0
  - pandas >= 2.0.0

- **`matching/README.md`**: Detailed documentation for the matching system

### Node.js Backend Integration

- **`services/matching.service.js`**: Service layer for matching operations
  - `getAllMentors()`: Fetches all alumni willing to be mentors (merged RDS + DynamoDB)
  - `getAllMentees()`: Fetches all students/mentees (merged RDS + DynamoDB)
  - `performMatching()`: Orchestrates the matching process by calling Python script

- **`controllers/matching.controller.js`**: HTTP request handlers
  - `getAllMentors`: GET endpoint to retrieve mentors
  - `getAllMentees`: GET endpoint to retrieve mentees
  - `performMatching`: POST endpoint to trigger matching

- **`routes/matching.routes.js`**: API route definitions
  - `/api/matching/mentors` - GET
  - `/api/matching/mentees` - GET
  - `/api/matching/match` - POST

- **`routes/index.js`**: Updated to include matching routes

### Documentation

- **`MATCHING_QUICK_START.md`**: Quick start guide with setup instructions and examples
- **`MATCHING_SYSTEM_SUMMARY.md`**: This file - implementation summary

## API Endpoints

### 1. Get All Mentors
```
GET /api/matching/mentors
```
Returns all alumni who have `willing_to_be_mentor = true` with their complete profiles (RDS + DynamoDB merged).

### 2. Get All Mentees
```
GET /api/matching/mentees
```
Returns all students with their complete profiles (RDS + DynamoDB merged).

### 3. Perform Matching
```
POST /api/matching/match
```
Executes the matching algorithm and returns:
- Statistics (total mentors, mentees, assignments, utilization rate)
- Matching results mapping mentor IDs to lists of assigned mentees with similarity scores

**Response Format:**
```json
{
  "success": true,
  "message": "Successfully matched X mentees to mentors",
  "statistics": {
    "total_mentors": 10,
    "total_mentees": 20,
    "total_mentees_assigned": 15,
    "total_capacity": 20,
    "utilization_rate": 75.0
  },
  "data": {
    "mentor_id": {
      "mentor_id": 1,
      "mentor_name": "John Doe",
      "mentor_email": "john@example.com",
      "capacity": 3,
      "assigned_count": 2,
      "mentees": [
        {
          "mentee_id": "uuid-123",
          "mentee_name": "Jane Smith",
          "mentee_email": "jane@example.com",
          "similarity_score": 0.85
        }
      ]
    }
  }
}
```

## How It Works

### 1. Data Fetching
- Mentors: Fetched from RDS `users` table filtered by `willing_to_be_mentor = true`
- Profiles merged from DynamoDB `alumni_profiles` table
- Mentees: Fetched from RDS `students` table
- Profiles merged from DynamoDB `student_profiles` table

### 2. Text Extraction
The system extracts textual information from:
- Skills (array of strings)
- Aspirations (text string)
- Parsed resume (JSON object - all text fields extracted recursively)
- Projects (array of objects - all text values extracted)
- Experiences (array of objects - all text values extracted)
- Achievements (array of strings)
- Major (for students)

All text is combined into a single string per profile.

### 3. Vectorization
- Uses TF-IDF (Term Frequency-Inverse Document Frequency) vectorization
- Unigrams and bigrams (1-2 word phrases) are considered
- English stop words are removed
- Maximum 5000 features to limit dimensionality
- All profiles (mentors + mentees) are vectorized together to ensure consistent feature space

### 4. Similarity Computation
- Cosine similarity between all mentee-mentor vector pairs
- Results in a similarity matrix of shape (n_mentees × n_mentors)
- Similarity scores range from 0 (no similarity) to 1 (identical)

### 5. Matching Algorithm
- Greedy algorithm: sorts all possible matches by similarity score (descending)
- Iteratively assigns mentees to mentors with highest similarity
- Respects constraints:
  - Each mentee assigned to at most one mentor
  - Each mentor can have at most `mentor_capacity` mentees
  - Only mentors with `willing_to_be_mentor = true` and `mentor_capacity > 0` are considered

## Technical Details

### Python Execution
- Node.js service executes Python script via `child_process.exec`
- Uses temporary files for input/output (better cross-platform compatibility)
- Automatically detects Python command (`python` or `python3`)
- Handles errors gracefully with cleanup of temporary files

### Data Flow
1. API request → Controller
2. Controller → Service
3. Service fetches data from repositories
4. Service merges RDS + DynamoDB data
5. Service prepares JSON input for Python script
6. Service executes Python script with JSON input
7. Python script processes data and outputs JSON results
8. Service parses JSON results and returns to controller
9. Controller returns HTTP response

### Constraints Respected
- ✅ Only uses local Python libraries (scikit-learn, numpy, pandas)
- ✅ No external APIs or AWS managed services (Comprehend, Personalize, OpenSearch)
- ✅ Respects mentor capacity (1:n mapping)
- ✅ Assigns based on highest similarity scores
- ✅ Handles missing or empty profile data gracefully

## Installation & Setup

1. Install Python 3.7+ and ensure it's in PATH
2. Install Python dependencies:
   ```bash
   pip install -r matching/requirements.txt
   ```
3. Start the Node.js backend server
4. Test endpoints using curl or Postman

See `MATCHING_QUICK_START.md` for detailed setup instructions.

## Testing

### Test the Matching Endpoint
```bash
curl -X POST http://localhost:3000/api/matching/match
```

### Test Individual Components
- Get mentors: `GET /api/matching/mentors`
- Get mentees: `GET /api/matching/mentees`

### Test Python Script Directly
```bash
python matching/mentor_mentee_matcher.py input.json
```

## Limitations & Future Enhancements

### Current Limitations
- Matching based solely on textual profile content
- No consideration of geographic location, timezone, or availability
- No mentor or mentee preferences
- No matching history or versioning

### Potential Enhancements
- Weighted scoring for different profile fields
- Geographic matching (location/timezone)
- Preference-based matching
- Matching history and audit trail
- Export results to CSV/Excel
- Batch matching with scheduling
- Matching quality metrics and feedback loop

## Error Handling

The system handles various error scenarios:
- Missing Python installation
- Missing Python dependencies
- Missing or invalid profile data
- Empty mentor/mentee lists
- Python script execution failures
- JSON parsing errors
- Temporary file cleanup on errors

## Performance Considerations

- TF-IDF vectorization is performed once for all profiles (efficient)
- Maximum 5000 features limits memory usage
- Temporary files are cleaned up after use
- Large datasets may require additional optimization (batching, caching)

## Security Considerations

- Matching endpoints currently do not require authentication
- Consider adding authentication/authorization based on your security requirements
- Input validation is performed at the service layer
- No SQL injection risks (using parameterized queries via repositories)

## Maintenance

- Python script is self-contained and can be updated independently
- Algorithm parameters (max_features, ngram_range) can be tuned in the Python script
- Matching logic is isolated in the Python script for easy modifications
- API endpoints follow existing backend patterns for consistency

