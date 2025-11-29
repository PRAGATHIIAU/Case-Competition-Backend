# Mentor-Mentee Matching System - Quick Start Guide

This guide will help you set up and use the mentor-mentee matching system.

## Prerequisites

1. **Python 3.7+** installed on your system
   - Check: `python --version` or `python3 --version`
   - If not installed, download from [python.org](https://www.python.org/downloads/)

2. **Node.js backend** running (the existing backend server)

3. **Python packages** installed:
   ```bash
   cd matching
   pip install -r requirements.txt
   ```

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r matching/requirements.txt
   ```

2. **Start the backend server:**
   ```bash
   npm start
   # or
   npm run dev
   ```

The server should be running on `http://localhost:3000` (or the port specified in your `.env` file).

## Usage

### 1. Get All Mentors

Fetch all alumni who are willing to be mentors:

```bash
curl http://localhost:3000/api/matching/mentors
```

### 2. Get All Mentees

Fetch all students (mentees):

```bash
curl http://localhost:3000/api/matching/mentees
```

### 3. Perform Matching

Run the matching algorithm:

```bash
curl -X POST http://localhost:3000/api/matching/match
```

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

## Testing the Python Script Directly

You can test the Python script independently:

1. **Create a test input file** (`test_input.json`):
   ```json
   {
     "mentors": [
       {
         "id": 1,
         "name": "John Doe",
         "email": "john@example.com",
         "willing_to_be_mentor": true,
         "mentor_capacity": 2,
         "skills": ["Python", "Machine Learning"],
         "aspirations": "Help students learn data science",
         "parsed_resume": {"summary": "Data scientist with 5 years experience"},
         "projects": [],
         "experiences": [],
         "achievements": []
       }
     ],
     "mentees": [
       {
         "student_id": "uuid-123",
         "name": "Jane Smith",
         "email": "jane@example.com",
         "skills": ["Python", "Data Science"],
         "aspirations": "Become a data scientist",
         "parsed_resume": {},
         "projects": [],
         "experiences": [],
         "achievements": []
       }
     ]
   }
   ```

2. **Run the Python script:**
   ```bash
   python matching/mentor_mentee_matcher.py test_input.json
   ```

## Troubleshooting

### Python Not Found

If you get "Python is not installed", make sure:
- Python 3.7+ is installed
- Python is in your system PATH
- Try `python3` instead of `python` on Unix-like systems

### Import Errors

If you get import errors for numpy or scikit-learn:
```bash
pip install --upgrade numpy scikit-learn pandas
```

### Script Not Found Error

Make sure the Python script is in the `matching/` directory:
```
matching/
  ├── mentor_mentee_matcher.py
  ├── requirements.txt
  └── README.md
```

### Empty Results

If matching returns no results:
- Check that mentors have `willing_to_be_mentor: true`
- Check that mentors have `mentor_capacity > 0`
- Ensure mentors and mentees have profile data (skills, experiences, etc.)

## How It Works

1. **Data Fetching:** The system fetches all mentors and mentees from RDS and DynamoDB
2. **Text Extraction:** Extracts textual information from profiles (skills, aspirations, resumes, etc.)
3. **Vectorization:** Converts text to numerical vectors using TF-IDF
4. **Similarity Computation:** Computes cosine similarity between all mentee-mentor pairs
5. **Matching:** Assigns mentees to mentors with highest similarity scores, respecting capacity constraints

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matching/mentors` | GET | Get all mentors |
| `/api/matching/mentees` | GET | Get all mentees |
| `/api/matching/match` | POST | Perform matching |

## Next Steps

- Review the detailed documentation in `matching/README.md`
- Customize the matching algorithm if needed
- Add authentication to the endpoints if required
- Export matching results to CSV/Excel for reporting

