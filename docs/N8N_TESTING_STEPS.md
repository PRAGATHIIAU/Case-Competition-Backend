# N8N Workflow Testing Steps

Complete testing guide for all 4 n8n workflows with step-by-step instructions.

## 🔍 Quick Diagnostic

First, run this to check your configuration:

```bash
node scripts/diagnose-webhook-issue.js
```

This will show you exactly what's wrong with your webhook configuration.

---

## ❌ Common Issue: Workflow 1 Not Executing

### Problem Identified

The diagnostic shows your webhook URL is still a **placeholder**:
```
⚠️ WARNING: URL contains placeholder values!
📝 Replace with your actual n8n webhook URL
```

### Quick Fix (3 Steps)

#### Step 1: Get Your Actual Webhook URL from n8n

1. **Open n8n** interface
2. **Open Workflow 1**: "Judge Registration Email Flow"
3. **Click on "Judge Registration Webhook" node**
4. **Copy the Production URL** (it will look something like):
   - `https://your-instance.n8n.io/webhook/alumni_judge_registered`
   - or `http://localhost:5678/webhook/alumni_judge_registered` (if local)

**⚠️ Important**: Make sure the workflow is **activated** (toggle switch ON/green)

#### Step 2: Update Backend .env File

1. **Open `.env` file** in your project root
2. **Find this line**:
   ```env
   N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
   ```
3. **Replace the placeholder URL** with your actual n8n webhook URL

**Example**:
```env
# ❌ BEFORE (placeholder - won't work)
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered

# ✅ AFTER (actual URL - will work)
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://my-instance-abc123.n8n.io/webhook/alumni_judge_registered
```

#### Step 3: Restart Backend Server

**⚠️ CRITICAL**: After updating `.env`, you MUST restart the backend:

```bash
# Stop server (Ctrl+C)
# Then restart:
npm start

# Or with auto-reload:
npm run dev
```

#### Step 4: Verify Fix

1. **Run diagnostic again**:
   ```bash
   node scripts/diagnose-webhook-issue.js
   ```
   Should show: `✅ URL format is valid` without warnings

2. **Register a test judge**:
   ```bash
   curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
     -H "Content-Type: application/json" \
     -d '{
       "id": 123,
       "alumniEmail": "test@example.com",
       "alumniName": "Test Judge"
     }'
   ```

3. **Check backend console** - should see:
   ```
   ✅ N8N webhook called successfully for judge registration
   ```

4. **Check n8n Executions tab** - should see new execution with "Success"

---

## 📋 Complete Testing Steps

### Test 1: Workflow 1 - Judge Registration

**Endpoint**: `POST /api/events/:eventId/register`

**Test Command**:
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

**What to Check**:
- ✅ Backend response: `{"success": true, ...}`
- ✅ Backend logs: `✅ N8N webhook called successfully`
- ✅ n8n Executions: New execution with "Success" status
- ✅ Admin email received
- ✅ Judge confirmation email received

---

### Test 2: Workflow 2 - Status Update (Approval)

**Endpoint**: `PUT /api/events/:eventId/judges/:judgeId/status`

**Test Command**:
```bash
curl -X PUT http://localhost:5000/api/events/YOUR_EVENT_ID/judges/YOUR_JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "approved"}'
```

**What to Check**:
- ✅ Backend response: Success
- ✅ n8n workflow executes
- ✅ IF node routes to approval branch
- ✅ Judge receives approval email

---

### Test 3: Workflow 2 - Status Update (Denial)

**Test Command**:
```bash
curl -X PUT http://localhost:5000/api/events/YOUR_EVENT_ID/judges/YOUR_JUDGE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "denied"}'
```

**What to Check**:
- ✅ IF node routes to denial branch
- ✅ Judge receives denial email

---

### Test 4: Workflow 3 - Event Reminder

**Prerequisites**: Event with date = tomorrow

**Manual Test**:
1. Create event for tomorrow
2. Open Workflow 3 in n8n
3. Click "Execute Workflow" button
4. Check reminder emails sent

**What to Check**:
- ✅ Events endpoint returns tomorrow's events
- ✅ Reminder emails sent to all approved judges
- ✅ Email contains event details

---

### Test 5: Workflow 4 - Thank You Email

**Prerequisites**: Event with date = today

**Manual Test**:
1. Create event for today
2. Open Workflow 4 in n8n
3. Click "Execute Workflow" button
4. Check thank you emails sent

**What to Check**:
- ✅ Events endpoint returns today's events
- ✅ Thank you emails sent to all approved judges
- ✅ Email contains gratitude message

---

## 🔧 Troubleshooting

### Issue: Workflow 1 Not Executing

**Check these in order**:

1. **Webhook URL configured?**
   ```bash
   node scripts/diagnose-webhook-issue.js
   ```
   - If shows placeholder → Update `.env` with actual URL
   - If not configured → Add to `.env`

2. **Workflow activated?**
   - Check n8n → Workflow 1 → Toggle switch should be ON

3. **Backend restarted?**
   - After updating `.env`, restart backend server

4. **Check backend logs**:
   - Look for warning/error messages
   - See: `docs/N8N_WEBHOOK_QUICK_FIX.md`

### Issue: Emails Not Sending

- Check email credentials in n8n
- Verify email addresses are valid
- Check n8n execution logs for email errors

### Issue: API Endpoints Return 404

- Verify backend server is running
- Check backend URL in Set Configuration node
- Verify endpoint paths match documentation

---

## ✅ Success Criteria

All workflows are working when:

- ✅ **Workflow 1**: Judge registration triggers emails
- ✅ **Workflow 2**: Status update triggers appropriate emails
- ✅ **Workflow 3**: Reminder emails sent for tomorrow's events
- ✅ **Workflow 4**: Thank you emails sent for today's events
- ✅ **No errors** in n8n execution logs
- ✅ **All emails delivered** successfully

---

## 📚 Additional Resources

- **Quick Fix Guide**: `docs/N8N_WEBHOOK_QUICK_FIX.md`
- **Troubleshooting**: `docs/N8N_WORKFLOW_TROUBLESHOOTING.md`
- **Workflow Details**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- **Setup Guide**: `docs/N8N_SETUP_SEQUENCE.md`

---

For immediate help with Workflow 1 not executing, see: `docs/N8N_WEBHOOK_QUICK_FIX.md`

