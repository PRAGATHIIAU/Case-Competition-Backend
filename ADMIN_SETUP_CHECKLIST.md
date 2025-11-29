# Admin Module Setup Checklist

Quick checklist for setting up the Admin module in the Case Competition Backend.

## ✅ Required Steps

### 1. Initialize Database

**Run the database initialization script:**
```bash
node scripts/init-db.js
```

This creates both `users` and `admins` tables. If you only need the admins table, you can run the SQL directly:

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

**✅ Checkpoint:** Verify `admins` table exists in PostgreSQL.

---

### 2. Create Initial Admin User

**Run the admin creation script:**
```bash
node scripts/create-admin.js
```

**Default Credentials:**
- Email: `admin@test.com`
- Password: `admin123`

**To customize:** Edit `scripts/create-admin.js`:
```javascript
const email = 'your-admin@example.com';
const password = 'your-secure-password';
const firstName = 'Your';
const lastName = 'Name';
```

**✅ Checkpoint:** Verify admin user was created successfully.

---

### 3. Verify Environment Variables

**Check your `.env` file has:**
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

**✅ Checkpoint:** All environment variables are set correctly.

---

### 4. Start Backend Server

```bash
npm start
# or for development
npm run dev
```

**✅ Checkpoint:** Server starts without errors.

---

### 5. Test Admin Login

**Test the login endpoint:**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**✅ Checkpoint:** Login returns token successfully.

---

### 6. Test Protected Endpoints

**Save the token from login response, then test:**

**Get Profile:**
```bash
curl -X GET http://localhost:3000/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get All Events:**
```bash
curl -X GET http://localhost:3000/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Checkpoint:** Protected endpoints return data successfully.

---

## 📋 Quick Test Commands

### Test Admin Login (PowerShell)
```powershell
$body = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"
```

### Test Get Profile (PowerShell)
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers | ConvertTo-Json
```

### Test Get Events (PowerShell)
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers | ConvertTo-Json
```

### Test Update Event Status (PowerShell)
```powershell
$headers = @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
}
$body = @{ status = "approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/admin/events/EVT-1234567890-abc123/status" -Method PUT -Headers $headers -Body $body | ConvertTo-Json
```

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] `admins` table exists in PostgreSQL
- [ ] Admin user created successfully (check with: `SELECT * FROM admins;`)
- [ ] Environment variables are set correctly
- [ ] Backend server starts without errors
- [ ] Login endpoint returns token
- [ ] Protected endpoints require authentication
- [ ] Invalid tokens are rejected (401 error)
- [ ] Non-admin tokens are rejected (403 error)
- [ ] Admin can access `/admin/*` endpoints
- [ ] Admin can create/update/delete events (if events module is set up)

---

## 🚨 Common Issues

### Issue: "admins table does not exist"
**Solution:** Run `node scripts/init-db.js` first

### Issue: "Admin with this email already exists"
**Solution:** Admin already exists. Use existing credentials or modify script to use different email.

### Issue: "Authentication required" (401)
**Solution:** 
- Check that you're including `Authorization: Bearer <token>` header
- Verify token is not expired (tokens expire after 7 days)
- Make sure you're using an admin token (not user/student token)

### Issue: "Forbidden" (403)
**Solution:** Token is valid but not for an admin. Make sure you logged in via `/admin/login`, not `/api/auth/login` or `/api/students/login`.

### Issue: "Admin not found" (404)
**Solution:** Admin was deleted or doesn't exist. Create a new admin with `node scripts/create-admin.js`.

---

## 📚 Full Documentation

See other documentation files for:
- **Complete API Reference:** `ADMIN_API_DOCUMENTATION.md`
- **Data Flow:** `ADMIN_DATA_FLOW.md`
- **Quick Start:** `ADMIN_QUICK_START.md`
- **Testing Commands:** `TEST_ADMIN_API.md`

---

## 🎯 Next Steps

After completing this checklist:

1. ✅ Database initialized
2. ✅ Admin user created
3. ✅ Backend running
4. ✅ Login tested
5. ⏳ Test all admin endpoints
6. ⏳ Set up production admin accounts (with secure passwords)
7. ⏳ Integrate with frontend
8. ⏳ Configure event management features

---

## 🔐 Security Recommendations

1. **Change Default Password:** Immediately change the default password after first login
2. **Use Strong Passwords:** Minimum 12 characters, mix of letters, numbers, symbols
3. **Rotate JWT_SECRET:** Use a strong, unique JWT_SECRET in production
4. **Limit Admin Accounts:** Only create admin accounts for trusted personnel
5. **Monitor Admin Activity:** Log admin actions for audit purposes
6. **Token Expiration:** Tokens expire after 7 days - consider shorter for production
7. **HTTPS Only:** Always use HTTPS in production (never send tokens over HTTP)

---

## ✅ Setup Complete!

Once all checkpoints are verified, your Admin module is ready to use!

For detailed API documentation, see `ADMIN_API_DOCUMENTATION.md`.

