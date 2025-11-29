# Admin Analytics Guide

This guide explains the **admin analytics endpoint** and how to use it from tooling or frontend dashboards.

---

## Endpoint Overview

All analytics endpoints are **admin-only** (JWT required) and are mounted under `/admin/analytics/*`:

- `GET /admin/analytics/basic-stats` – High-level platform statistics
- `GET /admin/analytics/student-engagement` – Student activity + profile completion
- `GET /admin/analytics/alumni-engagement` – Alumni activity + judges this month
- `GET /admin/analytics/inactive-alumni` – Detailed list of inactive alumni
- `GET /admin/analytics/feedback-summary` – Feedback counts + average ratings
- `GET /admin/analytics/events/summary` – Event-level stats (teams, scores, judges)
- `GET /admin/analytics/student-event-trends` – Student/team trends across events
- `GET /admin/analytics/alumni-roles` – Mentor/judge/sponsor/multi-role counts
- `GET /admin/analytics/admin-activity` – Placeholder recent admin actions
- `GET /admin/analytics/system-health` – System health (Postgres/DynamoDB/S3/Lambda)

---

## 1. Basic Platform Stats – `/admin/analytics/basic-stats`

**Purpose:** High-level platform statistics for the admin dashboard.

**Response:**
```json
{
  "totalStudents": 0,
  "totalAlumni": 0,
  "activeEvents": 0,
  "inactiveAlumniCount": 0
}
```

Where:
- **totalStudents**: Count of rows in the `students` table (PostgreSQL).
- **totalAlumni**: Count of rows in the `users` table (PostgreSQL).
- **activeEvents**: Count of events in DynamoDB whose date is today or in the future
  - Uses `event.eventInfo.date` if present, otherwise `event.date`.
  - If no/invalid date is present, the event is treated as active (to avoid under-counting).
- **inactiveAlumniCount**: Number of alumni in `users` table where `last_login` is **older than 90 days**.

---

## Authentication

You must first login as an admin via:

- **POST** `/admin/login`

Then pass the returned token in the `Authorization` header:

```http
Authorization: Bearer <admin_jwt_token>
```

If the token is missing/invalid/expired, the endpoint returns **401** or **403**.

---

## Example Requests

### cURL

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # from /admin/login

curl -X GET http://localhost:3000/admin/analytics/basic-stats \
  -H "Authorization: Bearer $TOKEN"
```

### PowerShell

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/basic-stats" -Method GET -Headers $headers
$response | ConvertTo-Json
```

### Typical Response

```json
{
  "totalStudents": 42,
  "totalAlumni": 130,
  "activeEvents": 3,
  "inactiveAlumniCount": 15
}
```

---

## Data Sources & Logic (Summary)

- **PostgreSQL**
  - `students` table – counts + student login activity.
  - `users` table – alumni counts, `last_login`, willingness flags, feedback.
  - `feedback` table – `type` + `rating` (if present).
- **DynamoDB (via Lambda/API Gateway)**
  - `Events` table – teams, scores, judges, eventInfo (names/dates).
  - `student_profiles` – fields used for profile completion %.
- **Health checks**
  - Uses existing API Gateway URLs instead of direct AWS SDK.

For endpoint-by-endpoint implementation details, see inline JSDoc in:

- `repositories/analytics.repository.js`
- `services/analytics.service.js`
- `controllers/analytics.controller.js`

---

## Frontend Integration Tips

- Call **basic stats + system health** near dashboard load:
  - `GET /admin/analytics/basic-stats`
  - `GET /admin/analytics/system-health`
- Load heavier analytics lazily or behind tabs (engagement, event trends).
- Handle errors by checking HTTP status:
  - `401/403`: redirect to admin login.
  - `500`: show a generic \"Analytics service unavailable\" message.

Example (pseudo-code):

```ts
const [statsRes, healthRes] = await Promise.all([
  adminApi.get("/admin/analytics/basic-stats"),
  adminApi.get("/admin/analytics/system-health"),
]);

setStats(statsRes.data);
setHealth(healthRes.data);
```

---

## Related Documentation

- `ADMIN_API_GUIDE.md` – Full admin API reference (including analytics shapes)
- `ADMIN_QUICK_START.md` – Setup & quick testing of admin endpoints
