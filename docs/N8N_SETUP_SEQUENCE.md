# N8N Event Management Workflow - Setup Sequence Guide

This document provides a step-by-step sequence to set up and implement the n8n event management workflows. Follow these steps in order for a complete implementation.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Backend server running and accessible
- [ ] PostgreSQL database set up and connected
- [ ] DynamoDB tables created (Events, alumni_profiles)
- [ ] Basic backend functionality tested
- [ ] N8N instance installed and running (or access to cloud n8n)

---

## Phase 1: Understanding the System

### Step 1: Read Overview Documentation

**File**: `docs/N8N_IMPLEMENTATION_SUMMARY.md`

**Purpose**: Get a high-level understanding of what was implemented

**What to Learn**:
- Architecture overview (Backend ↔ N8N integration)
- List of 4 workflows
- API endpoints created
- Webhook integration points

**Time**: 5-10 minutes

**Action Items**:
- [ ] Understand the 4 workflows
- [ ] Note the API endpoints available
- [ ] Understand webhook flow

---

### Step 2: Review Main README (If Needed)

**File**: `README.md`

**Purpose**: Ensure basic backend setup is complete

**What to Check**:
- Backend server configuration
- Database setup
- Environment variables
- API Gateway setup (if using AWS)

**Time**: 10-15 minutes (if not already done)

**Action Items**:
- [ ] Verify backend is running
- [ ] Test basic API endpoints
- [ ] Confirm database connectivity

---

## Phase 2: Backend Configuration

### Step 3: Configure Environment Variables

**File**: `.env` (in project root)

**Purpose**: Add n8n webhook URLs to backend configuration

**What to Add**:
```env
# N8N Webhook URLs (add these to your .env file)
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered
N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=https://your-n8n-instance.com/webhook/judge_status_update
```

**Time**: 2-3 minutes

**Action Items**:
- [ ] Add `N8N_WEBHOOK_JUDGE_REGISTERED_URL` to `.env`
- [ ] Add `N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL` to `.env`
- [ ] Keep these as placeholder URLs for now (you'll update after setting up n8n)
- [ ] Restart backend server if it's running

**Note**: You'll update these URLs after creating the n8n webhooks.

---

### Step 4: Verify API Endpoints Are Working

**Purpose**: Test that the new n8n API endpoints are accessible

**Test Commands**:

1. **Test Judge Details Endpoint** (use a valid judge/user ID):
   ```bash
   curl http://localhost:5000/api/n8n/judge/1
   ```

2. **Test Event Details Endpoint** (use a valid event ID):
   ```bash
   curl http://localhost:5000/api/n8n/event/EVT-1234567890-abc123
   ```

3. **Test Events Tomorrow Endpoint**:
   ```bash
   curl http://localhost:5000/api/n8n/events/upcoming/tomorrow
   ```

4. **Test Events Ended Today Endpoint**:
   ```bash
   curl http://localhost:5000/api/n8n/events/ended/today
   ```

**Time**: 5-10 minutes

**Action Items**:
- [ ] Test all 5 API endpoints
- [ ] Verify responses are in expected JSON format
- [ ] Check backend logs for any errors
- [ ] Fix any issues before proceeding

**Expected Results**:
- All endpoints should return JSON with `success: true`
- Endpoints should handle missing data gracefully (return empty arrays or 404)

---

## Phase 3: N8N Setup

### Step 5: Install/Configure N8N

**Resources**:
- N8N Documentation: https://docs.n8n.io/
- N8N Installation Guide: https://docs.n8n.io/hosting/

**Purpose**: Set up n8n instance (if not already done)

**Options**:
1. **N8N Cloud** (easiest): Sign up at https://n8n.io/
2. **Self-Hosted**: Install via Docker, npm, or npm global

**Time**: 15-30 minutes

**Action Items**:
- [ ] Choose installation method (cloud or self-hosted)
- [ ] Complete n8n installation
- [ ] Access n8n web interface
- [ ] Create n8n account/login
- [ ] Note your n8n instance URL

**Important**: Note your n8n base URL (e.g., `https://your-instance.n8n.io` or `http://localhost:5678`)

---

### Step 6: Configure Email Provider in N8N

**Purpose**: Set up email sending capability in n8n

**Options**:
1. **Gmail** (recommended for testing)
2. **SendGrid**
3. **SMTP** (custom SMTP server)

**Time**: 10-15 minutes

**Action Items**:
- [ ] Choose email provider
- [ ] Configure credentials in n8n
- [ ] Test sending a test email
- [ ] Note the email address for admin notifications
- [ ] Save email credentials securely

**For Gmail**:
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in n8n Gmail node

**For SMTP**:
1. Get SMTP server details (host, port, username, password)
2. Configure in n8n SMTP node

---

### Step 7: Configure Variables for Workflows

**Purpose**: Set up backend URL and admin email for use in workflows

**Note**: N8N Cloud may not have direct access to environment variables. Use one of the alternative approaches below:

**📖 Quick Reference**: See `docs/N8N_CLOUD_ALTERNATIVES.md` for detailed replacement guide.

---

#### **Option 1: Use Workflow Variables (Recommended for N8N Cloud)**

Create a **Set Node** at the beginning of each workflow to store variables:

1. **Add Set Node** as the first node (after webhook/cron trigger)
2. **Configure Set Node**:
   - Mode: "Manual"
   - Add fields:
     - `backendUrl` = `http://localhost:5000` (or your production URL)
     - `adminEmail` = `admin@example.com`
     - `adminPanelUrl` = `http://localhost:3000/admin` (optional)

3. **Use in other nodes**: Reference as `{{ $json.backendUrl }}`, `{{ $json.adminEmail }}`, etc.

**Advantages**: Works in N8N Cloud, easy to update per workflow

**Time**: 5 minutes per workflow

---

#### **Option 2: Hardcode Directly in Nodes (Simplest)**

Hardcode values directly in HTTP Request and Email nodes:

1. **In HTTP Request nodes**: Use full URL like `http://localhost:5000/api/n8n/judge/...`
2. **In Email nodes**: Use email address directly like `admin@example.com`

**Example HTTP Request URL**:
```
http://localhost:5000/api/n8n/judge/{{ $json.judgeId }}
```

**Example Email To field**:
```
admin@example.com
```

**Advantages**: Works everywhere, no setup needed

**Disadvantages**: Need to update in multiple places if URL changes

**Time**: 0 minutes (just use direct values)

---

#### **Option 3: Use Code Node to Store Variables**

Add a **Code Node** at the start of workflows to define variables:

1. **Add Code Node** after trigger
2. **Configure Code** (JavaScript):
```javascript
const config = {
  backendUrl: 'http://localhost:5000',
  adminEmail: 'admin@example.com',
  adminPanelUrl: 'http://localhost:3000/admin'
};

return items.map(item => ({
  json: {
    ...item.json,
    ...config
  }
}));
```

3. **Use in other nodes**: Reference as `{{ $json.backendUrl }}`, etc.

**Time**: 5 minutes per workflow

---

#### **Option 4: Use Workflow Settings (N8N Self-Hosted)**

If you have self-hosted n8n with environment variable access:

1. **Go to**: Settings → Environment Variables (or your instance's settings)
2. **Add variables**:
   - `BACKEND_URL=http://localhost:5000`
   - `ADMIN_EMAIL=admin@example.com`
   - `ADMIN_PANEL_URL=http://localhost:3000/admin`

3. **Use in nodes**: Reference as `{{ $env.BACKEND_URL }}`, `{{ $env.ADMIN_EMAIL }}`, etc.

**Note**: This option only works if your n8n instance supports environment variables

---

#### **Recommended Approach for N8N Cloud**

**Use Option 1 (Set Node)** or **Option 2 (Hardcode)** depending on your needs:

- **Option 1 (Set Node)**: Better if you want to easily change values later
- **Option 2 (Hardcode)**: Simpler and works immediately

**Action Items**:
- [ ] Choose your preferred approach (Option 1 or 2 recommended)
- [ ] Document your backend URL and admin email
- [ ] Be ready to use these values in workflow nodes

**Time**: 5-10 minutes

---

## Phase 4: Create N8N Workflows

### Step 8: Create Workflow 1 - Judge Registration Flow

**File**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` (Workflow 1 section)

**Purpose**: Set up workflow for judge registration notifications

**Steps**:
1. Create new workflow in n8n
2. Add Webhook trigger node
3. Add HTTP Request nodes (Get Judge Details, Get Event Details)
4. Add Email nodes (Admin notification, Judge confirmation)
5. Configure email templates
6. Test workflow

**Time**: 20-30 minutes

**Action Items**:
- [ ] Follow detailed instructions in `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- [ ] Create webhook endpoint: `/alumni_judge_registered`
- [ ] Configure all HTTP Request nodes
- [ ] Set up email templates
- [ ] Activate workflow
- [ ] Copy webhook URL

**Important**: 
- Copy the webhook URL after creating it
- Update backend `.env` with this URL: `N8N_WEBHOOK_JUDGE_REGISTERED_URL`

---

### Step 9: Create Workflow 2 - Admin Approval/Denial Flow

**File**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` (Workflow 2 section)

**Purpose**: Set up workflow for status update emails

**Steps**:
1. Create new workflow in n8n
2. Add Webhook trigger node
3. Add IF node for status branching
4. Add HTTP Request nodes
5. Add Email nodes (Approval and Denial)
6. Configure email templates
7. Test workflow

**Time**: 20-30 minutes

**Action Items**:
- [ ] Follow detailed instructions in `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- [ ] Create webhook endpoint: `/judge_status_update`
- [ ] Configure IF node for status branching
- [ ] Set up both approval and denial email templates
- [ ] Activate workflow
- [ ] Copy webhook URL

**Important**:
- Copy the webhook URL after creating it
- Update backend `.env` with this URL: `N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL`

---

### Step 10: Create Workflow 3 - Event Reminder Flow

**File**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` (Workflow 3 section)

**Purpose**: Set up automated daily reminder emails

**Steps**:
1. Create new workflow in n8n
2. Add Cron trigger node (00:00 daily)
3. Add HTTP Request node (Get Events Tomorrow)
4. Add Split in Batches nodes
5. Add Email node (Reminder)
6. Configure email template
7. Test workflow manually

**Time**: 15-20 minutes

**Action Items**:
- [ ] Follow detailed instructions in `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- [ ] Set cron schedule: `0 0 * * *` (daily at midnight)
- [ ] Configure timezone correctly
- [ ] Set up batch processing for events and judges
- [ ] Create reminder email template
- [ ] Activate workflow
- [ ] Test workflow manually by triggering it

**Important**:
- Verify timezone matches your server timezone
- Test with events that are scheduled for tomorrow

---

### Step 11: Create Workflow 4 - Post-Event Thank You Flow

**File**: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` (Workflow 4 section)

**Purpose**: Set up automated thank you emails after events

**Steps**:
1. Create new workflow in n8n
2. Add Cron trigger node (23:59 daily)
3. Add HTTP Request node (Get Events Ended Today)
4. Add Split in Batches nodes
5. Add Email node (Thank You)
6. Configure email template
7. Test workflow manually

**Time**: 15-20 minutes

**Action Items**:
- [ ] Follow detailed instructions in `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- [ ] Set cron schedule: `59 23 * * *` (daily at 23:59)
- [ ] Configure timezone correctly
- [ ] Set up batch processing for events and judges
- [ ] Create thank you email template
- [ ] Activate workflow
- [ ] Test workflow manually by triggering it

**Important**:
- Verify timezone matches your server timezone
- Test with events that ended today

---

## Phase 5: Update Backend Configuration

### Step 12: Update Backend with N8N Webhook URLs

**File**: `.env`

**Purpose**: Add actual n8n webhook URLs to backend

**What to Update**:
```env
# Replace placeholder URLs with actual n8n webhook URLs from Steps 8 and 9
N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-actual-n8n-webhook-url/webhook/alumni_judge_registered
N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=https://your-actual-n8n-webhook-url/webhook/judge_status_update
```

**Time**: 2 minutes

**Action Items**:
- [ ] Get webhook URLs from Workflow 1 (Step 8)
- [ ] Get webhook URL from Workflow 2 (Step 9)
- [ ] Update `.env` file with actual URLs
- [ ] Restart backend server

---

## Phase 6: Testing

### Step 13: Test Workflow 1 - Judge Registration

**Purpose**: Verify judge registration triggers email workflow

**Test Steps**:

1. **Register a judge** via API:
   ```bash
   POST http://localhost:5000/api/events/{eventId}/register
   {
     "id": 123,
     "alumniEmail": "judge@example.com",
     "alumniName": "Test Judge",
     "preferredDateTime": "2024-04-15T09:00:00Z",
     "preferredLocation": "Main Hall"
   }
   ```

2. **Check N8N Workflow Execution**:
   - Go to n8n workflow execution history
   - Verify workflow was triggered
   - Check for errors

3. **Verify Emails Sent**:
   - Check admin email inbox
   - Check judge email inbox

**Time**: 10-15 minutes

**Action Items**:
- [ ] Register a test judge
- [ ] Verify workflow triggered in n8n
- [ ] Check email inboxes (admin and judge)
- [ ] Fix any issues found

---

### Step 14: Test Workflow 2 - Status Update

**Purpose**: Verify status update triggers email workflow

**Test Steps**:

1. **Update judge status** via API (requires admin token):
   ```bash
   PUT http://localhost:5000/api/events/{eventId}/judges/{judgeId}/status
   Authorization: Bearer <admin_token>
   {
     "status": "approved"  # or "denied"
   }
   ```

2. **Check N8N Workflow Execution**:
   - Verify workflow triggered
   - Check for errors

3. **Verify Email Sent**:
   - Check judge email inbox for approval/denial email

**Time**: 10-15 minutes

**Action Items**:
- [ ] Update judge status (test both approved and denied)
- [ ] Verify workflow triggered in n8n
- [ ] Check email inboxes
- [ ] Verify correct email template used

---

### Step 15: Test Workflow 3 - Reminder Emails

**Purpose**: Verify reminder emails work correctly

**Test Steps**:

1. **Create test event** scheduled for tomorrow:
   - Use admin panel or API to create event
   - Set event date to tomorrow
   - Add approved judges

2. **Manually trigger workflow** in n8n:
   - Go to workflow 3
   - Click "Execute Workflow" button
   - Check execution

3. **Verify Emails Sent**:
   - Check judge email inboxes
   - Verify reminder content is correct

**Time**: 10-15 minutes

**Action Items**:
- [ ] Create test event for tomorrow
- [ ] Add approved judges to event
- [ ] Manually trigger reminder workflow
- [ ] Verify emails sent to all judges

---

### Step 16: Test Workflow 4 - Thank You Emails

**Purpose**: Verify thank you emails work correctly

**Test Steps**:

1. **Create test event** that ended today:
   - Create event with date set to today
   - Add approved judges

2. **Manually trigger workflow** in n8n:
   - Go to workflow 4
   - Click "Execute Workflow" button

3. **Verify Emails Sent**:
   - Check judge email inboxes
   - Verify thank you content

**Time**: 10-15 minutes

**Action Items**:
- [ ] Create test event that ended today
- [ ] Add approved judges to event
- [ ] Manually trigger thank you workflow
- [ ] Verify emails sent

---

## Phase 7: Error Handling & Monitoring

### Step 17: Add Error Handling to Workflows

**Purpose**: Ensure workflows handle errors gracefully

**What to Add**:

1. **Error Trigger Nodes**: After each HTTP Request node
2. **Error Notification**: Email/Slack alerts on errors
3. **Retry Logic**: For transient failures

**Time**: 15-20 minutes per workflow

**Action Items**:
- [ ] Add error trigger nodes to all 4 workflows
- [ ] Configure error notifications (email to admin)
- [ ] Set up retry logic for HTTP requests
- [ ] Test error scenarios

---

### Step 18: Set Up Monitoring

**Purpose**: Monitor workflow executions

**Actions**:
1. **Set up N8N Execution Alerts**:
   - Configure email/Slack notifications for failed executions
   - Set up daily summary reports

2. **Monitor Backend Logs**:
   - Check webhook call logs
   - Monitor API endpoint responses

3. **Monitor Email Deliverability**:
   - Check email bounce rates
   - Verify email provider limits

**Time**: 15-20 minutes

**Action Items**:
- [ ] Configure n8n execution alerts
- [ ] Set up log monitoring
- [ ] Test error notification system
- [ ] Document monitoring procedures

---

## Phase 8: Production Deployment

### Step 19: Production Checklist

**Before deploying to production**:

- [ ] All 4 workflows tested and working
- [ ] Error handling added to all workflows
- [ ] Email templates finalized
- [ ] Webhook URLs updated to production n8n instance
- [ ] Backend `.env` configured with production URLs
- [ ] Cron schedules verified (timezone correct)
- [ ] Email provider configured for production
- [ ] Monitoring and alerts set up
- [ ] Documentation reviewed
- [ ] Team trained on workflow management

**Time**: 1-2 hours

---

### Step 20: Deploy and Verify

**Steps**:

1. **Deploy Backend** to production
2. **Deploy N8N Workflows** to production instance
3. **Verify Configuration**:
   - Check environment variables
   - Verify webhook URLs
   - Test one workflow end-to-end

4. **Monitor First Executions**:
   - Watch cron workflows on first run
   - Verify emails are sent correctly
   - Check for any errors

**Time**: 30-60 minutes

**Action Items**:
- [ ] Deploy backend changes
- [ ] Deploy n8n workflows
- [ ] Verify all configurations
- [ ] Monitor first executions
- [ ] Fix any production issues

---

## Quick Reference

### Files to Read (in order):

1. ✅ `docs/N8N_IMPLEMENTATION_SUMMARY.md` - Overview
2. ✅ `README.md` - Basic backend setup (if needed)
3. ✅ `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` - Detailed workflow setup
4. ✅ This file (`docs/N8N_SETUP_SEQUENCE.md`) - Setup sequence

### Key Endpoints:

- Backend API for n8n: `http://localhost:5000/api/n8n/...`
- Judge registration: `POST /api/events/:id/register`
- Update judge status: `PUT /api/events/:eventId/judges/:judgeId/status`

### Environment Variables:

```env
N8N_WEBHOOK_JUDGE_REGISTERED_URL=
N8N_WEBHOOK_JUDGE_STATUS_UPDATE_URL=
BACKEND_URL=  # In n8n
ADMIN_EMAIL=  # In n8n
```

---

## Estimated Total Time

- **Understanding & Configuration**: 1-2 hours
- **N8N Setup**: 1-2 hours
- **Workflow Creation**: 2-3 hours
- **Testing**: 1-2 hours
- **Error Handling & Monitoring**: 1 hour
- **Production Deployment**: 1-2 hours

**Total**: 7-12 hours (spread over multiple sessions)

---

## Troubleshooting

If you encounter issues, check:

1. **Backend API not responding**:
   - Check backend server is running
   - Verify endpoint URLs are correct
   - Check backend logs

2. **Webhooks not triggering**:
   - Verify webhook URLs in `.env`
   - Check n8n workflows are active
   - Check backend logs for webhook call attempts

3. **Emails not sending**:
   - Verify email provider credentials in n8n
   - Check email provider rate limits
   - Verify email addresses are valid

4. **Cron workflows not running**:
   - Verify cron schedules are correct
   - Check timezone settings
   - Verify workflows are activated

For detailed troubleshooting, see: `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md` (Troubleshooting section)

---

## Support

- **Backend Issues**: Check backend logs, review API documentation
- **N8N Issues**: Check n8n execution logs, review n8n documentation
- **Workflow Issues**: Review `docs/N8N_EVENT_MANAGEMENT_WORKFLOWS.md`
- **Integration Issues**: Verify webhook URLs and backend configuration

---

## Next Steps After Setup

1. Customize email templates to match your brand
2. Set up additional monitoring and alerting
3. Create documentation for your team
4. Train team members on workflow management
5. Plan for scaling (if needed)

Good luck with your implementation! 🚀

