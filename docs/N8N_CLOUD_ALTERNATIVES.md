# N8N Cloud Configuration Alternatives

Since N8N Cloud doesn't provide direct access to environment variables through Settings, use these alternative approaches:

## Quick Solutions

### ✅ **Recommended: Use Set Node (Option 1)**

Add a **Set Node** at the start of each workflow to define variables.

### ✅ **Simplest: Hardcode Values (Option 2)**

Hardcode URLs and emails directly in workflow nodes.

---

## Option 1: Set Node (Recommended for N8N Cloud)

### How to Use

1. **After your trigger node** (Webhook/Cron), add a **Set Node**
2. **Configure Set Node**:
   - Mode: "Manual"
   - Add these fields:
     ```
     backendUrl = http://localhost:5000
     adminEmail = admin@example.com
     adminPanelUrl = http://localhost:3000/admin (optional)
     ```

3. **Use in other nodes**:
   - HTTP URLs: `{{ $json.backendUrl }}/api/n8n/judge/...`
   - Email To: `{{ $json.adminEmail }}`
   - Links: `{{ $json.adminPanelUrl }}/events/...`

### Example Set Node Configuration

```
Field Name: backendUrl
Value: http://localhost:5000

Field Name: adminEmail  
Value: admin@example.com

Field Name: adminPanelUrl
Value: http://localhost:3000/admin
```

### Advantages
- ✅ Works in N8N Cloud
- ✅ Easy to update per workflow
- ✅ Centralized configuration in workflow

---

## Option 2: Hardcode Values (Simplest)

### How to Use

Directly type values in workflow nodes - no setup needed!

### HTTP Request URLs

Instead of:
```
{{ $env.BACKEND_URL }}/api/n8n/judge/{{ $json.judgeId }}
```

Use:
```
http://localhost:5000/api/n8n/judge/{{ $json.judgeId }}
```

### Email Addresses

Instead of:
```
{{ $env.ADMIN_EMAIL }}
```

Use:
```
admin@example.com
```

### Advantages
- ✅ Works everywhere immediately
- ✅ No extra nodes needed
- ✅ Simplest approach

### Disadvantages
- ⚠️ Need to update in multiple places if URL changes

---

## Option 3: Code Node

### How to Use

Add a **Code Node** after trigger:

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

Then use: `{{ $json.backendUrl }}`, `{{ $json.adminEmail }}`, etc.

---

## Complete Replacement Guide

### In HTTP Request Nodes

**Replace:**
```
{{ $env.BACKEND_URL }}/api/n8n/judge/{{ $json.judgeId }}
```

**With (Option 1 - Set Node):**
```
{{ $json.backendUrl }}/api/n8n/judge/{{ $json.judgeId }}
```

**Or With (Option 2 - Hardcode):**
```
http://localhost:5000/api/n8n/judge/{{ $json.judgeId }}
```

---

### In Email Nodes - To Field

**Replace:**
```
{{ $env.ADMIN_EMAIL }}
```

**With (Option 1 - Set Node):**
```
{{ $json.adminEmail }}
```

**Or With (Option 2 - Hardcode):**
```
admin@example.com
```

---

### In Email Templates - Links

**Replace:**
```
<a href="{{ $env.ADMIN_PANEL_URL }}/events/...">
```

**With (Option 1 - Set Node):**
```
<a href="{{ $json.adminPanelUrl }}/events/...">
```

**Or With (Option 2 - Hardcode):**
```
<a href="http://localhost:3000/admin/events/...">
```

---

### In Email Templates - Contact Email

**Replace:**
```
Contact us at {{ $env.ADMIN_EMAIL }}
```

**With (Option 1 - Set Node):**
```
Contact us at {{ $json.adminEmail }}
```

**Or With (Option 2 - Hardcode):**
```
Contact us at admin@example.com
```

---

## Workflow Setup with Set Node

### Example: Workflow 1 Setup

1. **Webhook Trigger** → Receives `{ judgeId, eventId }`
2. **Set Node** → Adds `backendUrl`, `adminEmail`, `adminPanelUrl`
3. **HTTP Request** → `{{ $json.backendUrl }}/api/n8n/judge/...`
4. **HTTP Request** → `{{ $json.backendUrl }}/api/n8n/event/...`
5. **Email Node** → To: `{{ $json.adminEmail }}`
6. **Email Node** → To: `{{ $json["Get Judge Details"].data.email }}`

---

## Production URLs

When moving to production:

### Option 1 (Set Node):
Update the Set Node values:
```
backendUrl = https://your-production-backend.com
adminEmail = admin@yourdomain.com
adminPanelUrl = https://your-admin-panel.com
```

### Option 2 (Hardcode):
Find and replace all instances:
- `http://localhost:5000` → `https://your-production-backend.com`
- `admin@example.com` → `admin@yourdomain.com`

---

## Recommendation

**For N8N Cloud users**: Use **Option 1 (Set Node)** - it's clean, centralized, and easy to update.

**For quick testing**: Use **Option 2 (Hardcode)** - fastest to set up.

---

## All Environment Variable Replacements

| Original | Set Node Alternative | Hardcode Alternative |
|----------|---------------------|---------------------|
| `{{ $env.BACKEND_URL }}` | `{{ $json.backendUrl }}` | `http://localhost:5000` |
| `{{ $env.ADMIN_EMAIL }}` | `{{ $json.adminEmail }}` | `admin@example.com` |
| `{{ $env.ADMIN_PANEL_URL }}` | `{{ $json.adminPanelUrl }}` | `http://localhost:3000/admin` |

---

## Quick Checklist

- [ ] Choose your approach (Set Node or Hardcode)
- [ ] If using Set Node: Add it after trigger in each workflow
- [ ] Replace all `{{ $env.* }}` references
- [ ] Test workflows to ensure URLs/emails work
- [ ] Update to production URLs when ready

---

That's it! You don't need environment variables in N8N Cloud - use Set Node or hardcode values instead! 🎉

