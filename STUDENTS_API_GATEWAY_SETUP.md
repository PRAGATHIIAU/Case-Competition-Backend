# Student Profiles API Gateway Setup Guide

This guide explains how to set up API Gateway for Student Profiles DynamoDB operations.

## Overview

The Student Profiles feature uses API Gateway → Lambda → DynamoDB architecture. The Lambda function handles all DynamoDB operations for student extended profiles.

## Prerequisites

1. AWS Account with API Gateway and Lambda access
2. DynamoDB table `student_profiles` created (see main documentation)
3. Lambda function code ready (`lambda/student-profiles-handler.js`)

## Step 1: Create Lambda Function

1. **Go to AWS Lambda Console**
   - Navigate to Lambda → Functions → Create function

2. **Function Configuration:**
   - **Function name:** `student-profiles-handler`
   - **Runtime:** Node.js 18.x
   - **Architecture:** x86_64
   - **Execution role:** Create a new role with basic Lambda permissions

3. **Upload Code:**
   - Copy the contents of `lambda/student-profiles-handler.js`
   - Paste into the Lambda code editor
   - Or zip the file and upload

4. **Environment Variables:**
   - Add environment variable:
     - Key: `STUDENT_PROFILES_TABLE_NAME`
     - Value: `student_profiles`

5. **IAM Permissions:**
   - Go to Configuration → Permissions
   - Click on the execution role
   - Add inline policy with the following JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/student_profiles"
    }
  ]
}
```

6. **Configuration Settings:**
   - **Timeout:** 30 seconds
   - **Memory:** 256 MB

7. **Test the Function:**
   - Create a test event:
   ```json
   {
     "body": {
       "operation": "getStudentProfile",
       "studentId": "test-student-id"
     }
   }
   ```
   - Run the test to verify it works

## Step 2: Create API Gateway

### Option A: New API Gateway (Recommended for separate endpoint)

1. **Create API:**
   - Go to API Gateway → Create API
   - Choose REST API → Build
   - API name: `student-profiles-api`
   - Endpoint type: Regional

2. **Create Resource:**
   - Click "Actions" → Create Resource
   - Resource name: `profiles`
   - Resource path: `profiles`
   - Enable CORS: Yes

3. **Create Method:**
   - Select the `/profiles` resource
   - Click "Actions" → Create Method → POST
   - Integration type: Lambda Function
   - Lambda region: Your region
   - Lambda function: `student-profiles-handler`
   - Enable Lambda proxy integration: Yes

4. **Deploy API:**
   - Click "Actions" → Deploy API
   - Deployment stage: `prod` (or create new)
   - Note the Invoke URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod`)

5. **Update Environment Variable:**
   Add to your `.env` file:
   ```
   API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/profiles
   ```

### Option B: Use Existing API Gateway (If sharing with Events)

If you already have an API Gateway endpoint for DynamoDB operations (e.g., for Events), you can:

1. **Update Existing Lambda:**
   - Modify your existing DynamoDB handler Lambda to support both Events and Student Profiles
   - Or create a separate Lambda and add a new resource/method

2. **Add New Resource:**
   - In your existing API Gateway
   - Create resource: `/student-profiles`
   - Create POST method pointing to `student-profiles-handler` Lambda

3. **Update Environment Variable:**
   ```
   API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/student-profiles
   ```

## Step 3: Configure CORS (if needed)

If calling from a browser, enable CORS:

1. **Select Resource:**
   - Select the resource (e.g., `/profiles`)

2. **Enable CORS:**
   - Click "Actions" → Enable CORS
   - Access-Control-Allow-Origin: `*` (or your domain)
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key`
   - Access-Control-Allow-Methods: `POST,OPTIONS`

3. **Deploy API:**
   - Redeploy the API after enabling CORS

## Step 4: Test API Gateway Endpoint

Test the endpoint using cURL:

```bash
curl -X POST https://xxxxx.execute-api.region.amazonaws.com/prod/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "getStudentProfile",
    "studentId": "test-student-id"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": null
}
```

## Step 5: Update Backend Configuration

1. **Update `.env` file:**
   ```env
   API_GATEWAY_STUDENT_PROFILES_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/profiles
   ```

2. **Restart Backend:**
   - Restart your Node.js backend to load the new environment variable

3. **Test Integration:**
   - Use the Student Profile API endpoints to test the full flow

## API Gateway Request/Response Format

### Request Format

The Lambda expects requests in this format:

```json
{
  "operation": "getStudentProfile" | "putStudentProfile" | "updateStudentProfile" | "deleteStudentProfile",
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "profileData": {
    "skills": [...],
    "aspirations": "...",
    "parsed_resume": {...},
    "projects": [...],
    "experiences": [...],
    "achievements": [...],
    "resume_url": "..."
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {...}
}
```

Or on error:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Troubleshooting

### Common Issues

1. **"Missing Authentication Token" (403/404):**
   - Check that the API Gateway is deployed
   - Verify the endpoint URL is correct
   - Ensure the method (POST) exists on the resource

2. **"Internal Server Error" (500):**
   - Check CloudWatch logs for the Lambda function
   - Verify DynamoDB table exists and has correct name
   - Check IAM permissions for Lambda execution role

3. **"Table not found":**
   - Verify DynamoDB table name matches `STUDENT_PROFILES_TABLE_NAME` environment variable
   - Check table exists in the same region as Lambda

4. **CORS Errors:**
   - Enable CORS on the API Gateway resource
   - Redeploy the API after enabling CORS
   - Check that preflight OPTIONS request is handled

### Debugging

1. **Check Lambda Logs:**
   - Go to CloudWatch → Log groups
   - Find `/aws/lambda/student-profiles-handler`
   - Check recent log streams for errors

2. **Test Lambda Directly:**
   - Use Lambda console test feature
   - Verify function works before testing via API Gateway

3. **Check API Gateway Logs:**
   - Enable CloudWatch logs for API Gateway
   - Check execution logs and access logs

## Security Considerations

1. **API Gateway Authorization:**
   - Consider adding API keys or IAM authorization
   - For production, use AWS Cognito or custom authorizers

2. **Lambda Permissions:**
   - Use least privilege principle
   - Only grant necessary DynamoDB permissions

3. **CORS:**
   - Restrict CORS origins to your frontend domain in production
   - Don't use `*` for Access-Control-Allow-Origin in production

## Next Steps

After setting up API Gateway:

1. Test all Student Profile endpoints
2. Verify data is saved correctly in DynamoDB
3. Test file uploads (resume) via S3 upload endpoint
4. Monitor CloudWatch logs for any issues

## Support

Refer to:
- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- Main documentation: `STUDENTS_API_DOCUMENTATION.md`

