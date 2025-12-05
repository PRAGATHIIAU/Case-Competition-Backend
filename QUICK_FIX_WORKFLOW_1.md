# Quick Fix: Workflow 1 Not Executing

## 🔍 Problem

You registered a judge but Workflow 1 didn't execute. The diagnostic shows your webhook URL is still a **placeholder**.

## ✅ Solution (4 Steps)

### Step 1: Get Webhook URL from n8n

1. Open n8n → Workflow 1
2. Click "Judge Registration Webhook" node
3. Copy the Production URL shown
4. **Make sure workflow is activated** (toggle ON)

### Step 2: Update .env File

Open `.env` and replace:
```env
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
```

With your actual URL:
```env
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-actual-n8n-url.com/webhook/alumni_judge_registered
```

### Step 3: Restart Backend

```bash
# Stop server (Ctrl+C)
npm start
```

### Step 4: Verify Fix

Run diagnostic:
```bash
node scripts/diagnose-webhook-issue.js
```

Then test by registering a judge again.

## 📚 Full Guides

- **Testing Guide**: `docs/N8N_WORKFLOW_TESTING_GUIDE.md`
- **Troubleshooting**: `docs/N8N_WORKFLOW_TROUBLESHOOTING.md`
- **Quick Fix**: `docs/N8N_WEBHOOK_QUICK_FIX.md`

