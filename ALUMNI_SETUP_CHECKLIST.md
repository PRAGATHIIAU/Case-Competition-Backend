# Alumni/Industry Profile Setup Checklist

Quick checklist for setting up the Alumni/Industry hybrid RDS + DynamoDB architecture.

## ✅ Required Steps

### 1. Update PostgreSQL Database Schema

**Option A: Alter Existing Table (if resume_url exists)**
```sql
-- Only remove resume_url if it exists (willingness flags stay in RDS)
ALTER TABLE users 
  DROP COLUMN IF EXISTS resume_url;

-- Add willingness flags if they don't exist
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS willing_to_be_mentor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mentor_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS willing_to_be_judge BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS willing_to_be_sponsor BOOLEAN DEFAULT FALSE;
```

**Option B: Fresh Table Creation**
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  willing_to_be_mentor BOOLEAN DEFAULT FALSE,
  mentor_capacity INTEGER,
  willing_to_be_judge BOOLEAN DEFAULT FALSE,
  willing_to_be_sponsor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. Create DynamoDB Table

**Table Name:** `alumni_profiles`

**Partition Key:** `userId` (Number)

**Settings:** On-demand capacity mode

### 3. Update Lambda Function

1. **Copy Code:**
   - Update `lambda/dynamodb-handler.js` in your Lambda console
   - Handler now supports both Events and Alumni Profiles

2. **Environment Variables:**
   ```
   EVENTS_TABLE_NAME=Events
   ALUMNI_PROFILES_TABLE_NAME=alumni_profiles
   ```

3. **IAM Permissions:**
   - Add permissions for `alumni_profiles` table:
     - `dynamodb:GetItem`
     - `dynamodb:PutItem`
     - `dynamodb:UpdateItem`
     - `dynamodb:DeleteItem`

### 4. Verify Environment Variables

Check your `.env` file has:
```env
API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/dynamodb
API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload
```

### 5. Test Endpoints

Use the examples in `ALUMNI_API_DOCUMENTATION.md` to test:
- ✅ Signup
- ✅ Login
- ✅ Update User
- ✅ Save Profile
- ✅ Get Profile

---

## 📋 Quick Test Commands

### Test Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test@example.com" \
  -F "name=Test User" \
  -F "password=password123" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=5"
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Get Profile (replace TOKEN and USER_ID)
```bash
curl -X GET http://localhost:3000/api/auth/user/1/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Verification

After setup, verify:
- [ ] Users table has atomic fields + willingness flags (id, email, name, password, contact, willingness flags, timestamps)
- [ ] DynamoDB `alumni_profiles` table exists with `userId` as partition key
- [ ] DynamoDB table stores profile fields (skills, aspirations, projects, experiences, achievements, resume_url)
- [ ] Lambda function has both environment variables set
- [ ] Lambda execution role has DynamoDB permissions for `alumni_profiles`
- [ ] Signup creates records in both RDS and DynamoDB
- [ ] Login returns merged data from both sources

---

## 📚 Full Documentation

See `ALUMNI_API_DOCUMENTATION.md` for:
- Complete API reference
- All request/response examples
- Error handling
- Data flow diagrams

