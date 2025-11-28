# Student Profile Feature - Quick Start Guide

This guide provides a quick overview and setup steps for the Student Profile feature.

## What Was Built

### PHASE 1: PostgreSQL RDS - Students Table ✅
- Created `students` table with UUID primary key
- Fields: student_id, name, email, password, contact, linkedin_url, major, grad_year, timestamps
- Indexes on email and student_id

### PHASE 2: Student CRUD Endpoints ✅
- **POST** `/api/students/signup` - Register new student
- **POST** `/api/students/login` - Student authentication
- **GET** `/api/students` - Get all students
- **GET** `/api/students/:id` - Get one student
- **PUT** `/api/students/:id` - Update student
- **DELETE** `/api/students/:id` - Delete student

### PHASE 3: Extended Profile (DynamoDB + S3) ✅
- **POST** `/api/students/:id/profile` - Save extended profile
- **GET** `/api/students/:id/profile` - Get merged profile (RDS + DynamoDB)
- DynamoDB table: `student_profiles`
- Lambda function: `student-profiles-handler`
- S3 resume upload support

## Quick Setup

### 1. Database Setup

Run the SQL schema:
```bash
# Option 1: Use the initialization script
node scripts/init-students-table.js

# Option 2: Run SQL directly
# Copy the CREATE_TABLE_QUERY from models/student.model.js
```

### 2. Environment Variables

Add to your `.env` file:
```env
# Database (already configured)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT (already configured)
JWT_SECRET=your-secret-key

# AWS API Gateway (add these)
API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/student-profiles
```

### 3. DynamoDB Setup

1. Create DynamoDB table:
   - Table name: `student_profiles`
   - Partition key: `studentId` (String)
   - Capacity: On-demand (recommended)

### 4. Lambda Setup

1. Create Lambda function:
   - Name: `student-profiles-handler`
   - Runtime: Node.js 18.x
   - Code: Copy from `lambda/student-profiles-handler.js`
   - Environment: `STUDENT_PROFILES_TABLE_NAME=student_profiles`
   - IAM: DynamoDB permissions for `student_profiles` table

2. See `STUDENTS_API_GATEWAY_SETUP.md` for detailed instructions

### 5. API Gateway Setup

1. Create API Gateway endpoint pointing to `student-profiles-handler` Lambda
2. Deploy to stage (e.g., `prod`)
3. Update `API_GATEWAY_STUDENT_PROFILES_URL` in `.env`

See `STUDENTS_API_GATEWAY_SETUP.md` for detailed instructions

### 6. Start Backend

```bash
npm start
# or
npm run dev
```

## File Structure

```
Case-Competition-Backend/
├── models/
│   └── student.model.js              # Student table schema
├── repositories/
│   └── student.repository.js         # RDS PostgreSQL operations
├── services/
│   └── student.service.js            # Business logic
├── controllers/
│   └── student.controller.js         # HTTP request handlers
├── routes/
│   └── student.routes.js            # API routes
├── middleware/
│   └── auth.js                       # Updated to support UUIDs
├── lambda/
│   └── student-profiles-handler.js   # DynamoDB Lambda function
├── scripts/
│   └── init-students-table.js        # Database initialization
├── config/
│   └── aws.js                        # Updated with student_profiles table
└── STUDENTS_API_DOCUMENTATION.md     # Full API documentation
```

## Testing

### 1. Signup
```bash
curl -X POST http://localhost:3000/api/students/signup \
  -F "email=test@example.com" \
  -F "name=Test Student" \
  -F "password=password123" \
  -F "major=Computer Science"
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/students/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Get Profile (with token)
```bash
curl -X GET http://localhost:3000/api/students/{student_id}/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Key Features

✅ **UUID-based IDs** - Students use UUIDs instead of integers  
✅ **JWT Authentication** - Secure token-based auth  
✅ **Password Hashing** - bcrypt with 10 salt rounds  
✅ **File Upload** - Resume uploads via S3  
✅ **Extended Profiles** - DynamoDB for large/unstructured data  
✅ **Authorization** - Students can only modify their own profiles  
✅ **Parameterized Queries** - SQL injection protection  
✅ **Error Handling** - Comprehensive error responses  

## Architecture

```
Client Request
    ↓
Express Routes (student.routes.js)
    ↓
Controller (student.controller.js)
    ↓
Service (student.service.js)
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
RDS PostgreSQL    DynamoDB          S3
(students table)  (student_profiles) (resumes)
                  via API Gateway
                  → Lambda
```

## Documentation

- **Full API Docs:** `STUDENTS_API_DOCUMENTATION.md`
- **API Gateway Setup:** `STUDENTS_API_GATEWAY_SETUP.md`
- **This Quick Start:** `STUDENTS_QUICK_START.md`

## Differences from Alumni/User System

1. **ID Type:** Students use UUIDs, Alumni use integers
2. **Table Name:** `students` vs `users`
3. **Fields:** Different schema (major, grad_year vs mentor fields)
4. **Extended Profile:** Students have DynamoDB profiles
5. **Separate Endpoints:** `/api/students/*` vs `/api/auth/*`

## Next Steps

1. ✅ Database table created
2. ✅ Backend endpoints implemented
3. ⏳ Set up DynamoDB table
4. ⏳ Deploy Lambda function
5. ⏳ Configure API Gateway
6. ⏳ Test all endpoints
7. ⏳ Integrate with frontend

## Support

For detailed information, see:
- `STUDENTS_API_DOCUMENTATION.md` - Complete API reference
- `STUDENTS_API_GATEWAY_SETUP.md` - AWS setup guide

