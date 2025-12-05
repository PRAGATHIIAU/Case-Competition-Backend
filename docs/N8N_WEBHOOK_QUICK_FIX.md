# Quick Fix: Workflow 1 Not Executing

## Problem
You registered a judge but Workflow 1 didn't execute. This is usually because the webhook URL is not configured correctly.

## Quick Solution (3 Steps)

### Step 1: Get Webhook URL from n8n

1. **Open n8n** interface
2. **Open Workflow 1** (Judge Registration Email Flow)
3. **Click on the "Judge Registration Webhook" node**
4. **Copy the Production URL** shown (e.g., `https://your-instance.n8n.io/webhook/alumni_judge_registered`)

**Important**: Make sure the workflow is **activated** (toggle switch is ON/green)

### Step 2: Update Backend .env File

1. **Open your `.env` file** in the project root
2. **Find or add this line**:
   ```env
   N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-instance.n8n.io/webhook/alumni_judge_registered
   ```
3. **Replace the URL** with the one you copied from n8n

**Example**:
```env
# Before (placeholder - won't work)
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered

# After (actual URL - will work)
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://my-instance-123.n8n.io/webhook/alumni_judge_registered
```

### Step 3: Restart Backend Server

**Important**: After updating `.env`, you MUST restart your backend server:

```bash
# Stop the server (Ctrl+C if running)
# Then restart:
npm start

# Or if using nodemon:
npm run dev
```

### Step 4: Test Again

1. **Register a judge**:
   ```bash
   curl -X POST http://localhost:5000/api/events/YOUR_EVENT_ID/register \
     -H "Content-Type: application/json" \
     -d '{
       "id": 123,
       "alumniEmail": "test@example.com",
       "alumniName": "Test Judge"
     }'
   ```

2. **Check backend console** - should see:
   ```
   ✅ N8N webhook called successfully for judge registration
   ```

3. **Check n8n Executions tab** - should see new execution

4. **Check email inboxes** - should receive emails

---

## Common Issues

### Issue: "Webhook URL contains placeholder"

**Symptom**: Your `.env` has:
```env
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
```

**Fix**: Replace `https://your-n8n-instance.com` with your actual n8n URL

---

### Issue: "Workflow not activated"

**Symptom**: Webhook URL is correct but workflow still doesn't execute

**Fix**: 
1. Open Workflow 1 in n8n
2. Look for toggle switch in top right
3. Click to activate (should turn green/ON)
4. Webhook node should show as "Active"

---

### Issue: "Webhook URL doesn't match"

**Symptom**: Backend logs show connection errors

**Fix**:
1. Copy webhook URL from n8n webhook node
2. Compare character-by-character with `.env` file
3. Make sure they match exactly (no extra spaces, same protocol)

---

## Verification Checklist

After updating, verify:

- [ ] Webhook URL in `.env` matches n8n webhook URL exactly
- [ ] Backend server has been restarted
- [ ] Workflow is activated in n8n
- [ ] Webhook node shows as "Active" in n8n
- [ ] No placeholder values in webhook URL

---

## Test Command

After fixing, run this diagnostic:

```bash
node scripts/diagnose-webhook-issue.js
```

Then test webhook:

```bash
node scripts/test-n8n-webhook.js
```

---

## Still Not Working?

Check backend logs for these messages:

| Message | Meaning |
|---------|---------|
| `✅ N8N webhook called successfully` | Webhook worked! Check n8n |
| `⚠️ N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured` | Add URL to `.env` |
| `⚠️ Failed to call n8n webhook: connect ECONNREFUSED` | Can't reach n8n server |
| `⚠️ Failed to call n8n webhook: 404` | Wrong webhook URL |

See `docs/N8N_WORKFLOW_TROUBLESHOOTING.md` for detailed troubleshooting.

