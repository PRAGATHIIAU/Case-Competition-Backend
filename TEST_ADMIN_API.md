# Testing Admin API - PowerShell Commands

## PowerShell Commands for Testing Admin Endpoints

### 1. Test Admin Login

```powershell
$body = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $body -ContentType "application/json"
$response | ConvertTo-Json
```

**Save the token:**
```powershell
$token = $response.data.token
Write-Host "Token saved: $token"
```

---

### 2. Test Get Admin Profile

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers
$response | ConvertTo-Json
```

---

### 3. Test Get All Events

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers
$response | ConvertTo-Json
```

---

### 4. Test Get All Students

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/students" -Method GET -Headers $headers
$response | ConvertTo-Json
```

---

### 5. Test Get All Alumni

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/alumni" -Method GET -Headers $headers
$response | ConvertTo-Json
```

---

### 6. Test Update Event Status

```powershell
$headers = @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
}

$body = @{
    status = "approved"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/events/EVT-1234567890-abc123/status" -Method PUT -Headers $headers -Body $body
$response | ConvertTo-Json
```

---

## Quick Test Script (Copy-Paste All at Once)

```powershell
# Step 1: Login
Write-Host "`n=== Testing Admin Login ===" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Login successful! Token: $($token.Substring(0, 20))..." -ForegroundColor Green

# Step 2: Get Profile
Write-Host "`n=== Testing Get Profile ===" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
$profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/profile" -Method GET -Headers $headers
Write-Host "Profile retrieved!" -ForegroundColor Green
$profileResponse | ConvertTo-Json

# Step 3: Get Events
Write-Host "`n=== Testing Get Events ===" -ForegroundColor Cyan
$eventsResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -Headers $headers
Write-Host "Events retrieved! Count: $($eventsResponse.count)" -ForegroundColor Green
$eventsResponse | ConvertTo-Json

# Step 4: Test Unauthorized (should fail)
Write-Host "`n=== Testing Unauthorized Access ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "http://localhost:3000/admin/events" -Method GET -ErrorAction Stop
} catch {
    Write-Host "✅ Unauthorized access correctly blocked!" -ForegroundColor Green
}
```

---

## Alternative: Using curl.exe (if available)

If you have curl.exe installed, you can use:

```powershell
curl.exe -X POST http://localhost:3000/admin/login -H "Content-Type: application/json" -d '{\"email\":\"admin@test.com\",\"password\":\"admin123\"}'
```

Note: Use `curl.exe` (not just `curl`) to use the actual curl binary instead of PowerShell's alias.

