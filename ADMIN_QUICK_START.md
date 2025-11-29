# Admin Module - Quick Start Guide

This guide provides a quick overview and setup steps for the Admin module.

## What Was Built

### Admin Authentication System ✅
- Separate admin authentication (independent from users/students)
- PostgreSQL `admins` table for admin accounts
- JWT-based authentication with 7-day token expiry
- Admin-only endpoints for platform management

### Admin Management Features ✅
- **POST** `/admin/login` - Admin login
- **GET** `/admin/profile` - Get admin profile (protected)
- **GET** `/admin/students` - Get all students (protected)
- **GET** `/admin/alumni` - Get all alumni (protected)
- **GET** `/admin/events` - Get all events (protected)
- **PUT** `/admin/events/:id/status` - Update event status (protected)
- **GET** `/admin/analytics/basic-stats` - Basic platform statistics (protected)
- **GET** `/admin/analytics/student-engagement` - Student activity + profile completion (protected)
- **GET** `/admin/analytics/alumni-engagement` - Alumni activity + judges this month (protected)
- **GET** `/admin/analytics/inactive-alumni` - List of inactive alumni (protected)
- **GET** `/admin/analytics/feedback-summary` - Feedback counts + average ratings (protected)
- **GET** `/admin/analytics/events/summary` - Event-level statistics (protected)
- **GET** `/admin/analytics/student-event-trends` - Student-event trends (protected)
- **GET** `/admin/analytics/alumni-roles` - Mentor/judge/sponsor/multi-role counts (protected)
- **GET** `/admin/analytics/admin-activity` - Placeholder admin activity log (protected)
- **GET** `/admin/analytics/system-health` - System health across services (protected)

### Event Management Restrictions ✅
- **POST** `/api/events` - Create event (admin only)
- **PUT** `/api/events/:id` - Update event (admin only)
- **DELETE** `/api/events/:id` - Delete event (admin only)

---

## Quick Setup

### 1. Database Setup

**Run the initialization script:**
```bash
node scripts/init-db.js
```

This creates the `admins` table in PostgreSQL.

**Manual SQL (if needed):**
```sql
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
```

### 2. Create Admin User

**Run the admin creation script:**
```bash
node scripts/create-admin.js
```

**Default credentials:**
- Email: `admin@test.com`
- Password: `admin123`

**To customize:** Edit `scripts/create-admin.js` before running.

### 3. Environment Variables

**Ensure your `.env` file has:**
```env
# Database (RDS PostgreSQL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Secret (shared with other auth systems)
JWT_SECRET=your-secret-key-change-in-production
```

### 4. Start Backend

```bash
npm start
# or for development
npm run dev
```

---

## File Structure

```
Case-Competition-Backend/
├── models/
│   └── admin.model.js              # Admin table schema
├── repositories/
│   └── admin.repository.js         # PostgreSQL operations
├── services/
│   └── admin.service.js            # Business logic
├── controllers/
│   └── admin.controller.js         # HTTP request handlers
├── routes/
│   └── admin.routes.js            # API routes
├── middleware/
│   └── adminAuth.js                # Admin authentication middleware
├── scripts/
│   ├── init-db.js                  # Database initialization (includes admins)
│   └── create-admin.js             # Create initial admin user
└── ADMIN_*.md                      # Documentation files
```

---

## Testing

### 1. Login as Admin

**cURL:**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**PowerShell:**
```powershell
$body = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
```

### 2. Get Admin Profile

**cURL:**
```bash
curl -X GET http://localhost:3000/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers | ConvertTo-Json
```

### 3. Get All Events

**cURL:**
```bash
curl -X GET http://localhost:3000/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers | ConvertTo-Json
```

### 4. Quick Analytics Smoke Tests

Use these to quickly verify that analytics + dependencies are wired correctly.

**Basic stats:**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/basic-stats" -Method GET -Headers $headers | ConvertTo-Json
```

**Student engagement:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/student-engagement" -Method GET -Headers $headers | ConvertTo-Json
```

**Alumni engagement:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/alumni-engagement" -Method GET -Headers $headers | ConvertTo-Json
```

**Event summaries:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/events/summary" -Method GET -Headers $headers | ConvertTo-Json
```

**System health:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/system-health" -Method GET -Headers $headers | ConvertTo-Json
```

### 5. Create Event (Admin Only)

**cURL:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Case Competition 2024",
    "description": "Annual competition",
    "rubric": ["Criteria 1", "Criteria 2"],
    "slots": [],
    "teams": []
  }'
```

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
}
$body = @{
    title = "Case Competition 2024"
    description = "Annual competition"
    rubric = @("Criteria 1", "Criteria 2")
    slots = @()
    teams = @()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method POST -Headers $headers -Body $body | ConvertTo-Json
```

---

## Key Features

✅ **Separate Authentication** - Admins use separate login system  
✅ **JWT Authentication** - Secure token-based auth (7-day expiry)  
✅ **Password Hashing** - bcrypt with 10 salt rounds  
✅ **Role-Based Access** - Admin tokens required for protected endpoints  
✅ **Event Management** - Admins can create/update/delete events  
✅ **User Management** - Admins can view all students and alumni  
✅ **Status Updates** - Admins can update event statuses  
✅ **SQL Injection Protection** - Parameterized queries  
✅ **Error Handling** - Comprehensive error responses  

---

## Architecture

```
Client Request
    ↓
Express Routes (admin.routes.js)
    ↓
authenticateAdmin Middleware
    ↓
[Token Validation]
    ↓
Controller (admin.controller.js)
    ↓
Service (admin.service.js)
    ↓
Repository (admin.repository.js)
    ↓
PostgreSQL Database (admins table)
```

**For Students/Alumni/Events:**
```
Admin Service
    ↓
Reuses existing repositories:
    ├── student.repository.js → PostgreSQL (students)
    ├── user.repository.js → PostgreSQL (users)
    └── event.repository.js → DynamoDB (Events)
```

---

## Differences from Other User Types

| Feature | Admins | Students | Alumni |
|---------|--------|----------|--------|
| **Database** | PostgreSQL only | PostgreSQL + DynamoDB | PostgreSQL + DynamoDB |
| **Table** | `admins` | `students` + `student_profiles` | `users` + `alumni_profiles` |
| **ID Type** | Integer (SERIAL) | UUID | Integer (SERIAL) |
| **Extended Profile** | No | Yes | Yes |
| **Resume Upload** | No | Yes | Yes |
| **Token Field** | `adminId` | `studentId` | `userId` |
| **Login Endpoint** | `/admin/login` | `/api/students/login` | `/api/auth/login` |

---

## Security Features

1. **Password Security**
   - Passwords hashed with bcrypt (10 salt rounds)
   - Never returned in API responses

2. **JWT Authentication**
   - Tokens signed with JWT_SECRET
   - 7-day expiration
   - Validated on every request

3. **Role-Based Access**
   - Admin tokens must contain `adminId`
   - User/student tokens rejected
   - Separate middleware (`authenticateAdmin`)

4. **Event Management**
   - Only admins can create/update/delete events
   - Protected by `authenticateAdmin` middleware

---

## Complete Workflow Example

### 1. Setup
```bash
# Initialize database
node scripts/init-db.js

# Create admin user
node scripts/create-admin.js

# Start server
npm start
```

### 2. Login
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

**Save the token from response.**

### 3. Use Admin Endpoints
```bash
# Get profile
curl -X GET http://localhost:3000/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all events
curl -X GET http://localhost:3000/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create event
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Event","description":"Description"}'
```

---

## Documentation

- **Full API Docs:** `ADMIN_API_DOCUMENTATION.md`
- **Data Flow:** `ADMIN_DATA_FLOW.md`
- **Setup Checklist:** `ADMIN_SETUP_CHECKLIST.md`
- **This Quick Start:** `ADMIN_QUICK_START.md`
- **Testing Commands:** `TEST_ADMIN_API.md`

---

## Next Steps

1. ✅ Database table created
2. ✅ Admin user created
3. ✅ Backend endpoints implemented
4. ⏳ Test all endpoints
5. ⏳ Set up production admin accounts
6. ⏳ Integrate with frontend
7. ⏳ Configure event management

---

## Support

For detailed information, see:
- `ADMIN_API_DOCUMENTATION.md` - Complete API reference
- `ADMIN_SETUP_CHECKLIST.md` - Step-by-step setup
- `ADMIN_DATA_FLOW.md` - Data flow documentation

---

## Summary

The Admin module provides:
- ✅ Separate authentication system
- ✅ Admin-only endpoints
- ✅ Event management privileges
- ✅ User viewing capabilities
- ✅ Simple PostgreSQL-only architecture
- ✅ Secure JWT-based authentication

Ready to manage your case competition platform! 🚀

