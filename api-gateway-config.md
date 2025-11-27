# API Gateway Configuration

This document explains how to configure API Gateway endpoints for:
1. **S3 File Uploads** - Resume uploads via Lambda
2. **DynamoDB Events** - Event CRUD operations via Lambda

Both endpoints use the same API Gateway REST API.

## Step 1: Create API Gateway REST API

1. Go to API Gateway Console
2. Click "Create API"
3. Choose "REST API" → "Build"
4. Configure:
   - **Protocol**: REST
   - **Create new API**: New API
   - **API name**: `case-competition-api` (or your preferred name)
   - **Endpoint Type**: Regional (or Edge if preferred)
5. Click "Create API"

---

## Part A: S3 Upload Endpoint Configuration

### Step 2A: Create Upload Resource and Method

1. In the API, click "Actions" → "Create Resource"
   - **Resource Name**: `upload`
   - **Resource Path**: `upload`
   - Click "Create Resource"

2. With the `/upload` resource selected, click "Actions" → "Create Method"
   - Select **POST**
   - Click the checkmark

### Step 3A: Configure Upload POST Method

1. **Integration type**: Lambda Function
2. **Use Lambda Proxy integration**: ✅ Check this box
3. **Lambda Region**: Select your region
4. **Lambda Function**: Select `s3-resume-upload-handler` (or your function name)
5. Click "Save"
6. Click "OK" when prompted to give API Gateway permission to invoke Lambda

### Step 4A: Enable Binary Media Types (for Upload Endpoint)

1. In API Gateway console, go to your API
2. Click "Settings" in the left sidebar
3. Under "Binary Media Types", add:
   - `multipart/form-data`
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - `*/*` (optional, accepts all binary types)
4. Click "Save Changes"

### Step 5A: Configure Upload Method Request

1. Select the POST method
2. Click "Method Request"
3. Configure:
   - **Authorization**: None (or configure if you need auth)
   - **Request Validator**: None
   - **API Key Required**: false

### Step 6A: Configure Upload Integration Request (if not using Proxy)

If you're NOT using Lambda Proxy Integration, configure mapping:

1. Click "Integration Request"
2. Under "Mapping Templates", add:
   - **Content-Type**: `multipart/form-data`
   - **Template**:
   ```json
   {
     "body": "$input.body",
     "isBase64Encoded": true,
     "headers": {
       "content-type": "$input.params().header.get('Content-Type')",
       "content-disposition": "$input.params().header.get('Content-Disposition')"
     }
   }
   ```

### Step 7A: Configure Upload Integration Response

1. Click "Integration Response"
2. Expand the 200 response
3. Under "Mapping Templates", add:
   - **Content-Type**: `application/json`
   - **Template**: `$input.json('$')`

---

## Part B: DynamoDB Events Endpoint Configuration

### Step 2B: Create Events Resource and Method

1. In the same API, click "Actions" → "Create Resource"
   - **Resource Name**: `events`
   - **Resource Path**: `events`
   - Click "Create Resource"

2. With the `/events` resource selected, click "Actions" → "Create Method"
   - Select **POST**
   - Click the checkmark

### Step 3B: Configure Events POST Method

1. **Integration type**: Lambda Function
2. **Use Lambda Proxy integration**: ✅ Check this box
3. **Lambda Region**: Select your region
4. **Lambda Function**: Select `dynamodb-events-handler` (or your function name)
5. Click "Save"
6. Click "OK" when prompted to give API Gateway permission to invoke Lambda

### Step 4B: Configure Events Method Request

1. Select the POST method on `/events`
2. Click "Method Request"
3. Configure:
   - **Authorization**: None
   - **Request Validator**: None
   - **API Key Required**: false

### Step 5B: Enable CORS for Events Endpoint (if needed)

1. Select the POST method on `/events`
2. Click "Actions" → "Enable CORS"
3. Configure:
   - **Access-Control-Allow-Origin**: `*` (or your domain)
   - **Access-Control-Allow-Headers**: `Content-Type`
   - **Access-Control-Allow-Methods**: `POST, OPTIONS`
4. Click "Enable CORS and replace existing CORS headers"

---

## Step 8: Deploy API

1. Click "Actions" → "Deploy API"
2. **Deployment stage**: `[New Stage]` or select existing
3. **Stage name**: `prod` (or `dev`)
4. **Stage description**: Production (or Development)
5. Click "Deploy"

## Step 9: Get Invocation URLs

After deployment, you'll see:
- **Base Invoke URL**: `https://xxxxx.execute-api.region.amazonaws.com/prod`

Your endpoints will be:
- **Upload**: `https://xxxxx.execute-api.region.amazonaws.com/prod/upload`
- **Events**: `https://xxxxx.execute-api.region.amazonaws.com/prod/events`

**Copy these URLs** and add them to your `.env` file:
- `API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload`
- `API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/events`

## Step 10: Enable CORS (if needed)

If calling from a browser:

1. Select the POST method
2. Click "Actions" → "Enable CORS"
3. Configure:
   - **Access-Control-Allow-Origin**: `*` (or your domain)
   - **Access-Control-Allow-Headers**: `Content-Type`
   - **Access-Control-Allow-Methods**: `POST, OPTIONS`
4. Click "Enable CORS and replace existing CORS headers"
5. **Deploy API again** after enabling CORS

## Testing

### Test Upload Endpoint

Using curl:
```bash
curl -X POST \
  https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/resume.pdf"
```

Or using Postman:
- Method: POST
- URL: `https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/upload`
- Body: form-data
- Key: `file` (type: File)
- Value: Select a PDF file

### Test Events Endpoint

Using curl:
```bash
curl -X POST \
  https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/events \
  -H "Content-Type: application/json" \
  -d '{"operation":"getAll"}'
```

Or using Postman:
- Method: POST
- URL: `https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/events`
- Body: raw JSON
- Content-Type: application/json
- Body example:
```json
{
  "operation": "getAll"
}
```

## Troubleshooting

### Issue: "Missing Authentication Token" Error (403/404)

This error typically means API Gateway cannot find the endpoint. Check:

1. **API Gateway is Deployed**
   - Go to API Gateway Console → Your API → Stages
   - Ensure your stage (e.g., `prod` or `dev`) exists and is deployed
   - The URLs should be:
     - `https://xxxxx.execute-api.region.amazonaws.com/stage/upload`
     - `https://xxxxx.execute-api.region.amazonaws.com/stage/events`
   - If you see "Not Deployed", click "Deploy API"

2. **Correct URL Format**
   - Your `.env` should have:
     - `API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload`
     - `API_GATEWAY_DYNAMODB_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/events`
   - Replace `xxxxx` with your actual API ID
   - Replace `region` with your AWS region (e.g., `us-east-1`)
   - Replace `prod` with your stage name
   - **Important**: URLs must end with `/upload` and `/events` respectively

3. **Method Request Configuration**
   - For `/upload`: Select your API → Resources → `/upload` → POST method → "Method Request"
   - For `/events`: Select your API → Resources → `/events` → POST method → "Method Request"
   - **Authorization**: Must be set to `None` (not AWS_IAM or API Key)
   - **API Key Required**: Must be `false`
   - Save and **Deploy API again**

4. **Resource and Method Exist**
   - Verify `/upload` and `/events` resources exist
   - Verify `POST` method exists on both resources
   - If missing, create them following Steps 2A-3A and 2B-3B above

5. **Test the Endpoints Directly**
   ```bash
   # Test upload
   curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/upload \
     -F "file=@test.pdf"
   
   # Test events
   curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod/events \
     -H "Content-Type: application/json" \
     -d '{"operation":"getAll"}'
   ```
   - If these fail, the issue is with API Gateway configuration
   - If these work, the issue is with your backend code

### Issue: Lambda receives empty body
- **Solution**: Ensure binary media types are configured correctly
- Check that `isBase64Encoded` is set to `true` in API Gateway

### Issue: CORS errors
- **Solution**: Enable CORS in API Gateway and deploy again
- Check that Lambda returns CORS headers in response

### Issue: Timeout errors
- **Solution**: Increase Lambda timeout to 30 seconds
- Check API Gateway timeout settings

### Issue: 502 Bad Gateway
- **Solution**: Check Lambda function logs in CloudWatch
- **For Upload**: Verify Lambda execution role has S3 permissions and `S3_BUCKET_NAME` environment variable is set
- **For Events**: Verify Lambda execution role has DynamoDB permissions and `EVENTS_TABLE_NAME` environment variable is set

## Alternative: Using API Gateway HTTP API

If you prefer HTTP API (simpler, cheaper):

1. Create HTTP API instead of REST API
2. Add route: `POST /upload`
3. Attach Lambda integration
4. Deploy

HTTP API automatically handles binary data better, but REST API gives more control.

