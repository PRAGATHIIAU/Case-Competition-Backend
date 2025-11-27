# Lambda Functions

This directory contains Lambda functions that handle AWS service operations via API Gateway. This approach is used because AWS Academy doesn't allow IAM users/roles/access keys, so we use Lambda execution roles instead.

## Lambda Functions

### 1. S3 Resume Upload Handler (`s3-upload-handler.js`)
Handles file uploads from API Gateway and stores them in S3.

See the existing documentation above for setup instructions.

### 2. DynamoDB Events Handler (`dynamodb-handler.js`)
Handles DynamoDB operations for Events (CRUD operations).

### 3. Email Handler (DEPRECATED)
~~SES Email Handler (`ses-email-handler.js`)~~ - **No longer needed**

Email functionality now uses **Nodemailer with SMTP** (Gmail/Outlook) directly from the backend. See `EMAIL_SETUP.md` for email configuration. The SES Lambda handler is no longer required.

---

## DynamoDB Events Handler Setup

### 1. Create Lambda Function

1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Configure:
   - **Function name**: `dynamodb-events-handler`
   - **Runtime**: Node.js 18.x or later
   - **Architecture**: x86_64
   - **Handler**: `index.handler` (if file is named `index.js`)

### 2. Upload Code

**Option A: Using AWS Console**
1. Copy the contents of `dynamodb-handler.js`
2. In Lambda console, paste into the code editor
3. Rename the file to `index.js` in the editor (or update handler name)

**Option B: Using ZIP upload**
1. Create a directory: `mkdir lambda-dynamodb-package`
2. Copy `dynamodb-handler.js` to `lambda-dynamodb-package/index.js`
3. AWS SDK v2 is built into Lambda runtime, so no need to install dependencies
4. Zip: `zip -r function.zip .`
5. Upload ZIP in Lambda console

### 3. Configure Environment Variables

In Lambda function configuration, add:
- **Key**: `EVENTS_TABLE_NAME`
- **Value**: Your DynamoDB table name (e.g., `Events`)

### 4. Configure IAM Permissions

The Lambda execution role needs DynamoDB permissions. Add this policy:

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
        "dynamodb:DeleteItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/Events"
    }
  ]
}
```

Replace `Events` with your actual table name if different.

### 5. Configure Timeout and Memory

- **Timeout**: 30 seconds
- **Memory**: 256 MB

### 6. Test Lambda Function

Create a test event for GET operation:
```json
{
  "httpMethod": "GET",
  "body": "{\"operation\":\"get\",\"eventId\":\"EVT-1234567890-abc123\"}"
}
```

Create a test event for CREATE operation:
```json
{
  "httpMethod": "POST",
  "body": "{\"operation\":\"create\",\"title\":\"Test Event\",\"description\":\"Test Description\"}"
}
```

---

## Email Setup (No Lambda Required)

Email functionality is now handled directly by the backend using **Nodemailer with SMTP** (Gmail/Outlook). This is a free alternative to AWS SES, perfect for AWS Academy accounts.

**Setup Instructions**: See `EMAIL_SETUP.md` in the root directory for detailed email configuration.

**Key Points:**
- No Lambda function needed for email
- No AWS SES required
- Uses Gmail App Password or other SMTP providers
- Configure `EMAIL_USER`, `EMAIL_PASSWORD`, `FROM_EMAIL`, and `ADMIN_EMAIL` in `.env`

---

## API Gateway Integration

See `api-gateway-config.md` for API Gateway setup instructions for all Lambda functions.

### API Gateway Endpoints Needed

1. **DynamoDB Endpoint**: `POST /events` (or `/dynamodb-events`)
   - Integrates with `dynamodb-events-handler` Lambda
   - Method: POST
   - Request body: JSON with `operation` and data fields

2. **S3 Upload Endpoint**: `POST /upload`
   - Integrates with `s3-resume-upload-handler` Lambda
   - Method: POST
   - Request body: multipart/form-data with file

**Note**: Email endpoint is no longer needed. Email is sent directly from the backend using Nodemailer.

### Request Format

**DynamoDB Operations:**

- **Get All Events**: `{ "operation": "getAll" }`
- **Get Event**: `{ "operation": "get", "eventId": "EVT-123" }`
- **Create Event**: `{ "operation": "create", "title": "...", "description": "..." }`
- **Update Event**: `{ "operation": "update", "eventId": "EVT-123", "title": "..." }`
- **Delete Event**: `{ "operation": "delete", "eventId": "EVT-123" }`

**S3 Upload:**

Request: multipart/form-data
- `file`: PDF, DOC, or DOCX file (max 5MB)

Response:
```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/bucket-name/filename.pdf"
}
```

---

## Troubleshooting

### DynamoDB Handler

- **Error: "Table not found"**: Ensure the DynamoDB table exists and `EVENTS_TABLE_NAME` environment variable is set correctly
- **Error: "Access denied"**: Check IAM permissions for the Lambda execution role
- **Error: "Invalid operation"**: Ensure the `operation` field in the request body is one of: `get`, `getAll`, `create`, `update`, `delete`

### Email Service (Backend - Nodemailer)

Email errors are handled by the backend. See `EMAIL_SETUP.md` for troubleshooting:
- **Error: "Email authentication failed"**: Check Gmail App Password configuration
- **Error: "Could not connect to SMTP server"**: Verify SMTP_HOST and SMTP_PORT settings
- **Error: "SMTP connection timed out"**: Check network connectivity and firewall settings
