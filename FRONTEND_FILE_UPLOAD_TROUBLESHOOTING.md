# Frontend File Upload Troubleshooting Guide

## Issue: Fields (major, grad_year, linkedin_url) are null when calling signup from frontend, but work in Postman

### Common Causes

1. **Wrong File Field Name**
   - Backend expects field name: `resume`
   - Frontend might be using a different field name (e.g., `file`, `resumeFile`, `document`)

2. **Content-Type Header Not Set**
   - Frontend must send: `Content-Type: multipart/form-data`
   - Most HTTP libraries set this automatically when using FormData

3. **File Not Included in Request**
   - File might not be properly attached to FormData
   - File might be null/undefined before sending

4. **Body Parser Conflicts**
   - Express body parsers should NOT interfere with multer
   - Multer must handle multipart/form-data BEFORE body parsers

### Solution Steps

#### 1. Check Frontend FormData Field Name

**✅ CORRECT (What backend expects):**
```javascript
const formData = new FormData();
formData.append('resume', file);  // Field name must be 'resume'
formData.append('email', email);
formData.append('name', name);
// ... other fields
```

**❌ WRONG:**
```javascript
formData.append('file', file);      // Wrong field name
formData.append('resumeFile', file); // Wrong field name
formData.append('document', file);   // Wrong field name
```

#### 2. Verify Frontend Request

**Example using fetch:**
```javascript
const formData = new FormData();

// Add file with correct field name
if (resumeFile) {
  formData.append('resume', resumeFile);  // ✅ Field name: 'resume'
}

// Add other fields
formData.append('email', email);
formData.append('name', name);
formData.append('password', password);
formData.append('contact', contact);
formData.append('linkedin_url', linkedinUrl);
formData.append('willing_to_be_mentor', willingToBeMentor);
formData.append('mentor_capacity', mentorCapacity);

// DO NOT set Content-Type header manually - browser will set it automatically
const response = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  body: formData,  // ✅ FormData automatically sets Content-Type
  // ❌ DON'T DO THIS: headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Example using axios:**
```javascript
const formData = new FormData();

// Add file with correct field name
if (resumeFile) {
  formData.append('resume', resumeFile);  // ✅ Field name: 'resume'
}

// Add other fields
formData.append('email', email);
formData.append('name', name);
// ... other fields

const response = await axios.post(
  'http://localhost:5000/api/auth/signup',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data',  // ✅ axios allows this
    },
  }
);
```

#### 3. Check File Object

Make sure the file object is valid:
```javascript
const fileInput = document.querySelector('#resume');
const file = fileInput.files[0];

if (!file) {
  console.error('No file selected');
  return;
}

console.log('File details:', {
  name: file.name,
  size: file.size,
  type: file.type,
});

// Verify file type
const allowedTypes = ['application/pdf', 'application/msword', 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
if (!allowedTypes.includes(file.type)) {
  console.error('Invalid file type:', file.type);
  return;
}
```

#### 4. Debug Frontend Request

Add logging to see what's being sent:
```javascript
console.log('Sending signup request with file:', {
  fileName: resumeFile?.name,
  fileSize: resumeFile?.size,
  fileType: resumeFile?.type,
  hasFile: !!resumeFile,
});

// Log FormData contents (for debugging)
for (let [key, value] of formData.entries()) {
  if (value instanceof File) {
    console.log(`${key}:`, {
      fileName: value.name,
      size: value.size,
      type: value.type,
    });
  } else {
    console.log(`${key}:`, value);
  }
}
```

### Backend Logging

The backend now logs detailed information about the request:

```
📥 Request received: {
  contentType: 'multipart/form-data; boundary=...',
  hasFile: true,
  fileDetails: {
    fieldname: 'resume',
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 123456,
    bufferLength: 123456
  }
}
```

**If `hasFile: false`, the file is not reaching the backend!**

### Common Frontend Mistakes

#### ❌ Mistake 1: Wrong Field Name
```javascript
formData.append('file', resumeFile);  // Wrong! Should be 'resume'
```

#### ❌ Mistake 2: File Not Added to FormData
```javascript
const formData = new FormData();
// ... other fields ...
// Forgot to add: formData.append('resume', resumeFile);
```

#### ❌ Mistake 3: Sending JSON Instead of FormData
```javascript
// ❌ WRONG - Can't send file in JSON
fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    name,
    resume: file,  // This won't work!
  }),
});
```

#### ❌ Mistake 4: Manual Content-Type Header
```javascript
// ❌ WRONG - Don't set Content-Type manually with FormData
fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },  // Browser will override
  body: formData,
});
```

### Testing Checklist

- [ ] File field name is `resume` (not `file`, `resumeFile`, etc.)
- [ ] File is added to FormData: `formData.append('resume', file)`
- [ ] File object exists and is valid before sending
- [ ] Using FormData (not JSON.stringify)
- [ ] Not manually setting Content-Type header (or if using axios, set it correctly)
- [ ] File size is under 5MB
- [ ] File type is PDF, DOC, or DOCX

### Compare Postman vs Frontend

**Postman Request:**
1. Method: POST
2. URL: `http://localhost:5000/api/auth/signup`
3. Body type: `form-data`
4. Fields:
   - `resume` (type: File) ✅
   - `email` (type: Text)
   - `name` (type: Text)
   - ... other fields

**Frontend Request Should Match:**
1. Method: POST
2. URL: `http://localhost:5000/api/auth/signup`
3. Body: FormData object
4. FormData contains:
   - `resume`: File object ✅
   - `email`: String
   - `name`: String
   - ... other fields

### Quick Fix

If you're using React with a file input:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  
  // Get file from input
  const fileInput = document.querySelector('#resume');
  const resumeFile = fileInput?.files[0];
  
  if (!resumeFile) {
    console.error('No resume file selected');
    return;
  }
  
  // ✅ CRITICAL: Use field name 'resume'
  formData.append('resume', resumeFile);
  
  // Add other fields
  formData.append('email', email);
  formData.append('name', name);
  formData.append('password', password);
  // ... other fields
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      body: formData,  // Don't set Content-Type - browser does it
    });
    
    const data = await response.json();
    console.log('Signup response:', data);
  } catch (error) {
    console.error('Signup error:', error);
  }
};
```

### Verify Backend Receives File

Check backend console logs for:
```
📥 Request received: {
  hasFile: true,  // ✅ Should be true
  fileDetails: {
    fieldname: 'resume',  // ✅ Should be 'resume'
    originalname: '...',
    ...
  }
}
```

If `hasFile: false`, the file is not reaching the backend. Check:
1. Frontend field name is `resume`
2. File is added to FormData
3. File exists and is valid

