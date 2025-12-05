# N8N Workflow JSON Files

This directory contains ready-to-import n8n workflow JSON files for event management automation.

## Available Workflows

1. **`n8n-workflow-1-judge-registration.json`**
   - Trigger: Webhook when judge registers
   - Actions: Send emails to admin and judge

2. **`n8n-workflow-2-status-update.json`**
   - Trigger: Webhook when admin updates judge status
   - Actions: Send approval or denial email to judge

3. **`n8n-workflow-3-event-reminder.json`**
   - Trigger: Cron (daily at 00:00)
   - Actions: Send reminder emails to judges for events tomorrow

4. **`n8n-workflow-4-thank-you.json`**
   - Trigger: Cron (daily at 23:59)
   - Actions: Send thank you emails to judges for events that ended today

## Import Instructions

### Option 1: Import from File

1. Open n8n interface
2. Click menu (three dots) → "Import from File"
3. Select the JSON file from this directory
4. Click "Import"

### Option 2: Import from Clipboard

1. Open any JSON file
2. Copy entire content
3. In n8n: Menu → "Import from Clipboard"
4. Paste and click "Import"

## Post-Import Configuration

### Required Updates

1. **Set Configuration Node** - Update in each workflow:
   - `backendUrl`: Your backend URL (default: `http://localhost:5000`)
   - `adminEmail`: Your admin email (default: `admin@example.com`)
   - `adminPanelUrl`: Your admin panel URL (optional)

2. **Email Credentials** - Configure SMTP/Gmail:
   - Click any Email node
   - Create new credential or select existing
   - Configure email provider settings

3. **Webhook URLs** - After importing workflows 1 & 2:
   - Activate workflow
   - Copy webhook URL from webhook node
   - Update backend `.env` file

### Workflow-Specific Notes

#### Workflow 1 & 2: Update Backend URLs
- These use Set Node with `backendUrl` variable
- Update `backendUrl` value in Set Configuration node

#### Workflow 3 & 4: Verify Cron Schedules
- Workflow 3: Runs at `0 0 * * *` (midnight)
- Workflow 4: Runs at `59 23 * * *` (23:59)
- Adjust timezone in Cron node if needed

## Testing

After importing and configuring:

1. **Test Workflow 1**: Register a judge via backend API
2. **Test Workflow 2**: Update judge status via backend API
3. **Test Workflow 3**: Manually trigger to test reminder emails
4. **Test Workflow 4**: Manually trigger to test thank you emails

## Documentation

- **Import Guide**: `docs/N8N_WORKFLOW_IMPORT_GUIDE.md`
- **Setup Sequence**: `docs/N8N_SETUP_SEQUENCE.md`
- **Detailed Instructions**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- **N8N Cloud Alternatives**: `docs/N8N_CLOUD_ALTERNATIVES.md`

## Notes

- All workflows use **Set Node** for configuration (works in N8N Cloud)
- Email templates are included in the JSON
- You can modify email templates after import
- Backend URLs use placeholder values - update them!

