# N8N Workflow JSON Import Guide

This guide provides ready-to-import n8n workflow JSON files for all 4 event management workflows.

## Import Instructions

### Method 1: Import from File

1. **Open n8n** interface
2. **Click the menu** (three dots) in the top right
3. **Select "Import from File"**
4. **Choose the JSON file** from `workflows/` directory
5. **Click "Import"**

### Method 2: Import from Clipboard

1. **Open the JSON file** (e.g., `workflows/n8n-workflow-1-judge-registration.json`)
2. **Copy the entire JSON content**
3. **Open n8n** interface
4. **Click the menu** (three dots) in the top right
5. **Select "Import from Clipboard"**
6. **Paste the JSON**
7. **Click "Import"**

---

## Workflow Files

All workflow JSON files are located in the `workflows/` directory:

1. **`workflows/n8n-workflow-1-judge-registration.json`** - Judge Registration Email Flow
2. **`workflows/n8n-workflow-2-status-update.json`** - Admin Approval/Denial Email Flow
3. **`workflows/n8n-workflow-3-event-reminder.json`** - Event Reminder Email Flow (1 day before)
4. **`workflows/n8n-workflow-4-thank-you.json`** - Post-Event Thank You Email Flow

---

## Post-Import Configuration

After importing each workflow, you need to configure:

### 1. Set Node Configuration (Update Values)

In each workflow, find the **"Set Configuration"** node and update:

- `backendUrl`: Change `http://localhost:5000` to your actual backend URL
- `adminEmail`: Change `admin@example.com` to your admin email
- `adminPanelUrl`: Change `http://localhost:3000/admin` to your admin panel URL (optional)

### 2. Configure Email Credentials

Each workflow has email nodes that need SMTP credentials:

1. **Click on any Email node** (e.g., "Email Admin")
2. **Click "Create New Credential"** or select existing
3. **Configure your email provider**:
   - Gmail: Use App Password
   - SendGrid: Use API key
   - SMTP: Use server details

### 3. Update Webhook URLs

After importing workflows 1 and 2:

1. **Activate the workflow**
2. **Copy the webhook URL** shown in the webhook node
3. **Update your backend `.env`** with the webhook URL:
   ```env
   N8N_WEBHOOK_JUDGE_REGISTERED_URL=<webhook-url-from-workflow-1>
   N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=<webhook-url-from-workflow-2>
   ```

### 4. Configure Cron Schedules (Workflows 3 & 4)

For workflows 3 and 4, verify cron schedules:

- **Workflow 3 (Reminder)**: Should run at `0 0 * * *` (midnight daily)
- **Workflow 4 (Thank You)**: Should run at `59 23 * * *` (23:59 daily)

Adjust timezone as needed.

---

## Quick Configuration Checklist

After importing each workflow:

- [ ] Update `backendUrl` in Set Configuration node
- [ ] Update `adminEmail` in Set Configuration node
- [ ] Configure email credentials (SMTP/Gmail)
- [ ] Test workflow execution
- [ ] Activate workflow
- [ ] Copy webhook URLs (for workflows 1 & 2) and update backend `.env`

---

## Alternative: Manual Setup

If the JSON import doesn't work, you can build workflows manually following:
- **`docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`** - Detailed step-by-step instructions

---

## Troubleshooting Import

### Common Issues

1. **"Invalid JSON format"**
   - Ensure you copied the entire JSON file
   - Check for syntax errors in the JSON

2. **"Missing credentials"**
   - Configure email credentials after import
   - Set up SMTP/Gmail account in n8n

3. **"Webhook not working"**
   - Activate the workflow first
   - Copy the webhook URL from the webhook node
   - Update backend `.env` with the correct URL

4. **"Nodes not connecting"**
   - The JSON should include connections automatically
   - If missing, manually connect nodes following the workflow diagram

---

## Next Steps

1. Import all 4 workflows
2. Configure each workflow (Set Node values, email credentials)
3. Test each workflow
4. Update backend `.env` with webhook URLs
5. Activate all workflows

For detailed workflow setup, see: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`

