# Mentor-Mentee Matching System

This directory contains the Python-based mentor-mentee matching system that uses natural language processing to match students (mentees) with alumni (mentors) based on profile similarity.

## Overview

The matching system:
1. Fetches mentor and mentee profiles from the backend database (RDS + DynamoDB)
2. Extracts textual information from profiles (skills, aspirations, resumes, projects, experiences, etc.)
3. Converts profiles to numerical vectors using TF-IDF (Term Frequency-Inverse Document Frequency)
4. Computes cosine similarity scores between all mentee-mentor pairs
5. Assigns mentees to mentors based on highest similarity scores while respecting mentor capacity constraints

## Files

- `mentor_mentee_matcher.py`: Main Python script that performs the matching algorithm
- `requirements.txt`: Python dependencies required for the matching system
- `README.md`: This documentation file

## Installation

1. Install Python 3.7 or higher
2. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Via API Endpoint

The matching system is integrated into the backend API. To perform matching:

```bash
POST /api/matching/match
```

The endpoint will:
- Fetch all mentors (alumni with `willing_to_be_mentor = true`)
- Fetch all mentees (all students)
- Run the matching algorithm
- Return the matching results

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully matched 15 mentees to mentors",
  "statistics": {
    "total_mentors": 10,
    "total_mentees": 20,
    "total_mentees_assigned": 15,
    "total_capacity": 20,
    "utilization_rate": 75.0
  },
  "data": {
    "1": {
      "mentor_id": 1,
      "mentor_name": "John Doe",
      "mentor_email": "john@example.com",
      "capacity": 3,
      "assigned_count": 3,
      "mentees": [
        {
          "mentee_id": "uuid-1",
          "mentee_name": "Jane Smith",
          "mentee_email": "jane@example.com",
          "similarity_score": 0.85
        },
        ...
      ]
    },
    ...
  }
}
```

### Direct Python Usage

You can also run the Python script directly:

```bash
# Using stdin
echo '{"mentors": [...], "mentees": [...]}' | python mentor_mentee_matcher.py

# Using file input
python mentor_mentee_matcher.py input.json
```

## API Endpoints

### Get All Mentors
```bash
GET /api/matching/mentors
```
Returns all alumni who are willing to be mentors with their full profiles.

### Get All Mentees
```bash
GET /api/matching/mentees
```
Returns all students (mentees) with their full profiles.

### Perform Matching
```bash
POST /api/matching/match
```
Performs the matching algorithm and returns the results.

## Algorithm Details

### Text Extraction
The system extracts textual information from:
- Skills (array)
- Aspirations (string)
- Parsed resume (JSON object - extracts all text fields)
- Projects (array of objects)
- Experiences (array of objects)
- Achievements (array)
- Major (for students)

### Vectorization
- Uses TF-IDF vectorization from scikit-learn
- Considers unigrams and bigrams (1-2 word phrases)
- Removes English stop words
- Limits to top 5000 features for performance
- All profiles are vectorized together to ensure consistent feature space

### Similarity Computation
- Uses cosine similarity to measure how similar two profiles are
- Returns a similarity matrix (mentees × mentors)
- Similarity scores range from 0 (no similarity) to 1 (identical)

### Matching Algorithm
- Greedy algorithm: assigns mentees to mentors with highest similarity scores
- Respects mentor capacity constraints
- Each mentee is assigned to at most one mentor
- Each mentor can have at most `mentor_capacity` mentees
- Matches are sorted by similarity score (descending) and assigned in order

## Profile Fields Used

### Mentor Profile Fields
- RDS: `id`, `name`, `email`, `willing_to_be_mentor`, `mentor_capacity`
- DynamoDB: `skills`, `aspirations`, `parsed_resume`, `projects`, `experiences`, `achievements`

### Mentee Profile Fields
- RDS: `student_id`, `name`, `email`, `major`
- DynamoDB: `skills`, `aspirations`, `parsed_resume`, `projects`, `experiences`, `achievements`

## Dependencies

- `numpy`: Numerical computing
- `scikit-learn`: Machine learning and NLP (TF-IDF, cosine similarity)
- `pandas`: Data manipulation (optional, for future enhancements)

## Limitations

- The system only uses local Python libraries (no external APIs)
- Similarity is based solely on textual profile content
- Does not consider factors like geographic location, availability, or preferences
- Mentor capacity is hard constraint (no over-assignment)

## Future Enhancements

- Add weighted scoring for different profile fields
- Consider additional factors (location, timezone, availability)
- Support for mentor preferences
- Support for mentee preferences
- Export matching results to CSV/Excel
- Matching history and versioning

