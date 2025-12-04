# N8N Workflow Setup for Nightly Batch Matching

This document provides instructions for setting up the N8N workflow to trigger nightly batch matching at 2 AM.

## Prerequisites

- N8N instance running and accessible
- Backend API endpoints accessible from N8N
- Backend URL: `http://your-backend-url:5000` (or your production URL)

## Workflow Steps

### Step 1: Cron Node (Schedule Trigger)

1. **Add Cron Node**
   - Node Type: `Cron`
   - Schedule: `0 2 * * *` (runs every day at 2:00 AM)
   - Timezone: Set to your server timezone

### Step 2: HTTP Request Node - Check Changes

1. **Add HTTP Request Node**
   - Name: "Check Profile Changes"
   - Method: `GET`
   - URL: `http://your-backend-url:5000/api/matching/check-changes`
   - Authentication: None (or add if your API requires it)

**Expected Response:**
```json
{
  "success": true,
  "changesCount": 5,
  "hasChanges": true,
  "message": "Found 5 profile changes in the last 24 hours"
}
```

### Step 3: IF Node - Check if Changes Exist

1. **Add IF Node**
   - Condition: Check if `{{ $json.hasChanges }}` is `true`
   - If true → proceed to Step 4
   - If false → end workflow (no changes, skip batch)

### Step 4: HTTP Request Node - Run Batch

1. **Add HTTP Request Node**
   - Name: "Run Batch Matching"
   - Method: `POST`
   - URL: `http://your-backend-url:5000/api/matching/run-batch`
   - Body: Empty (no body needed)
   - Authentication: None (or add if your API requires it)

**Expected Response:**
```json
{
  "success": true,
  "message": "Batch run completed",
  "stats": {
    "changesCount": 5,
    "mentorsCount": 10,
    "menteesCount": 20,
    "scoresSaved": 200,
    "mappingsUpdated": 10
  },
  "updatedMappingsCount": 10,
  "statistics": {
    "total_mentors": 10,
    "total_mentees": 20,
    "total_mentees_assigned": 10
  }
}
```

### Step 5: HTTP Request Node - Clear Logs

1. **Add HTTP Request Node**
   - Name: "Clear Change Logs"
   - Method: `POST`
   - URL: `http://your-backend-url:5000/api/matching/clear-log`
   - Body: Empty (no body needed)
   - Authentication: None (or add if your API requires it)

**Expected Response:**
```json
{
  "success": true,
  "message": "Cleared 5 log entries",
  "deletedCount": 5
}
```

## Complete Workflow Diagram

```
[Cron: 2 AM Daily]
    ↓
[HTTP: GET /api/matching/check-changes]
    ↓
[IF: hasChanges === true?]
    ├─→ NO → [End: No changes, skip batch]
    └─→ YES → [HTTP: POST /api/matching/run-batch]
                  ↓
              [HTTP: POST /api/matching/clear-log]
                  ↓
              [End: Batch completed]
```

## Error Handling

### Add Error Handling Nodes

1. **Add Error Trigger Node** after each HTTP request
2. **Add Notification Node** (Email/Slack) to alert on errors
3. **Add Logging Node** to log errors for debugging

## Testing the Workflow

### Manual Test Steps

1. **Test Check Changes Endpoint:**
   ```bash
   curl http://localhost:5000/api/matching/check-changes
   ```

2. **Test Run Batch Endpoint:**
   ```bash
   curl -X POST http://localhost:5000/api/matching/run-batch
   ```

3. **Test Clear Log Endpoint:**
   ```bash
   curl -X POST http://localhost:5000/api/matching/clear-log
   ```

### Test with Sample Data

1. Create a new user or update an existing profile
2. Wait for the change to be logged
3. Manually trigger the workflow in N8N
4. Verify that:
   - Changes are detected
   - Batch matching runs successfully
   - Similarity scores are saved
   - Mappings are updated
   - Logs are cleared

## Monitoring

### Key Metrics to Monitor

1. **Workflow Execution Time**
   - Should complete within 5-10 minutes for typical datasets

2. **Success Rate**
   - Monitor HTTP response status codes
   - Alert on 5xx errors

3. **Batch Statistics**
   - Number of mentors processed
   - Number of mentees processed
   - Number of mappings created/updated

### Logging

- All endpoints log execution start/end
- Check backend logs for detailed error messages
- Monitor N8N execution logs for workflow issues

## Troubleshooting

### Common Issues

1. **No Changes Detected**
   - Verify that profile changes are being logged
   - Check `user_profile_change_log` table in database
   - Ensure timestamps are within last 24 hours

2. **Python Script Fails**
   - Verify Python 3 is installed
   - Check that `matching/mentor_mentee_matcher.py` exists
   - Verify required Python packages are installed (`numpy`, `scikit-learn`)

3. **Database Errors**
   - Ensure tables are created (run migration SQL)
   - Check database connection
   - Verify user permissions

4. **Timeout Errors**
   - Increase timeout in HTTP request nodes
   - Check backend server resources
   - Consider running batch during off-peak hours

## Security Considerations

1. **API Authentication**
   - Consider adding API key authentication for batch endpoints
   - Use environment variables for sensitive URLs

2. **Network Security**
   - Ensure N8N can only access necessary endpoints
   - Use HTTPS in production

3. **Data Privacy**
   - Ensure batch processing complies with data privacy regulations
   - Log only necessary information

## Production Checklist

- [ ] Tables created in production database
- [ ] N8N workflow configured and tested
- [ ] Cron schedule verified (2 AM in correct timezone)
- [ ] Error notifications configured
- [ ] Monitoring and alerting set up
- [ ] Backup strategy for matching results
- [ ] Documentation updated
- [ ] Team trained on workflow management

