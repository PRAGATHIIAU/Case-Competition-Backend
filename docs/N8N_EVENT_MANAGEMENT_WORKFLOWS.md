# N8N Workflow Automation for Event Management

This document provides complete setup instructions for n8n workflows to automate email notifications for Alumni/Judge event participation.

## Overview

The system uses n8n workflows to handle all email notifications, while the backend provides API endpoints for data retrieval. The backend calls n8n webhooks when specific events occur (judge registration, status updates).

## Architecture

- **Backend**: Provides API endpoints for n8n to fetch data and calls n8n webhooks
- **N8N**: Handles email sending, scheduling, and workflow automation
- **No direct database access from n8n**: All data is fetched via HTTP endpoints

## Prerequisites

- N8N instance running and accessible
- Backend API endpoints accessible from n8N
- Backend URL configured (e.g., `http://localhost:5000` or production URL)
- SMTP email provider configured in n8n (Gmail, SendGrid, etc.)
- Environment variables configured (see Configuration section)

## Configuration

### Backend Environment Variables

Add these to your backend `.env` file:

```env
# N8N Webhook URLs
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=https://your-n8n-instance.com/webhook/judge_status_update
```

### N8N Configuration (Alternative Approaches)

**Important**: N8N Cloud may not have direct access to environment variables. Use one of these approaches:

#### **Option 1: Use Set Node in Each Workflow (Recommended for N8N Cloud)**

Add a **Set Node** at the beginning of each workflow:
- `backendUrl` = `http://localhost:5000` (or your production URL)
- `adminEmail` = `admin@example.com`
- `adminPanelUrl` = `http://localhost:3000/admin` (optional)

Then reference as: `{{ $json.backendUrl }}`, `{{ $json.adminEmail }}`, etc.

#### **Option 2: Hardcode Values Directly (Simplest)**

Hardcode URLs and emails directly in workflow nodes:
- HTTP Request URLs: `http://localhost:5000/api/n8n/...`
- Email addresses: `admin@example.com`

#### **Option 3: Environment Variables (Self-Hosted Only)**

If you have self-hosted n8n:
- **Backend API URL**: `http://your-backend-url:5000` (or production URL)
- **SMTP Configuration**: Email provider settings (Gmail, SendGrid, etc.)
- **Admin Email**: Email address for admin notifications

Reference as: `{{ $env.BACKEND_URL }}`, `{{ $env.ADMIN_EMAIL }}`, etc.

**Note**: All examples in this document show Option A (hardcoded) and Option B (Set node) which work in N8N Cloud.

---

## 📥 Importable Workflow JSON Files

Ready-to-import workflow JSON files are available in the `workflows/` directory:

- **`workflows/n8n-workflow-1-judge-registration.json`** - Judge Registration Email Flow
- **`workflows/n8n-workflow-2-status-update.json`** - Admin Approval/Denial Email Flow  
- **`workflows/n8n-workflow-3-event-reminder.json`** - Event Reminder Email Flow
- **`workflows/n8n-workflow-4-thank-you.json`** - Post-Event Thank You Email Flow

**Quick Import**: See `docs/N8N_WORKFLOW_IMPORT_GUIDE.md` for import instructions.

---

## Workflow 1: Alumni/Judge Registration Email Flow

### Purpose

Sends email notifications when an alumni/judge registers for an event:
- Email to Admin: Notify that a judge is interested
- Email to Alumni/Judge: Confirm their registration interest

### Backend Trigger

Backend calls n8n webhook when judge registers:
- **Endpoint**: `POST /n8n/alumni_judge_registered` (n8n webhook URL)
- **Payload**: 
  ```json
  {
    "judgeId": "123",
    "eventId": "EVT-1234567890-abc123"
  }
  ```

### N8N Workflow Steps

#### Step 1: Webhook Trigger Node

1. **Add Webhook Node**
   - Name: "Judge Registration Webhook"
   - HTTP Method: `POST`
   - Path: `/alumni_judge_registered`
   - Response Mode: "Last Node"

**Expected Input:**
```json
{
  "judgeId": "123",
  "eventId": "EVT-1234567890-abc123"
}
```

#### Step 2: HTTP Request Node - Fetch Judge Details

1. **Add HTTP Request Node**
   - Name: "Get Judge Details"
   - Method: `GET`
   - URL: Use one of the following options:
     - **Option A (Hardcoded)**: `http://localhost:5000/api/n8n/judge/{{ $json.judgeId }}`
     - **Option B (Using Set Node)**: `{{ $json.backendUrl }}/api/n8n/judge/{{ $json.judgeId }}`
     - **Option C (Environment Variable - Self-hosted only)**: `{{ $env.BACKEND_URL }}/api/n8n/judge/{{ $json.judgeId }}`
   - Authentication: None (or add if needed)

**Note**: Replace `localhost:5000` with your actual backend URL (e.g., `https://your-backend.com` for production)

**Expected Response:**
```json
{
  "success": true,
  "message": "Judge details retrieved successfully",
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "contact": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "location": "New York, NY",
    "bio": "Experienced professional...",
    "skills": ["JavaScript", "Python"],
    "aspirations": "To mentor students..."
  }
}
```

#### Step 3: HTTP Request Node - Fetch Event Details

1. **Add HTTP Request Node**
   - Name: "Get Event Details"
   - Method: `GET`
   - URL: Use one of the following options:
     - **Option A (Hardcoded)**: `http://localhost:5000/api/n8n/event/{{ $json.eventId }}`
     - **Option B (Using Set Node)**: `{{ $json.backendUrl }}/api/n8n/event/{{ $json.eventId }}`
     - **Option C (Environment Variable - Self-hosted only)**: `{{ $env.BACKEND_URL }}/api/n8n/event/{{ $json.eventId }}`
   - Authentication: None

**Note**: Replace `localhost:5000` with your actual backend URL

**Expected Response:**
```json
{
  "success": true,
  "message": "Event details retrieved successfully",
  "data": {
    "eventId": "EVT-1234567890-abc123",
    "name": "Case Competition 2024",
    "description": "Annual business case competition",
    "date": "2024-04-15T09:00:00Z",
    "location": "Main Hall",
    "eventInfo": {...},
    "slots": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Step 4: Email Node - Notify Admin

1. **Add Email Node (Gmail/SMTP)**
   - Name: "Email Admin"
   - To: `{{ $env.ADMIN_EMAIL }}`
   - Subject: `New Judge Interest: {{ $json["Get Event Details"].data.name }}`
   - HTML Body: (see template below)

**Email Template - Admin Notification:**
```html
<html>
<body>
  <h2>New Judge Interest Notification</h2>
  <p>An alumni has expressed interest in participating as a judge for an event.</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event ID:</strong> {{ $json["Get Event Details"].data.eventId }}</li>
    <li><strong>Event Name:</strong> {{ $json["Get Event Details"].data.name }}</li>
    <li><strong>Event Date:</strong> {{ $json["Get Event Details"].data.date }}</li>
    <li><strong>Location:</strong> {{ $json["Get Event Details"].data.location || 'Not specified' }}</li>
  </ul>
  
  <h3>Alumni/Judge Details:</h3>
  <ul>
    <li><strong>Name:</strong> {{ $json["Get Judge Details"].data.name }}</li>
    <li><strong>Email:</strong> {{ $json["Get Judge Details"].data.email }}</li>
    <li><strong>Contact:</strong> {{ $json["Get Judge Details"].data.contact || 'Not provided' }}</li>
    <li><strong>Location:</strong> {{ $json["Get Judge Details"].data.location || 'Not provided' }}</li>
  </ul>
  
  <p>Please review and update the judge status in the admin panel.</p>
  
  <p><a href="{{ $env.ADMIN_PANEL_URL }}/events/{{ $json.eventId }}/judges">View Event Judges</a></p>
</body>
</html>
```

#### Step 5: Email Node - Confirm Registration to Judge

1. **Add Email Node (Gmail/SMTP)**
   - Name: "Email Judge Confirmation"
   - To: `{{ $json["Get Judge Details"].data.email }}`
   - Subject: `Registration Confirmed: {{ $json["Get Event Details"].data.name }}`
   - HTML Body: (see template below)

**Email Template - Judge Confirmation:**
```html
<html>
<body>
  <h2>Registration Confirmed</h2>
  
  <p>Dear {{ $json["Get Judge Details"].data.name }},</p>
  
  <p>Thank you for your interest in judging <strong>{{ $json["Get Event Details"].data.name }}</strong>.</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event Name:</strong> {{ $json["Get Event Details"].data.name }}</li>
    <li><strong>Date:</strong> {{ $json["Get Event Details"].data.date }}</li>
    <li><strong>Location:</strong> {{ $json["Get Event Details"].data.location || 'To be announced' }}</li>
  </ul>
  
  <p>Your registration has been received and is being reviewed by our team. You will receive a confirmation email once your participation is approved.</p>
  
  <p>If you have any questions, please contact us at {{ $env.ADMIN_EMAIL }}.</p>
  
  <p>Best regards,<br>Event Management Team</p>
</body>
</html>
```

### Workflow Diagram

```
[Webhook: POST /alumni_judge_registered]
    ↓
[HTTP: GET /api/n8n/judge/:judgeId]
    ↓
[HTTP: GET /api/n8n/event/:eventId]
    ↓
[Split: Two parallel email paths]
    ├─→ [Email: Notify Admin]
    └─→ [Email: Confirm Registration to Judge]
```

---

## Workflow 2: Admin Approval/Denial Email Flow

### Purpose

Sends email to alumni/judge when admin approves or denies their participation.

### Backend Trigger

Backend calls n8n webhook when admin updates judge status:
- **Endpoint**: `POST /n8n/judge_status_update` (n8n webhook URL)
- **Payload**: 
  ```json
  {
    "judgeId": "123",
    "eventId": "EVT-1234567890-abc123",
    "status": "approved"  // or "denied"
  }
  ```

### N8N Workflow Steps

#### Step 1: Webhook Trigger Node

1. **Add Webhook Node**
   - Name: "Judge Status Update Webhook"
   - HTTP Method: `POST`
   - Path: `/judge_status_update`
   - Response Mode: "Last Node"

**Expected Input:**
```json
{
  "judgeId": "123",
  "eventId": "EVT-1234567890-abc123",
  "status": "approved"
}
```

#### Step 2: IF Node - Check Status

1. **Add IF Node**
   - Condition: `{{ $json.status }}` equals `"approved"`
   - If true → Go to Step 3a (Approval Email)
   - If false → Go to Step 3b (Denial Email)

#### Step 3a: HTTP Request Node - Fetch Judge & Event Details (Approved)

1. **Add HTTP Request Node**
   - Name: "Get Judge Details (Approved)"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/judge/{{ $json.judgeId }}`

2. **Add HTTP Request Node**
   - Name: "Get Event Details (Approved)"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/event/{{ $json.eventId }}`

#### Step 3b: HTTP Request Node - Fetch Judge & Event Details (Denied)

1. **Add HTTP Request Node**
   - Name: "Get Judge Details (Denied)"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/judge/{{ $json.judgeId }}`

2. **Add HTTP Request Node**
   - Name: "Get Event Details (Denied)"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/event/{{ $json.eventId }}`

#### Step 4a: Email Node - Approval Email

1. **Add Email Node**
   - Name: "Send Approval Email"
   - To: `{{ $json["Get Judge Details (Approved)"].data.email }}`
   - Subject: `Approved: Judge for {{ $json["Get Event Details (Approved)"].data.name }}`
   - HTML Body: (see template below)

**Email Template - Approval:**
```html
<html>
<body>
  <h2>Congratulations! Your Application Has Been Approved</h2>
  
  <p>Dear {{ $json["Get Judge Details (Approved)"].data.name }},</p>
  
  <p>We are pleased to inform you that your application to judge <strong>{{ $json["Get Event Details (Approved)"].data.name }}</strong> has been approved!</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event Name:</strong> {{ $json["Get Event Details (Approved)"].data.name }}</li>
    <li><strong>Date:</strong> {{ $json["Get Event Details (Approved)"].data.date }}</li>
    <li><strong>Location:</strong> {{ $json["Get Event Details (Approved)"].data.location || 'To be announced' }}</li>
  </ul>
  
  <p>You will receive additional details and instructions closer to the event date.</p>
  
  <p>If you have any questions, please contact us at {{ $env.ADMIN_EMAIL }}.</p>
  
  <p>Thank you for your participation!</p>
  
  <p>Best regards,<br>Event Management Team</p>
</body>
</html>
```

#### Step 4b: Email Node - Denial Email

1. **Add Email Node**
   - Name: "Send Denial Email"
   - To: `{{ $json["Get Judge Details (Denied)"].data.email }}`
   - Subject: `Update: Judge Application for {{ $json["Get Event Details (Denied)"].data.name }}`
   - HTML Body: (see template below)

**Email Template - Denial:**
```html
<html>
<body>
  <h2>Update on Your Judge Application</h2>
  
  <p>Dear {{ $json["Get Judge Details (Denied)"].data.name }},</p>
  
  <p>Thank you for your interest in judging <strong>{{ $json["Get Event Details (Denied)"].data.name }}</strong>.</p>
  
  <p>Unfortunately, we are unable to accommodate your application at this time due to capacity constraints. We appreciate your willingness to contribute and hope you will consider applying for future events.</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event Name:</strong> {{ $json["Get Event Details (Denied)"].data.name }}</li>
    <li><strong>Date:</strong> {{ $json["Get Event Details (Denied)"].data.date }}</li>
  </ul>
  
  <p>If you have any questions, please contact us at {{ $env.ADMIN_EMAIL }}.</p>
  
  <p>Best regards,<br>Event Management Team</p>
</body>
</html>
```

### Workflow Diagram

```
[Webhook: POST /judge_status_update]
    ↓
[IF: status === "approved"?]
    ├─→ YES → [HTTP: Get Judge Details]
    │           ↓
    │        [HTTP: Get Event Details]
    │           ↓
    │        [Email: Send Approval Email]
    │
    └─→ NO → [HTTP: Get Judge Details]
                ↓
             [HTTP: Get Event Details]
                ↓
             [Email: Send Denial Email]
```

---

## Workflow 3: Event Reminder Email Flow (1 Day Before)

### Purpose

Sends reminder emails to all approved judges 1 day before the event.

### Trigger

Cron schedule runs daily at midnight (00:00).

### N8N Workflow Steps

#### Step 1: Cron Node

1. **Add Cron Node**
   - Name: "Daily Reminder Check"
   - Cron Expression: `0 0 * * *` (runs every day at 00:00)
   - Timezone: Set to your server timezone

#### Step 2: HTTP Request Node - Get Events Happening Tomorrow

1. **Add HTTP Request Node**
   - Name: "Get Events Tomorrow"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/events/upcoming/tomorrow`
   - Authentication: None

**Expected Response:**
```json
{
  "success": true,
  "message": "Events happening tomorrow retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "name": "Case Competition 2024",
      "description": "Annual business case competition",
      "date": "2024-04-15T09:00:00Z",
      "location": "Main Hall",
      "slots": [
        {
          "slotNumber": 1,
          "startTime": "2024-04-15T09:00:00Z",
          "endTime": "2024-04-15T11:00:00Z",
          "location": "Room A"
        }
      ],
      "approvedJudges": [
        {
          "judgeId": "123",
          "status": "approved",
          "id": 123,
          "name": "John Doe",
          "email": "john.doe@example.com",
          ...
        }
      ]
    }
  ],
  "count": 1
}
```

#### Step 3: Split in Batches Node

1. **Add Split in Batches Node**
   - Name: "Split Events"
   - Batch Size: `1` (process one event at a time)
   - Field to Split Out: `{{ $json.data }}`

#### Step 4: Split in Batches Node - Split Judges

1. **Add Split in Batches Node**
   - Name: "Split Judges"
   - Batch Size: `1` (process one judge at a time)
   - Field to Split Out: `{{ $json.approvedJudges }}`

#### Step 5: Email Node - Send Reminder

1. **Add Email Node**
   - Name: "Send Reminder Email"
   - To: `{{ $json.email }}`
   - Subject: `Reminder: Judge for {{ $json["Split Events"].name }} Tomorrow`
   - HTML Body: (see template below)

**Email Template - Reminder:**
```html
<html>
<body>
  <h2>Event Reminder - Tomorrow!</h2>
  
  <p>Dear {{ $json.name }},</p>
  
  <p>This is a friendly reminder that you are scheduled to judge <strong>{{ $json["Split Events"].name }}</strong> tomorrow.</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event Name:</strong> {{ $json["Split Events"].name }}</li>
    <li><strong>Date:</strong> {{ $json["Split Events"].date }}</li>
    <li><strong>Location:</strong> {{ $json["Split Events"].location || 'To be announced' }}</li>
  </ul>
  
  {{#if $json["Split Events"].slots}}
  <h3>Event Schedule:</h3>
  <ul>
    {{#each $json["Split Events"].slots}}
    <li>
      <strong>Slot {{ this.slotNumber }}:</strong> 
      {{ this.startTime }} - {{ this.endTime }} 
      ({{ this.location }})
    </li>
    {{/each}}
  </ul>
  {{/if}}
  
  <p>We look forward to your participation!</p>
  
  <p>If you have any questions or need to make changes, please contact us at {{ $env.ADMIN_EMAIL }}.</p>
  
  <p>Best regards,<br>Event Management Team</p>
</body>
</html>
```

### Workflow Diagram

```
[Cron: Daily at 00:00]
    ↓
[HTTP: GET /api/n8n/events/upcoming/tomorrow]
    ↓
[Split in Batches: Events]
    ↓
[Split in Batches: Judges per Event]
    ↓
[Email: Send Reminder to Each Judge]
```

---

## Workflow 4: Post-Event Thank You Email Flow

### Purpose

Sends thank you emails to all approved judges after an event ends.

### Trigger

Cron schedule runs daily at 23:59.

### N8N Workflow Steps

#### Step 1: Cron Node

1. **Add Cron Node**
   - Name: "Daily Thank You Check"
   - Cron Expression: `59 23 * * *` (runs every day at 23:59)
   - Timezone: Set to your server timezone

#### Step 2: HTTP Request Node - Get Events Ended Today

1. **Add HTTP Request Node**
   - Name: "Get Events Ended Today"
   - Method: `GET`
   - URL: `{{ $env.BACKEND_URL }}/api/n8n/events/ended/today`
   - Authentication: None

**Expected Response:**
```json
{
  "success": true,
  "message": "Events that ended today retrieved successfully",
  "data": [
    {
      "eventId": "EVT-1234567890-abc123",
      "name": "Case Competition 2024",
      "description": "Annual business case competition",
      "date": "2024-04-15T09:00:00Z",
      "location": "Main Hall",
      "approvedJudges": [
        {
          "judgeId": "123",
          "status": "approved",
          "id": 123,
          "name": "John Doe",
          "email": "john.doe@example.com",
          ...
        }
      ]
    }
  ],
  "count": 1
}
```

#### Step 3: Split in Batches Node

1. **Add Split in Batches Node**
   - Name: "Split Events"
   - Batch Size: `1` (process one event at a time)
   - Field to Split Out: `{{ $json.data }}`

#### Step 4: Split in Batches Node - Split Judges

1. **Add Split in Batches Node**
   - Name: "Split Judges"
   - Batch Size: `1` (process one judge at a time)
   - Field to Split Out: `{{ $json.approvedJudges }}`

#### Step 5: Email Node - Send Thank You

1. **Add Email Node**
   - Name: "Send Thank You Email"
   - To: `{{ $json.email }}`
   - Subject: `Thank You for Judging {{ $json["Split Events"].name }}`
   - HTML Body: (see template below)

**Email Template - Thank You:**
```html
<html>
<body>
  <h2>Thank You for Your Participation!</h2>
  
  <p>Dear {{ $json.name }},</p>
  
  <p>We would like to extend our sincere gratitude for your participation as a judge for <strong>{{ $json["Split Events"].name }}</strong>.</p>
  
  <h3>Event Details:</h3>
  <ul>
    <li><strong>Event Name:</strong> {{ $json["Split Events"].name }}</li>
    <li><strong>Date:</strong> {{ $json["Split Events"].date }}</li>
    <li><strong>Location:</strong> {{ $json["Split Events"].location || 'N/A' }}</li>
  </ul>
  
  <p>Your expertise and time contributed significantly to the success of this event. We truly appreciate your dedication and professionalism.</p>
  
  <p>We hope to work with you again in future events. If you have any feedback or suggestions, please feel free to reach out to us at {{ $env.ADMIN_EMAIL }}.</p>
  
  <p>Thank you once again for making this event a success!</p>
  
  <p>Best regards,<br>Event Management Team</p>
</body>
</html>
```

### Workflow Diagram

```
[Cron: Daily at 23:59]
    ↓
[HTTP: GET /api/n8n/events/ended/today]
    ↓
[Split in Batches: Events]
    ↓
[Split in Batches: Judges per Event]
    ↓
[Email: Send Thank You to Each Judge]
```

---

## API Endpoints Reference

All endpoints are available at: `{{ $env.BACKEND_URL }}/api/n8n/...`

### 1. Get Judge Details
- **Endpoint**: `GET /api/n8n/judge/:judgeId`
- **Response**: Judge details with profile information

### 2. Get Event Details
- **Endpoint**: `GET /api/n8n/event/:eventId`
- **Response**: Event details with slots and metadata

### 3. Get Approved Judges for Event
- **Endpoint**: `GET /api/n8n/event/:eventId/judges/approved`
- **Response**: Array of approved judge details

### 4. Get Events Happening Tomorrow
- **Endpoint**: `GET /api/n8n/events/upcoming/tomorrow`
- **Response**: Array of events with approved judges

### 5. Get Events Ended Today
- **Endpoint**: `GET /api/n8n/events/ended/today`
- **Response**: Array of events with approved judges

---

## Backend Webhook Integration

### Judge Registration Webhook

The backend calls this webhook when a judge registers:

```javascript
// Backend automatically calls this when judge registers
POST {{ N8N_WEBHOOK_JUDGE_REGISTERED_URL }}
{
  "judgeId": "123",
  "eventId": "EVT-1234567890-abc123"
}
```

### Judge Status Update Webhook

The backend calls this webhook when admin updates judge status:

```javascript
// Backend automatically calls this when admin updates status
POST {{ N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL }}
{
  "judgeId": "123",
  "eventId": "EVT-1234567890-abc123",
  "status": "approved"  // or "denied"
}
```

---

## Error Handling

### Add Error Handling Nodes

1. **Add Error Trigger Node** after each HTTP request
2. **Add Notification Node** (Email/Slack) to alert on errors
3. **Add Logging Node** to log errors for debugging
4. **Add Retry Logic** for transient failures

### Common Error Scenarios

1. **Backend API Unavailable**
   - Retry with exponential backoff
   - Alert admin via email/Slack

2. **Judge/Event Not Found**
   - Log warning
   - Skip email for that judge/event

3. **Email Sending Failure**
   - Retry email sending
   - Log failed emails for manual follow-up

---

## Testing

### Manual Testing

1. **Test Judge Registration Webhook:**
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/alumni_judge_registered \
     -H "Content-Type: application/json" \
     -d '{
       "judgeId": "123",
       "eventId": "EVT-1234567890-abc123"
     }'
   ```

2. **Test Judge Status Update Webhook:**
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/judge_status_update \
     -H "Content-Type: application/json" \
     -d '{
       "judgeId": "123",
       "eventId": "EVT-1234567890-abc123",
       "status": "approved"
     }'
   ```

3. **Test API Endpoints:**
   ```bash
   # Get judge details
   curl http://localhost:5000/api/n8n/judge/123
   
   # Get event details
   curl http://localhost:5000/api/n8n/event/EVT-1234567890-abc123
   
   # Get events tomorrow
   curl http://localhost:5000/api/n8n/events/upcoming/tomorrow
   
   # Get events ended today
   curl http://localhost:5000/api/n8n/events/ended/today
   ```

---

## Production Checklist

- [ ] All workflows configured in n8n
- [ ] Webhook URLs configured in backend `.env`
- [ ] SMTP email provider configured in n8n
- [ ] Cron schedules verified (timezone correct)
- [ ] Error handling nodes added
- [ ] Email templates customized
- [ ] Admin email addresses configured
- [ ] All workflows tested manually
- [ ] Monitoring and alerting set up
- [ ] Documentation updated
- [ ] Team trained on workflow management

---

## Troubleshooting

### Common Issues

1. **Webhook Not Triggered**
   - Verify webhook URL is correct in backend `.env`
   - Check backend logs for webhook call attempts
   - Verify n8n webhook is active

2. **API Endpoints Return 404**
   - Verify backend URL is correct
   - Check backend server is running
   - Verify endpoint paths match documentation

3. **Emails Not Sending**
   - Verify SMTP configuration in n8n
   - Check email provider rate limits
   - Verify email addresses are valid

4. **Date Logic Issues**
   - Verify server timezone matches cron timezone
   - Check event dates are in correct format (ISO 8601)
   - Verify date comparison logic in backend

---

## Security Considerations

1. **Webhook Security**
   - Consider adding webhook authentication tokens
   - Use HTTPS for webhook URLs in production

2. **API Security**
   - Consider adding API key authentication for n8n endpoints
   - Use HTTPS in production

3. **Email Security**
   - Verify email addresses before sending
   - Don't expose sensitive information in emails
   - Use BCC for batch emails when appropriate

---

## Maintenance

### Regular Tasks

1. **Monitor Workflow Execution**
   - Check n8n execution logs daily
   - Review failed executions
   - Update email templates as needed

2. **Update Event Dates**
   - Ensure events have correct dates
   - Verify timezone handling

3. **Test Workflows**
   - Test workflows after backend updates
   - Verify email templates render correctly
   - Check API endpoints after changes

---

## Support

For issues or questions:
- Check backend logs: `logs/` directory
- Check n8n execution logs in n8n interface
- Review this documentation
- Contact backend development team

