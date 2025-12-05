# N8N Workflow Testing Guide

Complete step-by-step testing instructions for all 4 event management workflows.

## Quick Reference: Testing All 4 Workflows

1. **Workflow 1**: Judge Registration → Test by registering a judge
2. **Workflow 2**: Status Update → Test by updating judge status (approved/denied)
3. **Workflow 3**: Event Reminder → Test manually or wait for cron (00:00 daily)
4. **Workflow 4**: Thank You → Test manually or wait for cron (23:59 daily)

---

## Prerequisites Checklist

Before testing:
- [ ] All 4 workflows imported and configured in n8n
- [ ] All workflows **activated** in n8n (toggle switch ON)
- [ ] Backend server running and accessible
- [ ] Backend `.env` has actual n8n webhook URLs (not placeholders)
- [ ] Email credentials configured in n8n (SMTP/Gmail)
- [ ] Set Configuration nodes updated with correct values
- [ ] Test event ID available
- [ ] Test judge/alumni user ID available
- [ ] Admin authentication token available (for workflow 2)

---

## Diagnostic Tools

Before testing, run diagnostics:

```bash
# Check webhook configuration
node scripts/diagnose-webhook-issue.js

# Test webhook connectivity
node scripts/test-n8n-webhook.js
```

---

## Workflow 1: Judge Registration Email Flow

### Quick Test

```bash
# Register a judge
curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "alumniEmail": "judge@example.com",
    "alumniName": "Test Judge"
  }'
```

### Detailed Test Steps

#### Step 1: Verify Configuration

1. **Run diagnostic**:
   ```bash
   node scripts/diagnose-webhook-issue.js
   ```

2. **Check webhook URL**:
   - Open Workflow 1 in n8n
   - Click "Judge Registration Webhook" node
   - Copy the Production URL
   - Verify it matches `N8N_WEBHOOK_JUDGE_REGISTERED_URL` in backend `.env`

3. **Verify workflow is activated**:
   - Toggle switch in n8n should be ON (green)

#### Step 2: Register a Judge

```bash
curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "alumniEmail": "judge@example.com",
    "alumniName": "Test Judge",
    "preferredDateTime": "2024-12-25T09:00:00Z",
    "preferredLocation": "Main Hall"
  }'
```

**Replace**:
- `YOUR_EVENT_ID` with actual event ID
- `id: 123` with valid user ID
- Email with valid email address

#### Step 3: Check Backend Logs

Look for these messages:

**✅ Success**:
```
✅ N8N webhook called successfully for judge registration
```

**⚠️ Warning**:
```
⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured. Skipping webhook call.
```
→ **Fix**: Add webhook URL to `.env` file

**⚠️ Error**:
```
⚠️ Failed to call n8n webhook: [error details]
```
→ **Fix**: Check error details (connection, 404, timeout, etc.)

#### Step 4: Check n8n Execution

1. **In n8n**: Go to "Executions" tab
2. **Find latest execution** - should show "Success" (green)
3. **Click execution** to see details:
   - ✅ Webhook triggered
   - ✅ Set Configuration completed
   - ✅ Get Judge Details completed
   - ✅ Get Event Details completed
   - ✅ Email Admin sent
   - ✅ Email Judge Confirmation sent

#### Step 5: Verify Emails

- **Admin inbox**: "New Judge Interest Notification"
- **Judge inbox**: "Registration Confirmed"

### Expected Results

✅ Backend returns success response  
✅ Backend logs show: "N8N webhook called successfully"  
✅ n8n execution shows "Success"  
✅ Admin receives email  
✅ Judge receives confirmation email  

---

## Workflow 2: Admin Approval/Denial Email Flow

### Quick Test

```bash
# Update judge status to approved
curl -X PUT http://localhost:5000/api/events/YOUR_EVENT_ID/judges/YOUR_JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "approved"}'
```

### Detailed Test Steps

#### Step 1: Get Admin Token

```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Save the token from response.

#### Step 2: Test Approval Flow

```bash
curl -X PUT http://localhost:5000/api/events/YOUR_EVENT_ID/judges/YOUR_JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "approved"}'
```

**Replace**:
- `YOUR_EVENT_ID` with event ID
- `YOUR_JUDGE_ID` with judge's user ID (as string, e.g., "123")
- `YOUR_ADMIN_TOKEN` with admin token

#### Step 3: Check n8n Execution

1. Go to n8n Executions tab
2. Verify workflow executed
3. Check IF node routed to approval branch
4. Verify approval email sent

#### Step 4: Test Denial Flow

```bash
curl -X PUT http://localhost:5000/api/events/YOUR_EVENT_ID/judges/YOUR_JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "denied"}'
```

#### Step 5: Verify Emails

- **Approval**: "Congratulations! Your Application Has Been Approved"
- **Denial**: "Update on Your Judge Application"

### Expected Results

✅ Backend returns success  
✅ n8n workflow executes  
✅ IF node routes correctly  
✅ Judge receives appropriate email  

---

## Workflow 3: Event Reminder Email Flow

### Quick Test

1. **Create event for tomorrow**
2. **Manually trigger workflow** in n8n
3. **Check reminder emails sent**

### Detailed Test Steps

#### Step 1: Create Test Event for Tomorrow

```bash
# Get tomorrow's date (ISO 8601 format)
# Example: If today is 2024-12-24, use 2024-12-25T09:00:00Z

curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "eventInfo": {
      "name": "Tomorrow Test Event",
      "description": "Event happening tomorrow",
      "date": "2024-12-25T09:00:00Z",
      "location": "Test Location"
    },
    "judges": [
      {
        "judgeId": "123",
        "status": "approved"
      }
    ],
    "teams": [],
    "rubrics": [],
    "slots": []
  }'
```

#### Step 2: Verify Events Endpoint

```bash
curl http://localhost:5000/api/n8n/events/upcoming/tomorrow
```

Should return events with date = tomorrow.

#### Step 3: Manually Trigger Workflow

1. **Open Workflow 3** in n8n
2. **Click "Execute Workflow"** button (play icon)
3. **Watch execution** in real-time

#### Step 4: Check Execution

- All nodes should complete successfully
- Reminder emails sent to all approved judges

#### Step 5: Verify Emails

- Judge inboxes: "Reminder: Judge for [Event Name] Tomorrow"

---

## Workflow 4: Post-Event Thank You Email Flow

### Quick Test

1. **Create event for today**
2. **Manually trigger workflow** in n8n
3. **Check thank you emails sent**

### Detailed Test Steps

#### Step 1: Create Test Event for Today

```bash
# Use today's date in ISO 8601 format

curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "eventInfo": {
      "name": "Today Test Event",
      "description": "Event that ends today",
      "date": "2024-12-24T09:00:00Z",
      "location": "Test Location"
    },
    "judges": [
      {
        "judgeId": "123",
        "status": "approved"
      }
    ],
    "teams": [],
    "rubrics": [],
    "slots": []
  }'
```

#### Step 2: Verify Events Endpoint

```bash
curl http://localhost:5000/api/n8n/events/ended/today
```

Should return events with date = today.

#### Step 3: Manually Trigger Workflow

1. **Open Workflow 4** in n8n
2. **Click "Execute Workflow"** button
3. **Watch execution**

#### Step 4: Verify Emails

- Judge inboxes: "Thank You for Judging [Event Name]"

---

## Complete Testing Checklist

### Pre-Testing Setup
- [ ] All workflows imported in n8n
- [ ] All workflows activated
- [ ] Webhook URLs configured in backend `.env`
- [ ] Backend server restarted after `.env` updates
- [ ] Email credentials configured in n8n

### Workflow 1 Testing
- [ ] Judge registration endpoint works
- [ ] Webhook triggered in n8n
- [ ] Backend logs show webhook call success
- [ ] Admin email received
- [ ] Judge confirmation email received

### Workflow 2 Testing
- [ ] Approval endpoint works (with admin token)
- [ ] Denial endpoint works (with admin token)
- [ ] Approval email received by judge
- [ ] Denial email received by judge
- [ ] IF node correctly routes based on status

### Workflow 3 Testing
- [ ] Events for tomorrow endpoint returns correct events
- [ ] Reminder emails sent to all approved judges
- [ ] Email contains correct event details
- [ ] Manual trigger works
- [ ] Cron schedule configured correctly

### Workflow 4 Testing
- [ ] Events ended today endpoint returns correct events
- [ ] Thank you emails sent to all approved judges
- [ ] Email contains gratitude message
- [ ] Manual trigger works
- [ ] Cron schedule configured correctly

---

## Troubleshooting

### Workflow 1 Not Executing

**Most Common Issue**: Webhook URL not configured correctly

1. **Check backend logs** after registering judge
2. **Look for warning messages**:
   - `⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured` → Add URL to `.env`
   - `⚠️ Failed to call n8n webhook` → Check error details

3. **Run diagnostic**:
   ```bash
   node scripts/diagnose-webhook-issue.js
   ```

4. **See**: `docs/N8N_WEBHOOK_QUICK_FIX.md` for step-by-step fix

### General Troubleshooting

See comprehensive guide: `docs/N8N_WORKFLOW_TROUBLESHOOTING.md`

---

## Quick Test Commands

```bash
# Set variables
BACKEND_URL="http://localhost:5000"
EVENT_ID="YOUR_EVENT_ID"
JUDGE_ID="123"
ADMIN_TOKEN="YOUR_ADMIN_TOKEN"

# Test Workflow 1
curl -X POST $BACKEND_URL/api/events/$EVENT_ID/register \
  -H "Content-Type: application/json" \
  -d "{\"id\": $JUDGE_ID, \"alumniEmail\": \"judge@example.com\", \"alumniName\": \"Test Judge\"}"

# Test Workflow 2
curl -X PUT $BACKEND_URL/api/events/$EVENT_ID/judges/$JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "approved"}'

# Test n8n API Endpoints
curl $BACKEND_URL/api/n8n/judge/$JUDGE_ID
curl $BACKEND_URL/api/n8n/event/$EVENT_ID
curl $BACKEND_URL/api/n8n/events/upcoming/tomorrow
curl $BACKEND_URL/api/n8n/events/ended/today
```

---

For detailed troubleshooting, see: `docs/N8N_WORKFLOW_TROUBLESHOOTING.md`  
For quick fix guide, see: `docs/N8N_WEBHOOK_QUICK_FIX.md`

