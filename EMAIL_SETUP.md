# Email Setup Guide

This guide explains how to configure email sending for the Case Competition Backend using **Nodemailer** with SMTP (free alternative to AWS SES).

## Why This Solution?

Since AWS Academy accounts don't have access to AWS SES, we use **Nodemailer** with SMTP to send emails. This is completely free and works with:
- Gmail (recommended)
- Outlook/Hotmail
- Any custom SMTP server

## Option 1: Gmail (Recommended - Free)

Gmail is the easiest and most reliable free option. Follow these steps:

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **App**: "Mail"
3. Select **Device**: "Other (Custom name)"
4. Enter name: "Case Competition Backend"
5. Click **Generate**
6. **Copy the 16-character password** (you'll need this for `.env`)

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
ADMIN_EMAIL=admin@example.com

# Optional: If using custom SMTP (leave as default for Gmail)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
```

**Important Notes:**
- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASSWORD`: The 16-character App Password (not your regular Gmail password)
- `FROM_EMAIL`: Should match `EMAIL_USER` for Gmail
- `ADMIN_EMAIL`: Email address that will receive judge registration notifications

### Step 4: Test Email Sending

Start your server and test the email functionality:

```bash
npm start
```

When an alumni registers as a judge, an email will be sent to `ADMIN_EMAIL`.

---

## Option 2: Outlook/Hotmail (Free)

### Step 1: Generate App Password

1. Go to: https://account.microsoft.com/security
2. Enable **Two-step verification** if not already enabled
3. Go to **Security** → **Advanced security options**
4. Under **App passwords**, click **Create a new app password**
5. Name it: "Case Competition Backend"
6. **Copy the generated password**

### Step 2: Configure Environment Variables

```env
# Email Configuration (Outlook)
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-app-password
FROM_EMAIL=your-email@outlook.com
ADMIN_EMAIL=admin@example.com
```

---

## Option 3: Custom SMTP Server

If you have access to another SMTP server (e.g., your organization's email server):

```env
# Email Configuration (Custom SMTP)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
FROM_EMAIL=your-email@yourdomain.com
ADMIN_EMAIL=admin@example.com
```

**Common SMTP Ports:**
- `587` - TLS (recommended)
- `465` - SSL (set `SMTP_SECURE=true`)
- `25` - Unencrypted (not recommended)

---

## Troubleshooting

### Error: "Email authentication failed"

**Solution:**
- For Gmail: Make sure you're using an **App Password**, not your regular password
- Check that 2-Factor Authentication is enabled
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct

### Error: "Could not connect to SMTP server"

**Solution:**
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify your firewall/network allows outbound connections on the SMTP port
- For Gmail, use `smtp.gmail.com` and port `587`

### Error: "SMTP connection timed out"

**Solution:**
- Check your internet connection
- Verify SMTP server is accessible
- Try a different port (587 vs 465)

### Gmail: "Less secure app access" error

**Solution:**
- This shouldn't happen with App Passwords
- Make sure you're using an App Password, not your regular password
- Enable 2-Factor Authentication if not already enabled

---

## Email Limits

### Gmail
- **Free tier**: 500 emails per day
- **Google Workspace**: 2,000 emails per day

### Outlook
- **Free tier**: 300 emails per day

For higher volumes, consider:
- **Resend** (3,000 emails/month free)
- **SendGrid** (100 emails/day free)
- **Mailgun** (5,000 emails/month free for 3 months)

---

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use App Passwords** - Don't use your main account password
3. **Rotate passwords** - Change App Passwords periodically
4. **Limit access** - Only grant email permissions to necessary services

---

## Alternative: Using Resend (Optional)

If you prefer a service-based solution, you can use Resend (free tier: 3,000 emails/month):

1. Sign up at: https://resend.com
2. Get your API key
3. Install: `npm install resend`
4. Update `services/email.service.js` to use Resend API

---

## Need Help?

If you encounter issues:
1. Check the error message in the console
2. Verify all environment variables are set correctly
3. Test SMTP connection using a tool like `telnet` or `openssl`
4. Review the troubleshooting section above

