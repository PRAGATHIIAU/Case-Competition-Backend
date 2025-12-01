# Resume Parsing - Additional Fields Extraction

## New Fields Extracted

The resume parser now extracts the following additional fields from uploaded resumes:

1. **Major/Field of Study** - Extracted from Education section
2. **Year of Graduation (grad_year)** - Extracted from Education section
3. **Bio/About Me** - Extracted from Bio, About, or Personal Statement sections
4. **Relevant Coursework** - Extracted from Coursework or Education sections

## Extraction Details

### 1. Major Extraction

**Sources:**
- Education section
- Degree descriptions (e.g., "Bachelor of Science in Computer Science")
- Major/Field of study labels

**Patterns Detected:**
- "Bachelor of Science in Computer Science"
- "BS in Computer Science"
- "Major: Computer Science"
- "Computer Science major"
- Common majors: Computer Science, Software Engineering, Data Science, Business Administration, etc.

**Example:**
```json
{
  "major": "Computer Science"
}
```

### 2. Graduation Year Extraction

**Sources:**
- Education section
- Date ranges (e.g., "2020 - 2024")
- Graduation labels (e.g., "Expected: 2025", "Graduated: 2024")

**Patterns Detected:**
- "Expected: 2025"
- "Graduated: 2024"
- "2020 - 2024" (takes end year)
- "Class of 2025"

**Example:**
```json
{
  "grad_year": 2025
}
```

### 3. Bio Extraction

**Sources:**
- Bio section
- About Me section
- Personal Statement section
- Professional Summary (if longer than typical aspiration)

**Patterns Detected:**
- "Bio: ..."
- "About Me: ..."
- "Personal Statement: ..."
- "Background: ..."

**Example:**
```json
{
  "bio": "Passionate software engineer with 5 years of experience in full-stack development..."
}
```

### 4. Relevant Coursework Extraction

**Sources:**
- Relevant Coursework section
- Coursework section
- Courses section
- Education section (course mentions)

**Patterns Detected:**
- Course codes: "CS 101: Introduction to Programming"
- Course names: "Data Structures and Algorithms"
- Bullet lists of courses
- Course mentions in education section

**Example:**
```json
{
  "relevant_coursework": [
    "CS 101: Introduction to Programming",
    "Data Structures and Algorithms",
    "Database Systems",
    "Software Engineering"
  ]
}
```

## Data Storage

### For Alumni/Users (POST /api/auth/signup)

All new fields are stored in **DynamoDB profile**:

```json
{
  "major": "Computer Science",
  "grad_year": 2025,
  "bio": "Passionate software engineer...",
  "relevant_coursework": ["CS 101", "Data Structures"]
}
```

### For Students (POST /api/students/signup)

- **major** and **grad_year** → Stored in **RDS PostgreSQL** (students table)
- **bio** and **relevant_coursework** → Stored in **DynamoDB profile**

## Signup Request

### Alumni Signup

```bash
POST /api/auth/signup
Content-Type: multipart/form-data

# These fields are automatically extracted from resume if provided:
# - major
# - grad_year
# - bio
# - relevant_coursework

# Or can be provided manually:
major: Computer Science
grad_year: 2025
bio: Passionate software engineer...
relevant_coursework: ["CS 101", "Data Structures"]
```

### Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "major": "Computer Science",           // ✅ Extracted from resume
      "grad_year": 2025,                     // ✅ Extracted from resume
      "bio": "Passionate software engineer...", // ✅ Extracted from resume
      "relevant_coursework": [               // ✅ Extracted from resume
        "CS 101: Introduction to Programming",
        "Data Structures and Algorithms"
      ],
      "skills": [...],
      "projects": [...],
      "linkedin_url": "https://linkedin.com/in/...",
      "github_url": "https://github.com/..."
    },
    "token": "jwt-token"
  }
}
```

## Extraction Accuracy

### Major
- ✅ High accuracy for common majors
- ✅ Handles various degree formats
- ✅ Extracts from education section

### Graduation Year
- ✅ Handles various date formats
- ✅ Extracts from date ranges
- ✅ Validates year range (1900-2100)

### Bio
- ✅ Extracts from dedicated bio sections
- ✅ Falls back to professional summary if available
- ✅ Limits to 1000 characters

### Relevant Coursework
- ✅ Extracts course codes and names
- ✅ Handles bullet lists
- ✅ Limits to 15 courses
- ✅ Extracts from coursework section or education section

## Manual Override

All extracted fields can be overridden by providing them manually in the signup request:

```bash
# Manual input takes precedence over parsed data
major: Software Engineering  # Overrides parsed "Computer Science"
grad_year: 2026              # Overrides parsed "2025"
```

## Console Logging

The extraction process logs detailed information:

```
Resume parsing complete: {
  skillsCount: 20,
  projectsCount: 2,
  experiencesCount: 0,
  achievementsCount: 4,
  hasAspirations: false,
  hasBio: true,
  hasMajor: true,
  major: "Computer Science",
  hasGradYear: true,
  gradYear: 2025,
  courseworkCount: 8,
  hasLinkedIn: true,
  hasGitHub: false,
  linkedinUrl: "https://www.linkedin.com/in/...",
  githubUrl: null
}
```

## Files Modified

1. ✅ `services/resume-parser.service.js`
   - Added `extractMajor()` function
   - Added `extractGradYear()` function
   - Added `extractBio()` function
   - Added `extractRelevantCoursework()` function
   - Updated `parseResume()` to include new fields

2. ✅ `services/auth.service.js`
   - Updated signup flow to merge new fields
   - Updated `getUserWithProfile()` to return new fields
   - Updated `updateUser()` to handle new fields
   - Updated `saveExtendedProfile()` to handle new fields

3. ✅ `controllers/auth.controller.js`
   - Added new fields to request body extraction

## Testing

To test the new extraction:

1. **Create a resume** with:
   - Education section with major and graduation year
   - Bio/About section
   - Relevant Coursework section

2. **Upload via signup endpoint**

3. **Check response** for extracted fields:
   - `major`
   - `grad_year`
   - `bio`
   - `relevant_coursework`

## Example Resume Sections

### Education Section
```
EDUCATION
Bachelor of Science in Computer Science
University Name
Expected Graduation: May 2025
GPA: 3.8/4.0
```

### Bio Section
```
BIO
Passionate software engineer with experience in full-stack development.
Interested in machine learning and cloud computing.
```

### Relevant Coursework Section
```
RELEVANT COURSEWORK
• CS 101: Introduction to Programming
• Data Structures and Algorithms
• Database Systems
• Software Engineering
• Machine Learning
```

## Notes

- All extraction is **free and runs locally**
- **High accuracy** pattern matching
- **Manual input takes precedence** over parsed data
- Fields are stored in **DynamoDB profile** for alumni
- For students, `major` and `grad_year` go to **RDS**, `bio` and `relevant_coursework` go to **DynamoDB**

