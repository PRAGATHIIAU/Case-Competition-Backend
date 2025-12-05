# N8N Workflow Troubleshooting Guide

## Issue: Workflow 1 Not Executing After Judge Registration

If you registered a judge but Workflow 1 didn't execute, follow these diagnostic steps:

---

## Diagnostic Checklist

### Step 1: Check Backend Logs

After registering a judge, check your backend console/logs for these messages:

**✅ Success Message:**
```
✅ N8N webhook called successfully for judge registration
```

**⚠️ Warning Messages:**
```
⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured. Skipping webhook call.
```
- **Solution**: Webhook URL is not set in `.env` file

```
⚠️ Failed to call n8n webhook (registration will still succeed): [error details]
```
- **Solution**: Webhook URL is configured but the call failed (see error details)

---

## Common Issues and Solutions

### Issue 1: Webhook URL Not Configured

**Symptom**: Backend logs show:
```
⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured. Skipping webhook call.
```

**Solution**:

1. **Get Webhook URL from n8n**:
   - Open Workflow 1 in n8n
   - Click on "Judge Registration Webhook" node
   - Copy the webhook URL (e.g., `https://your-n8n-instance.com/webhook/alumni_judge_registered`)

2. **Add to backend `.env` file**:
   ```env
   N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
   ```

3. **Restart backend server**

4. **Test again** by registering a judge

---

### Issue 2: Workflow Not Activated in n8n

**Symptom**: Webhook URL is configured, but workflow doesn't execute

**Solution**:

1. **Open Workflow 1 in n8n**
2. **Check if workflow is activated**:
   - Look for toggle switch in top right (should be ON/green)
   - If OFF: Click to activate

3. **Verify webhook is active**:
   - Webhook node should show as "Active"
   - Should display the webhook URL

4. **Test by registering a judge again**

---

### Issue 3: Webhook URL Mismatch

**Symptom**: Backend logs show webhook call failed with 404 or connection error

**Solution**:

1. **Verify webhook URL in n8n**:
   - Copy the exact URL from n8n webhook node
   - Make sure there are no extra spaces or characters

2. **Verify webhook URL in backend `.env`**:
   - Should match exactly with n8n webhook URL
   - Check for typos or missing parts

3. **Common URL format**:
   ```
   https://your-n8n-instance.com/webhook/alumni_judge_registered
   ```
   or
   ```
   http://localhost:5678/webhook/alumni_judge_registered
   ```

4. **Update `.env` and restart backend**

---

### Issue 4: Network Connectivity Issues

**Symptom**: Backend cannot reach n8n instance

**Solution**:

1. **Test connectivity from backend server**:
   ```bash
   # Test if backend can reach n8n
   curl -X POST https://your-n8n-instance.com/webhook/alumni_judge_registered \
     -H "Content-Type: application/json" \
     -d '{"judgeId": "123", "eventId": "EVT-123"}'
   ```

2. **Check firewall/network settings**:
   - Ensure backend can make outbound HTTP/HTTPS requests
   - Check if n8n instance is accessible from backend server

3. **For local n8n**:
   - Use `http://localhost:5678` if n8n is on same machine
   - Use `http://n8n-server-ip:5678` if n8n is on different machine
   - Ensure n8n is listening on correct interface (0.0.0.0, not just 127.0.0.1)

---

### Issue 5: Webhook Call Errors

**Symptom**: Backend logs show specific error messages

**Check backend logs for error details:**

```
⚠️ Failed to call n8n webhook: Error: connect ECONNREFUSED
```
- **Solution**: n8n instance is not running or not accessible

```
⚠️ Failed to call n8n webhook: Error: Request failed with status code 404
```
- **Solution**: Webhook URL is incorrect or workflow path is wrong

```
⚠️ Failed to call n8n webhook: Error: timeout of 10000ms exceeded
```
- **Solution**: n8n instance is slow or unreachable (check n8n server)

---

## Step-by-Step Diagnostic Process

### Diagnostic Step 1: Check Backend Configuration

1. **Check `.env` file**:
   ```bash
   # Open .env file and verify
   cat .env | grep N8N_WEBHOOK
   ```

   Should see:
   ```env
   N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
   ```

2. **If missing**, add it and restart backend

### Diagnostic Step 2: Verify Webhook URL in n8n

1. **Open n8n** → Workflow 1
2. **Click "Judge Registration Webhook" node**
3. **Copy the Production URL** shown
4. **Compare with `.env` file** - they should match exactly

### Diagnostic Step 3: Check Workflow Activation

1. **In n8n**, look at Workflow 1
2. **Toggle in top right** should be ON (green)
3. **If OFF**, click to activate

### Diagnostic Step 4: Test Webhook Manually

**Option A: Test from Command Line**

```bash
curl -X POST https://your-n8n-instance.com/webhook/alumni_judge_registered \
  -H "Content-Type: application/json" \
  -d '{
    "judgeId": "123",
    "eventId": "EVT-1234567890-abc123"
  }'
```

**Option B: Test from Postman**

1. **Method**: POST
2. **URL**: Your n8n webhook URL
3. **Body** (JSON):
   ```json
   {
     "judgeId": "123",
     "eventId": "EVT-1234567890-abc123"
   }
   ```
4. **Send request**
5. **Check n8n Executions** - should see new execution

### Diagnostic Step 5: Check Backend Logs After Registration

1. **Register a judge** via API:
   ```bash
   curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
     -H "Content-Type: application/json" \
     -d '{"id": 123, "alumniEmail": "test@example.com", "alumniName": "Test"}'
   ```

2. **Watch backend console/logs** for:
   - ✅ Success message
   - ⚠️ Warning messages
   - ❌ Error messages

3. **Check what happened**:
   - If success → Check n8n executions
   - If warning → Follow solutions above
   - If error → Check error message details

---

## Quick Fix Checklist

If workflow is not executing, check these in order:

- [ ] **1. Is webhook URL in `.env` file?**
  - Check: `N8N_WEBHOOK_JUDGE_REGISTERED_URL=...`
  - Fix: Add URL if missing

- [ ] **2. Does webhook URL match n8n?**
  - Check: Compare `.env` URL with n8n webhook node URL
  - Fix: Update `.env` to match exactly

- [ ] **3. Is backend server restarted?**
  - Check: After updating `.env`, did you restart backend?
  - Fix: Restart backend server

- [ ] **4. Is workflow activated in n8n?**
  - Check: Toggle switch in n8n workflow should be ON
  - Fix: Activate workflow in n8n

- [ ] **5. Can backend reach n8n?**
  - Check: Test connectivity with curl
  - Fix: Check network/firewall settings

- [ ] **6. Are there errors in backend logs?**
  - Check: Look for error messages
  - Fix: Address specific errors shown

---

## Testing After Fix

After fixing any issues, test again:

1. **Register a test judge**:
   ```bash
   curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
     -H "Content-Type: application/json" \
     -d '{
       "id": 123,
       "alumniEmail": "test@example.com",
       "alumniName": "Test Judge"
     }'
   ```

2. **Check backend logs** - should see:
   ```
   ✅ N8N webhook called successfully for judge registration
   ```

3. **Check n8n Executions** - should see new execution with "Success" status

4. **Check email inboxes** - should receive emails

---

## Detailed Error Messages Reference

### Backend Log Messages

| Log Message | Meaning | Solution |
|-------------|---------|----------|
| `✅ N8N webhook called successfully` | Webhook worked! | Check n8n executions |
| `⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured` | URL missing | Add to `.env` |
| `⚠️ Failed to call n8n webhook: connect ECONNREFUSED` | Can't reach n8n | Check n8n is running |
| `⚠️ Failed to call n8n webhook: 404` | Wrong URL | Verify webhook URL |
| `⚠️ Failed to call n8n webhook: timeout` | n8n too slow | Check n8n server |

### n8n Execution Status

| Status | Meaning | Action |
|--------|---------|--------|
| Success (Green) | Workflow executed | Check emails |
| Error (Red) | Workflow failed | Check error details |
| Waiting | Waiting for trigger | Check webhook is active |
| No execution | Webhook not triggered | Check backend/webhook URL |

---

## Still Not Working?

If none of the above solutions work:

1. **Enable detailed logging**:
   - Check backend console for all log messages
   - Check n8n execution logs

2. **Test webhook manually**:
   - Use curl/Postman to call webhook directly
   - See if n8n receives the request

3. **Check n8n workflow**:
   - Verify all nodes are configured correctly
   - Check for errors in workflow execution

4. **Verify data format**:
   - Ensure `judgeId` and `eventId` are being sent correctly
   - Check webhook payload format matches expected

5. **Check network**:
   - Verify backend can make outbound HTTP requests
   - Check firewall rules

---

## Need More Help?

1. **Check backend logs** for specific error messages
2. **Check n8n execution logs** for workflow errors
3. **Review configuration**:
   - Backend `.env` file
   - n8n workflow settings
   - Webhook URLs

4. **Test each component separately**:
   - Backend registration endpoint
   - n8n webhook (manual test)
   - Email sending in n8n

---

## Quick Test Command

Run this to test the entire flow:

```bash
# 1. Test backend endpoint
curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
  -H "Content-Type: application/json" \
  -d '{"id": 123, "alumniEmail": "test@example.com", "alumniName": "Test"}'

# 2. Check backend logs for webhook call result

# 3. Check n8n executions tab

# 4. Check email inboxes
```

---

For detailed workflow setup, see: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`

