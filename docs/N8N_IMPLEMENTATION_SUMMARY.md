# N8N Event Management Workflow Implementation Summary

## Overview

This document summarizes the implementation of n8n-based workflow automation for event management email notifications. The system automates all email notifications for Alumni/Judge event participation.

## Architecture

- **Backend**: Provides API endpoints for n8n to fetch data and calls n8n webhooks on events
- **N8N**: Handles email sending, scheduling (cron), and workflow automation
- **No Direct Database Access**: n8n uses HTTP endpoints to fetch all data

## What Was Implemented

### 1. Backend API Endpoints for N8N

Created new endpoints under `/api/n8n/` for n8n workflows to fetch data:

- `GET /api/n8n/judge/:judgeId` - Get judge/alumni details
- `GET /api/n8n/event/:eventId` - Get event details
- `GET /api/n8n/event/:eventId/judges/approved` - Get approved judges for an event
- `GET /api/n8n/events/upcoming/tomorrow` - Get events happening tomorrow (with approved judges)
- `GET /api/n8n/events/ended/today` - Get events that ended today (with approved judges)

### 2. Webhook Integration

Updated backend to call n8n webhooks:

- **Judge Registration**: Calls `N8N_WEBHOOK_JUDGE_REGISTERED_URL` when judge registers
- **Judge Status Update**: Calls `N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL` when admin approves/denies

### 3. Admin Endpoint

Created new admin endpoint for updating judge status:

- `PUT /api/events/:eventId/judges/:judgeId/status` - Update judge status (approved/denied)
  - Requires admin authentication
  - Automatically calls n8n webhook after status update

### 4. Updated Judge Registration

Modified existing judge registration endpoint to:
- Call n8n webhook instead of sending email directly
- Maintain backward compatibility if webhook URL is not configured

## Files Created/Modified

### New Files

1. **`services/n8n.service.js`** - Service layer for n8n data fetching and webhook calls
2. **`controllers/n8n.controller.js`** - Controller for n8n API endpoints
3. **`routes/n8n.routes.js`** - Routes for n8n endpoints
4. **`docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`** - Complete workflow documentation

### Modified Files

1. **`services/event.service.js`**
   - Added `updateJudgeStatus()` method
   - Updated `registerAlumniAsJudge()` to call n8n webhook

2. **`controllers/event.controller.js`**
   - Added `updateJudgeStatus()` controller method

3. **`routes/event.routes.js`**
   - Added route for updating judge status

4. **`routes/index.js`**
   - Added n8n routes registration

5. **`config/aws.js`**
   - Added n8n webhook URL environment variables

## Environment Variables

Add these to your `.env` file:

```env
# N8N Webhook URLs
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=https://your-n8n-instance.com/webhook/judge_status_update
```

## Four N8N Workflows

### Workflow 1: Alumni/Judge Registration Email Flow
- **Trigger**: Backend webhook when judge registers
- **Actions**: Send email to admin and judge
- **Webhook Path**: `/alumni_judge_registered`

### Workflow 2: Admin Approval/Denial Email Flow
- **Trigger**: Backend webhook when admin updates judge status
- **Actions**: Send approval or denial email to judge
- **Webhook Path**: `/judge_status_update`

### Workflow 3: Event Reminder Email Flow
- **Trigger**: Cron schedule (daily at 00:00)
- **Actions**: Send reminder emails to approved judges for events happening tomorrow

### Workflow 4: Post-Event Thank You Email Flow
- **Trigger**: Cron schedule (daily at 23:59)
- **Actions**: Send thank you emails to approved judges for events that ended today

## Quick Start

1. **Configure Environment Variables**
   - Add n8n webhook URLs to `.env`

2. **Set Up N8N Workflows**
   - Follow instructions in `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
   - Create all 4 workflows
   - Configure SMTP email provider

3. **Test Workflows**
   - Register a judge → Should trigger workflow 1
   - Update judge status → Should trigger workflow 2
   - Verify cron workflows run at scheduled times

## API Endpoint Examples

### Get Judge Details
```bash
GET /api/n8n/judge/123
```

### Get Event Details
```bash
GET /api/n8n/event/EVT-1234567890-abc123
```

### Update Judge Status (Admin Only)
```bash
PUT /api/events/:eventId/judges/:judgeId/status
Authorization: Bearer <admin_token>
{
  "status": "approved"  // or "denied"
}
```

## Documentation

Complete workflow setup instructions:
- **`docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`** - Detailed workflow setup with all steps, email templates, and troubleshooting

## Benefits

1. **Separation of Concerns**: Backend handles data, n8n handles email automation
2. **No Database Access from N8N**: All data fetched via secure API endpoints
3. **Flexible Email Templates**: Easy to modify in n8n without code changes
4. **Automated Scheduling**: Cron jobs handle reminders and thank you emails
5. **Error Handling**: Built-in retry and notification capabilities in n8n

## Next Steps

1. Set up n8n instance (if not already done)
2. Create all 4 workflows following the documentation
3. Configure webhook URLs in backend `.env`
4. Test each workflow end-to-end
5. Monitor workflow executions in n8n

For detailed instructions, see: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`

