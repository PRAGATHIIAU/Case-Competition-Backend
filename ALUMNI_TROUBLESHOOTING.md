# Alumni Profile Troubleshooting Guide

## Common Errors and Solutions

### Error: "The provided key element does not match the schema"

This error occurs when the DynamoDB table expects a different data type for the partition key.

#### Solution 1: Verify Table Schema

Ensure your DynamoDB table `alumni_profiles` has:
- **Partition Key:** `userId` (Type: **Number**, not String)

**To check/fix:**
1. Go to DynamoDB Console
2. Select `alumni_profiles` table
3. Check the partition key type
4. If it's String, you need to recreate the table with Number type

#### Solution 2: Verify Lambda Environment Variable

Ensure your Lambda function has:
```
ALUMNI_PROFILES_TABLE_NAME=alumni_profiles
```

#### Solution 3: Check userId Type

The code now automatically converts `userId` to a number, but verify:
- RDS returns `id` as an integer (SERIAL type)
- Service converts it to Number before sending to DynamoDB
- Lambda receives it and ensures it's a Number

#### Solution 4: Table Doesn't Exist

If the table doesn't exist, create it:

1. **Go to DynamoDB Console**
2. **Create Table:**
   - Table name: `alumni_profiles`
   - Partition key: `userId` (Type: **Number**)
   - Table settings: On-demand (recommended)

### Error: "Request failed with status code 500"

This usually means:
1. Lambda function error (check CloudWatch logs)
2. Table doesn't exist
3. Wrong table name in environment variable
4. IAM permissions issue

#### Debugging Steps:

1. **Check Lambda Logs:**
   - Go to CloudWatch → Log groups
   - Find `/aws/lambda/your-lambda-function-name`
   - Check recent log streams for errors

2. **Verify API Gateway URL:**
   - Check `.env` file has correct `API_GATEWAY_DYNAMODB_URL`
   - Test the endpoint directly with a simple request

3. **Test Lambda Directly:**
   ```json
   {
     "operation": "putAlumniProfile",
     "userId": 1,
     "profileData": {
       "skills": ["JavaScript"],
       "aspirations": "Test"
     }
   }
   ```

4. **Check IAM Permissions:**
   - Lambda execution role needs:
     - `dynamodb:GetItem`
     - `dynamodb:PutItem`
     - `dynamodb:UpdateItem`
     - `dynamodb:DeleteItem`
   - Resource: `arn:aws:dynamodb:REGION:ACCOUNT_ID:table/alumni_profiles`

### Error: "DynamoDB service is unavailable"

This means the API Gateway endpoint is not reachable or misconfigured.

**Check:**
1. `API_GATEWAY_DYNAMODB_URL` in `.env` is correct
2. API Gateway is deployed
3. Lambda function is attached to the endpoint
4. Network connectivity

### Error: "User not found"

This happens when:
- User doesn't exist in RDS
- Wrong user ID provided
- User was deleted

**Solution:** Verify the user exists in the `users` table first.

---

## Testing Checklist

### 1. Verify Database Setup
```sql
-- Check users table structure
\d users

-- Should show:
-- id (integer)
-- email, name, password, contact
-- willing_to_be_mentor, mentor_capacity, willing_to_be_judge, willing_to_be_sponsor
-- created_at, updated_at
```

### 2. Verify DynamoDB Table
- Table name: `alumni_profiles`
- Partition key: `userId` (Number)
- Table exists and is accessible

### 3. Verify Lambda Configuration
- Environment variable: `ALUMNI_PROFILES_TABLE_NAME=alumni_profiles`
- IAM permissions for DynamoDB
- Handler code updated with alumni operations

### 4. Test Signup Without Profile Data
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test@example.com" \
  -F "name=Test User" \
  -F "password=password123"
```

Should succeed even without profile data.

### 5. Test Signup With Profile Data
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -F "email=test2@example.com" \
  -F "name=Test User 2" \
  -F "password=password123" \
  -F "willing_to_be_mentor=yes" \
  -F "mentor_capacity=5" \
  -F "skills=[\"JavaScript\"]"
```

---

## Quick Fixes

### If userId Type Mismatch:

**Option 1: Recreate Table (if no data)**
1. Delete `alumni_profiles` table
2. Create new table with `userId` as Number type

**Option 2: Update Code (if table is String)**
- Change Lambda handler to use String type
- Update service to send userId as string

### If Table Doesn't Exist:

Create the table immediately - the code will handle it gracefully if profile save fails during signup.

### If Lambda Not Updated:

1. Copy updated `lambda/dynamodb-handler.js` to Lambda console
2. Set environment variable: `ALUMNI_PROFILES_TABLE_NAME=alumni_profiles`
3. Deploy Lambda function

---

## Debugging Commands

### Check Backend Logs
```bash
# Look for DynamoDB errors
npm run dev
# Watch console for error messages
```

### Test API Gateway Directly
```bash
curl -X POST https://your-api-gateway-url/dynamodb \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "putAlumniProfile",
    "userId": 1,
    "profileData": {
      "skills": ["Test"]
    }
  }'
```

### Check DynamoDB Table
```bash
# Using AWS CLI (if configured)
aws dynamodb describe-table --table-name alumni_profiles
```

---

## Expected Behavior

### Successful Signup (No Profile Data)
- Creates user in RDS ✅
- No DynamoDB operation (no error) ✅
- Returns merged data with empty profile fields ✅

### Successful Signup (With Profile Data)
- Creates user in RDS ✅
- Creates profile in DynamoDB ✅
- Returns merged data ✅

### Failed Profile Save (During Signup)
- Creates user in RDS ✅
- Logs error for DynamoDB ❌
- Returns user data with empty profile fields ✅
- **User can still login and add profile later**

---

## Still Having Issues?

1. Check CloudWatch logs for detailed Lambda errors
2. Verify table schema matches code expectations
3. Test with minimal data first (no profile fields)
4. Ensure all environment variables are set correctly
5. Check API Gateway endpoint is correct and deployed

