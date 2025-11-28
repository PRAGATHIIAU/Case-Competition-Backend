# Alumni/Industry Profile Data Flow

This document explains how alumni/industry data is split between RDS PostgreSQL and DynamoDB.

## Data Storage Strategy

### RDS PostgreSQL (Atomic Data)
Stores structured, frequently queried atomic data:
- `id` (SERIAL, Primary Key)
- `email` (Unique)
- `name`
- `password` (Hashed)
- `contact`
- `willing_to_be_mentor` (Boolean)
- `mentor_capacity` (Integer)
- `willing_to_be_judge` (Boolean)
- `willing_to_be_sponsor` (Boolean)
- `created_at`
- `updated_at`

### DynamoDB (Profile Data)
Stores large, unstructured, and frequently changing profile data:
- `userId` (Number, Partition Key - matches RDS id)
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
POST /api/auth/signup
Content-Type: multipart/form-data

RDS Fields:
- email, name, password (required)
- contact (optional)
- willing_to_be_mentor, mentor_capacity, willing_to_be_judge, willing_to_be_sponsor (optional)

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
6. **Store in RDS**: Create user record
7. **Store in DynamoDB**: Create profile record (if profile data provided)
8. **Merge** data from both sources
9. **Generate** JWT token
10. **Return** merged user data + token

### Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      // RDS atomic data + willingness flags
      "id": 1,
      "email": "john.alumni@example.com",
      "name": "John Alumni",
      "contact": "+1-555-0100",
      "willing_to_be_mentor": true,
      "mentor_capacity": 5,
      "willing_to_be_judge": true,
      "willing_to_be_sponsor": false,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      // DynamoDB profile data (merged)
      "skills": ["JavaScript", "Python"],
      "aspirations": "To mentor the next generation",
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
GET /api/auth/user/:id/profile
Authorization: Bearer <token>
```

### Process
1. **Fetch from RDS**: Get atomic data + willingness flags by `id`
2. **Fetch from DynamoDB**: Get profile data by `userId`
3. **Merge** data:
   - If profile exists: Combine RDS + DynamoDB fields into single object
   - If profile doesn't exist: Return RDS data with empty profile fields
4. **Return** merged data

### Response
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    // RDS atomic data + willingness flags
    "id": 1,
    "email": "john.alumni@example.com",
    "name": "John Alumni",
    "contact": "+1-555-0100",
    "willing_to_be_mentor": true,
    "mentor_capacity": 5,
    "willing_to_be_judge": true,
    "willing_to_be_sponsor": false,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    // DynamoDB profile data (merged)
    "skills": ["JavaScript", "Python"],
    "aspirations": "To mentor the next generation",
    "parsed_resume": {...},
    "projects": [...],
    "experiences": [...],
    "achievements": [...],
    "resume_url": "https://s3.amazonaws.com/bucket/resume.pdf"
  }
}
```

## Update Flow

### Update Atomic Data (RDS)
```
PUT /api/auth/user/:id
```
Updates RDS fields: name, contact, willingness flags, password.

### Update Profile Data (DynamoDB)
```
POST /api/auth/user/:id/profile
```
Updates DynamoDB fields: skills, aspirations, parsed_resume, projects, experiences, achievements, resume_url.

## Data Consistency

- **Primary Key**: `id` (RDS) = `userId` (DynamoDB)
- **Atomicity**: RDS insert happens first. If DynamoDB insert fails, RDS record still exists (can be cleaned up later).
- **Merging**: Always merge data when retrieving to ensure complete profile.

## Error Handling

- If RDS insert fails → Signup fails
- If DynamoDB insert fails during signup → Log error but don't fail signup (profile can be added later)
- If user not found in RDS → Return 404
- If profile not found in DynamoDB → Return RDS data with empty profile fields

## Benefits of This Architecture

1. **Performance**: Atomic data + willingness flags in RDS for fast queries and joins
2. **Scalability**: Large profile data in DynamoDB (NoSQL, auto-scaling)
3. **Flexibility**: Profile schema can evolve without RDS migrations
4. **Cost**: Store frequently accessed data in RDS, large blobs in DynamoDB
5. **Separation**: Clear separation between structured and unstructured data

