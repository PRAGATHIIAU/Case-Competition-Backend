# Lambda Function Deployment Instructions

## Issue
The error "title and description are required" indicates that your deployed Lambda function in AWS is still using the old code that expects `title` and `description` fields directly in the request body.

## Solution
You need to update your Lambda function in AWS with the new code from `lambda/dynamodb-handler.js`.

## Steps to Deploy Updated Lambda Function

### Option 1: Using AWS Lambda Console (Web UI)

1. **Open AWS Lambda Console**
   - Go to https://console.aws.amazon.com/lambda/
   - Navigate to your DynamoDB handler function

2. **Update the Code**
   - Click on your Lambda function
   - Go to the "Code" tab
   - Copy the entire contents of `lambda/dynamodb-handler.js` from your local project
   - Paste it into the Lambda code editor (replace `index.js` or the handler file)
   - Click "Deploy" button

3. **Verify Environment Variables**
   - Go to "Configuration" → "Environment variables"
   - Ensure `EVENTS_TABLE_NAME` is set (default: "Events")

4. **Test the Function**
   - Go to "Test" tab
   - Create a test event with the new format:
   ```json
   {
     "body": {
       "operation": "create",
       "eventInfo": {
         "name": "Test Event",
         "description": "Test Description"
       },
       "teams": [],
       "rubrics": [],
       "judges": [],
       "scores": []
     }
   }
   ```

### Option 2: Using AWS CLI

1. **Package and Deploy**
   ```bash
   # Zip the Lambda function (if you have dependencies)
   cd lambda
   zip function.zip dynamodb-handler.js
   
   # Update the function
   aws lambda update-function-code \
     --function-name your-function-name \
     --zip-file fileb://function.zip
   ```

### Option 3: Using AWS SAM or CloudFormation

If you're using Infrastructure as Code, update your template and redeploy.

## Important Notes

1. **Handler Name**: Make sure your Lambda handler is set to:
   - Handler: `index.handler` (if file is `index.js`)
   - OR: `dynamodb-handler.handler` (if file is `dynamodb-handler.js`)

2. **Runtime**: Ensure Node.js 18.x or later

3. **IAM Permissions**: The Lambda execution role needs:
   - `dynamodb:GetItem`
   - `dynamodb:PutItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:DeleteItem`
   - `dynamodb:Scan`

4. **Timeout**: Set timeout to at least 30 seconds

5. **Memory**: 256 MB should be sufficient

## Verification

After deployment, test the create endpoint again with your request body. The error should be resolved.

## Backward Compatibility

The updated Lambda handler supports both formats:
- **Old format**: `{ "title": "...", "description": "..." }`
- **New format**: `{ "eventInfo": { "name": "...", "description": "..." } }`

So existing code using the old format will continue to work.

