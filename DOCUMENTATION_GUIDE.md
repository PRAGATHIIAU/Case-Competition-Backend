# Documentation Guide

This document explains the **sequence** of documentation files you should follow to set up and understand the Case Competition Backend.

## 📚 Documentation Files Overview

| File | Purpose | When to Read |
|------|---------|--------------|
| **SETUP_SEQUENCE.md** | Complete step-by-step setup guide | **START HERE** - First time setup |
| **README.md** | Main project documentation and API reference | After setup, for API usage |
| **EMAIL_SETUP.md** | Email configuration (Gmail/Outlook) | During Step 6 of setup |
| **lambda/README.md** | Lambda function setup and details | During Step 4 of setup |
| **api-gateway-config.md** | API Gateway configuration | During Step 5 of setup |
| **SETUP_GUIDE.md** | Architecture overview and quick reference | For understanding the system |

---

## 🎯 Recommended Reading Sequence

### For First-Time Setup:

1. **`SETUP_SEQUENCE.md`** ⭐ **START HERE**
   - Complete step-by-step setup guide
   - Follow in order from Step 1 to Step 8
   - Includes checkpoints and testing

2. **`EMAIL_SETUP.md`** (Referenced in Step 6)
   - Detailed Gmail App Password setup
   - Alternative SMTP providers
   - Troubleshooting email issues

3. **`lambda/README.md`** (Referenced in Step 4)
   - Lambda function creation details
   - IAM permissions configuration
   - Testing Lambda functions

4. **`api-gateway-config.md`** (Referenced in Step 5)
   - API Gateway REST API setup
   - Endpoint configuration
   - CORS and deployment

5. **`README.md`** (After setup)
   - API endpoint documentation
   - Request/response formats
   - Usage examples

### For Understanding the System:

1. **`SETUP_GUIDE.md`**
   - Architecture overview
   - System flows (file upload, events, email)
   - Quick reference

2. **`README.md`**
   - Complete API documentation
   - All available endpoints
   - Request/response examples

---

## 📖 Detailed File Descriptions

### 1. SETUP_SEQUENCE.md ⭐ **PRIMARY SETUP GUIDE**

**Purpose**: Complete step-by-step setup instructions in the correct order.

**Contents**:
- Step 1: Database Setup (PostgreSQL)
- Step 2: AWS S3 Setup
- Step 3: AWS DynamoDB Setup
- Step 4: Lambda Functions Setup
- Step 5: API Gateway Setup
- Step 6: Email Configuration
- Step 7: Backend Configuration
- Step 8: Testing

**Use When**:
- Setting up the project for the first time
- Need a complete checklist
- Want to ensure nothing is missed

**Key Features**:
- ✅ Checkpoints after each step
- 🔍 Testing instructions
- 🐛 Troubleshooting section
- 📝 Complete `.env` template

---

### 2. README.md

**Purpose**: Main project documentation with API reference.

**Contents**:
- Project structure
- Environment variables
- All API endpoints with examples
- Request/response formats
- Authentication details

**Use When**:
- After setup is complete
- Need to understand API endpoints
- Developing frontend integration
- Looking for request/response examples

**Key Features**:
- Complete API documentation
- Code examples (curl commands)
- Authentication flow
- Error handling

---

### 3. EMAIL_SETUP.md

**Purpose**: Detailed email configuration guide.

**Contents**:
- Gmail App Password setup
- Outlook/Hotmail configuration
- Custom SMTP setup
- Troubleshooting email issues
- Email service alternatives

**Use When**:
- Setting up email functionality (Step 6)
- Email not working
- Need alternative SMTP providers
- Understanding email limits

**Key Features**:
- Step-by-step Gmail setup
- Multiple SMTP provider options
- Security best practices
- Troubleshooting guide

---

### 4. lambda/README.md

**Purpose**: Lambda function setup and configuration.

**Contents**:
- S3 Upload Handler setup
- DynamoDB Events Handler setup
- IAM permissions
- Environment variables
- Testing Lambda functions

**Use When**:
- Setting up Lambda functions (Step 4)
- Need IAM policy examples
- Testing Lambda functions
- Understanding Lambda architecture

**Key Features**:
- Detailed Lambda setup
- IAM policy JSON examples
- Test event examples
- Troubleshooting Lambda issues

---

### 5. api-gateway-config.md

**Purpose**: API Gateway REST API configuration.

**Contents**:
- Creating REST API
- Configuring upload endpoint
- Configuring events endpoint
- Binary media types
- CORS configuration
- Deployment

**Use When**:
- Setting up API Gateway (Step 5)
- Need endpoint configuration details
- Troubleshooting API Gateway errors
- Understanding API Gateway integration

**Key Features**:
- Step-by-step endpoint setup
- CORS configuration
- Troubleshooting common errors
- Testing endpoints

---

### 6. SETUP_GUIDE.md

**Purpose**: Architecture overview and quick reference.

**Contents**:
- System architecture
- File upload flow
- Events flow
- Email flow
- Quick setup overview

**Use When**:
- Understanding system architecture
- Need quick reference
- Understanding data flows
- Overview before detailed setup

**Key Features**:
- Visual architecture diagrams
- System flow explanations
- Quick setup summary
- Links to detailed guides

---

## 🚀 Quick Start Path

**If you're setting up for the first time:**

```
1. Read: SETUP_SEQUENCE.md (follow all steps)
   ├── Step 4 → Refer to: lambda/README.md
   ├── Step 5 → Refer to: api-gateway-config.md
   └── Step 6 → Refer to: EMAIL_SETUP.md

2. After setup: README.md (for API usage)

3. For reference: SETUP_GUIDE.md (architecture overview)
```

---

## 🔍 Finding What You Need

### "How do I set up the project?"
→ **SETUP_SEQUENCE.md**

### "How do I configure email?"
→ **EMAIL_SETUP.md**

### "How do I set up Lambda functions?"
→ **lambda/README.md**

### "How do I configure API Gateway?"
→ **api-gateway-config.md**

### "What API endpoints are available?"
→ **README.md** (API Endpoints section)

### "How does the system work?"
→ **SETUP_GUIDE.md**

### "Email is not working"
→ **EMAIL_SETUP.md** (Troubleshooting section)

### "API Gateway returns 403/404"
→ **api-gateway-config.md** (Troubleshooting section)

### "Lambda function errors"
→ **lambda/README.md** (Troubleshooting section)

---

## 📝 Notes

- All documentation assumes you're using **AWS Academy** account
- Email uses **Nodemailer** (free alternative to AWS SES)
- All AWS operations go through **API Gateway → Lambda**
- User authentication and signup/login are already working (as mentioned)

---

## ✅ Setup Completion Checklist

After following `SETUP_SEQUENCE.md`, you should have:

- [ ] PostgreSQL database configured and initialized
- [ ] S3 bucket created for file uploads
- [ ] DynamoDB table created for events
- [ ] Lambda functions deployed (S3 upload and DynamoDB)
- [ ] API Gateway endpoints configured and deployed
- [ ] Email configured (Gmail App Password)
- [ ] Backend `.env` file configured
- [ ] Backend server running
- [ ] All tests passing

---

## 🆘 Need Help?

1. Check the **Troubleshooting** section in the relevant documentation
2. Review the **Checkpoints** in `SETUP_SEQUENCE.md`
3. Verify all environment variables in `.env`
4. Check CloudWatch logs for Lambda errors
5. Review API Gateway deployment status

---

**Happy Coding! 🎉**

