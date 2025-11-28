# Student Profile Data Flow

This document explains how student data is split between RDS PostgreSQL and DynamoDB.

## Data Storage Strategy

### RDS PostgreSQL (Atomic Data)
Stores structured, frequently queried atomic data:
- `student_id` (UUID, Primary Key)
- `name`
- `email` (Unique)
- `password` (Hashed)
- `contact`
- `linkedin_url`
- `major`
- `grad_year`
- `created_at`
- `updated_at`

### DynamoDB (Profile Data)
Stores large, unstructured, and frequently changing profile data:
- `studentId` (Partition Key - matches RDS student_id)
- `skills[]` (Array)
- `aspirations` (String)
- `parsed_resume` (JSON Object)
- `projects[]` (Array of Objects)
- `experiences[]` (Array of Objects)
- `achievements[]` (Array)
- `resume_url` (String - S3 URL)
- `createdAt`
- `updatedAt`

## Signup Flow

### Request
```
POST /api/students/signup
Content-Type: multipart/form-data

RDS Fields:
- email, name, password (required)
- contact, linkedin_url, major, grad_year (optional)

DynamoDB Fields:
- skills, aspirations, parsed_resume, projects, experiences, achievements (optional)
- resume (file upload - optional)
```

### Process
1. **Validate** input data
2. **Check** if email already exists
3. **Hash** password using bcrypt
4. **Upload** resume to S3 (if provided) → get `resume_url`
5. **Split** data:
   - RDS data: atomic fields + willingness flags
   - DynamoDB data: profile fields + resume_url
6. **Store in RDS**: Create student record
7. **Store in DynamoDB**: Create profile record (if profile data provided)
8. **Merge** data from both sources
9. **Generate** JWT token
10. **Return** merged student data + token

### Response
```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "student": {
      // RDS atomic data
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "contact": "+1234567890",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "major": "Computer Science",
      "grad_year": 2025,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      // DynamoDB profile data (merged)
      "skills": ["JavaScript", "Python"],
      "aspirations": "To become a full-stack developer",
      "parsed_resume": {...},
      "projects": [...],
      "experiences": [...],
      "achievements": [...],
      "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Get Profile Flow

### Request
```
GET /api/students/:id/profile
Authorization: Bearer <token>
```

### Process
1. **Fetch from RDS**: Get atomic data by `student_id`
2. **Fetch from DynamoDB**: Get profile data by `studentId`
3. **Merge** data:
   - If profile exists: Combine RDS + DynamoDB fields into single object
   - If profile doesn't exist: Return RDS data with empty profile fields
4. **Return** merged data

### Response
```json
{
  "success": true,
  "message": "Student profile retrieved successfully",
  "data": {
    // RDS atomic data
    "student_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "contact": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "major": "Computer Science",
    "grad_year": 2025,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    // DynamoDB profile data (merged)
    "skills": ["JavaScript", "Python"],
    "aspirations": "To become a full-stack developer",
    "parsed_resume": {...},
    "projects": [...],
    "experiences": [...],
    "achievements": [...],
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
  }
}
```

## Get Student by ID Flow

### Request
```
GET /api/students/:id
Authorization: Bearer <token>
```

### Process
Same as Get Profile Flow - returns merged data from both RDS and DynamoDB.

## Update Flow

### Update Atomic Data (RDS)
```
PUT /api/students/:id
```
Updates only RDS fields: name, contact, linkedin_url, major, grad_year, password.

### Update Profile Data (DynamoDB)
```
POST /api/students/:id/profile
```
Updates only DynamoDB fields: skills, aspirations, parsed_resume, projects, experiences, achievements, resume_url.

## Data Consistency

- **Primary Key**: `student_id` (RDS) = `studentId` (DynamoDB)
- **Atomicity**: RDS insert happens first. If DynamoDB insert fails, RDS record still exists (can be cleaned up later).
- **Merging**: Always merge data when retrieving to ensure complete profile.

## Error Handling

- If RDS insert fails → Signup fails
- If DynamoDB insert fails during signup → Log error but don't fail signup (profile can be added later)
- If student not found in RDS → Return 404
- If profile not found in DynamoDB → Return RDS data with empty profile fields

## Benefits of This Architecture

1. **Performance**: Atomic data in RDS for fast queries and joins
2. **Scalability**: Large profile data in DynamoDB (NoSQL, auto-scaling)
3. **Flexibility**: Profile schema can evolve without RDS migrations
4. **Cost**: Store frequently accessed data in RDS, large blobs in DynamoDB
5. **Separation**: Clear separation between structured and unstructured data

