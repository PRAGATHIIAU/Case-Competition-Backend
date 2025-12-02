# Resume Upload Failure Diagnostics

## What Was Fixed

1. **Signup no longer fails if resume upload fails** - Both student and alumni signup now handle S3 upload failures gracefully
2. **resume_url will be `null` if upload fails** - This is the correct behavior
3. **Enhanced error logging** - Detailed logs to help diagnose why uploads are failing

## How to Diagnose Upload Failures

### Step 1: Check Server Logs

When you attempt a signup with a resume file, look for these log messages:

#### ✅ Success Indicators:
```
📤 Uploading resume to API Gateway: https://xxxxx.execute-api.region.amazonaws.com/prod/upload
📋 Upload details: { fileName: '...', mimeType: '...', fileSize: ... }
📥 Upload response received: { status: 200, ... }
✅ Resume uploaded successfully to S3: https://...
```

#### ❌ Failure Indicators:
```
❌ Failed to upload resume to S3: { error: '...', ... }
❌ API Gateway upload error details: { ... }
```

### Step 2: Common Failure Causes

#### 1. **API Gateway URL Not Configured**
**Error Message:**
```
API Gateway upload URL is not configured. Please set API_GATEWAY_UPLOAD_URL in your .env file.
```

**Solution:**
- Check your `.env` file
- Add: `API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload`
- Replace `xxxxx` with your actual API Gateway ID
- Replace `region` with your AWS region (e.g., `us-east-1`)
- Replace `prod` with your stage name

#### 2. **Invalid API Gateway URL Format**
**Error Message:**
```
Invalid API Gateway URL format: ...
Expected format: https://xxxxx.execute-api.region.amazonaws.com/stage/upload
```

**Solution:**
- Verify the URL format matches exactly
- Ensure it ends with `/upload`
- Check for typos in the URL

#### 3. **API Gateway Endpoint Not Found (404)**
**Error Message:**
```
API Gateway endpoint not found or misconfigured (404).
Please verify: 1) API Gateway URL is correct, 2) API Gateway is deployed, 
3) POST method exists on /upload resource, 4) Authorization is set to "None"
```

**Solution:**
1. **Check API Gateway is Deployed:**
   - Go to AWS Console → API Gateway
   - Select your API
   - Go to "Stages" → Check if your stage (e.g., `prod`) exists
   - If not deployed, click "Deploy API"

2. **Verify Resource Exists:**
   - Go to "Resources" in API Gateway
   - Check if `/upload` resource exists
   - If missing, create it

3. **Verify POST Method:**
   - Click on `/upload` resource
   - Check if `POST` method exists
   - If missing, create POST method

4. **Check Authorization:**
   - Click on POST method → "Method Request"
   - Set "Authorization" to `None` (not AWS_IAM or API Key)
   - Set "API Key Required" to `false`
   - Save and **Deploy API again**

#### 4. **Missing Authentication Token (403)**
**Error Message:**
```
API Gateway endpoint not found or misconfigured (403).
Missing Authentication Token
```

**Solution:**
- Same as #3 above - check authorization settings
- Ensure Authorization is set to `None` in Method Request
- Deploy API after making changes

#### 5. **Upload Service Unavailable (No Response)**
**Error Message:**
```
Upload service is unavailable (no response received).
Please check: 1) API Gateway URL is correct, 2) API Gateway is deployed and accessible, 
3) Network connectivity, 4) Firewall settings.
```

**Solution:**
1. **Test API Gateway directly:**
   ```bash
   curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/upload \
     -F "file=@test.pdf"
   ```
   - If this fails, the issue is with API Gateway configuration
   - If this works, the issue is with your backend code

2. **Check Network Connectivity:**
   - Verify your server can reach AWS API Gateway
   - Check firewall/security group settings
   - Verify no proxy is blocking the request

3. **Check Lambda Function:**
   - Go to AWS Console → Lambda
   - Find your upload Lambda function
   - Check CloudWatch logs for errors
   - Verify Lambda timeout is set to 30 seconds

#### 6. **Invalid Response from Upload Service**
**Error Message:**
```
Invalid response from upload service. Expected { "url": "<s3-url>" }, got: ...
```

**Solution:**
1. **Check Lambda Function Response:**
   - Lambda should return: `{ "success": true, "url": "<s3-url>" }`
   - Check Lambda code in `lambda/s3-upload-handler.js`
   - Verify Lambda is returning the correct format

2. **Check Lambda Environment Variables:**
   - Verify `S3_BUCKET_NAME` is set in Lambda environment variables
   - Verify Lambda execution role has S3 PutObject permissions

3. **Check S3 Bucket:**
   - Verify S3 bucket exists
   - Verify bucket name matches `S3_BUCKET_NAME` in Lambda
   - Check bucket permissions

#### 7. **File Validation Errors**
**Error Message:**
```
Invalid file type. Only PDF, DOC, and DOCX files are allowed.
```

**Solution:**
- Ensure file is PDF, DOC, or DOCX format
- Check file size is under 5MB
- Verify file is not corrupted

### Step 3: Test API Gateway Directly

Test the upload endpoint directly to isolate the issue:

```bash
# Test upload endpoint
curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/upload \
  -F "file=@test.pdf" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "url": "https://bucket-name.s3.region.amazonaws.com/resumes/1234567890_test.pdf"
}
```

**If this fails:**
- Issue is with API Gateway/Lambda configuration
- Check API Gateway deployment
- Check Lambda function logs in CloudWatch
- Check Lambda execution role permissions

**If this succeeds:**
- Issue is with your backend code
- Check server logs for detailed error messages
- Verify `API_GATEWAY_UPLOAD_URL` in `.env` matches the test URL

### Step 4: Check Lambda Function

1. **Go to AWS Console → Lambda**
2. **Find your upload Lambda function** (likely named something like `s3-upload-handler`)
3. **Check Configuration:**
   - Environment variables: `S3_BUCKET_NAME` should be set
   - Timeout: Should be at least 30 seconds
   - Memory: 512 MB or more
   - Handler: Should match your function (e.g., `index.handler`)

4. **Check Execution Role:**
   - Go to "Configuration" → "Permissions"
   - Verify execution role has S3 permissions:
     - `s3:PutObject`
     - `s3:PutObjectAcl`

5. **Check CloudWatch Logs:**
   - Go to "Monitor" → "View CloudWatch logs"
   - Look for errors when upload is attempted
   - Common errors:
     - `S3_BUCKET_NAME environment variable is not set`
     - `Access Denied` (permissions issue)
     - `Bucket does not exist`

## Quick Checklist

- [ ] `API_GATEWAY_UPLOAD_URL` is set in `.env` file
- [ ] API Gateway URL format is correct (ends with `/upload`)
- [ ] API Gateway is deployed to the correct stage
- [ ] `/upload` resource exists in API Gateway
- [ ] `POST` method exists on `/upload` resource
- [ ] Authorization is set to `None` in Method Request
- [ ] Lambda function is attached to API Gateway
- [ ] Lambda function has `S3_BUCKET_NAME` environment variable
- [ ] Lambda execution role has S3 PutObject permissions
- [ ] S3 bucket exists and is accessible
- [ ] Test curl command to API Gateway works
- [ ] Server logs show detailed error messages

## What Happens Now

With the fix:
- ✅ Signup will **NOT fail** if resume upload fails
- ✅ `resume_url` will be `null` if upload fails (correct behavior)
- ✅ Detailed error logs will help you diagnose the issue
- ✅ Signup continues successfully even if resume upload fails

Check your server logs after attempting a signup to see the specific error message and follow the troubleshooting steps above.

