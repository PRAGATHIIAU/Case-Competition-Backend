# Resume Parsing Setup Guide

## Overview

The resume parsing feature automatically extracts structured data from uploaded resume files (PDF/DOCX) during signup. This is a **completely free, local solution** with high accuracy.

## Features

- ✅ **Free** - No API costs, runs entirely locally
- ✅ **High Accuracy** - Uses advanced pattern matching and NLP techniques
- ✅ **Fast Performance** - Processes resumes in milliseconds
- ✅ **Multi-format Support** - PDF and DOCX files
- ✅ **Automatic Extraction** - Extracts skills, projects, experiences, achievements, and aspirations

## What Gets Extracted

### 1. Skills
- Technical skills (programming languages, frameworks, tools)
- Soft skills (leadership, communication, etc.)
- Industry-specific skills
- Certifications and methodologies

### 2. Projects
- Project names
- Project descriptions
- Technology stacks used

### 3. Experiences
- Company names
- Job positions/titles
- Duration (start date - end date)
- Job descriptions

### 4. Achievements
- Awards and honors
- Certifications
- Recognitions
- Accomplishments

### 5. Aspirations
- Career objectives
- Professional summaries
- Profile descriptions

## Installation

### Step 1: Install Required Packages

```bash
npm install pdf-parse mammoth
```

Or add to `package.json`:
```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0"
  }
}
```

Then run:
```bash
npm install
```

## How It Works

### Signup Flow with Resume Parsing

1. **User uploads resume** during signup (PDF or DOCX file)
2. **Resume is parsed** automatically to extract structured data
3. **Extracted data is merged** with any manually provided data (manual data takes precedence)
4. **Data is saved** to DynamoDB profile along with resume URL
5. **Signup completes** with all profile information populated

### Example Request

```bash
POST /api/auth/signup
Content-Type: multipart/form-data

email: lisa.anderson6@example.com
name: Lisa Anderson
password: SecurePass123!
contact: +1-555-0110
willing_to_be_mentor: yes
mentor_capacity: 4
willing_to_be_judge: yes
willing_to_be_sponsor: yes
resume: [PDF or DOCX file]
```

**What happens:**
1. Resume file is parsed automatically
2. Skills, projects, experiences, achievements are extracted
3. These are included in the signup request automatically
4. User doesn't need to manually enter this information

### Response

The signup response includes all the extracted data:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "lisa.anderson6@example.com",
      "name": "Lisa Anderson",
      "skills": ["Product Management", "Machine Learning", "Strategy", "Python"],
      "projects": [
        {
          "name": "ML-Powered Recommendation Platform",
          "description": "Led product development..."
        }
      ],
      "experiences": [
        {
          "company": "AI Products Inc",
          "position": "Senior Product Manager",
          "duration": "2020-2024",
          "description": "Led AI product initiatives..."
        }
      ],
      "achievements": ["Product of the Year 2023", "AI Innovation Award"],
      "aspirations": "Guide students interested in product management...",
      "resume_url": "https://s3.amazonaws.com/..."
    },
    "token": "jwt-token-here"
  }
}
```

## Manual Override

If a user provides manual data along with a resume:
- **Manual data takes precedence** over parsed data
- Parsed data is used only for fields not manually provided
- Example: If user provides skills manually, those are used; otherwise, parsed skills are used

## File Format Support

### PDF Files
- ✅ Fully supported
- Uses `pdf-parse` library
- Extracts text with high accuracy

### DOCX Files
- ✅ Fully supported
- Uses `mammoth` library
- Preserves formatting and structure

### DOC Files (Legacy)
- ⚠️ Limited support
- Conversion to DOCX recommended

## Parsing Accuracy

### High Accuracy Patterns
- ✅ Skills sections (explicitly labeled)
- ✅ Work experience with clear formatting
- ✅ Projects with structured layout
- ✅ Certifications and achievements sections

### Moderate Accuracy Patterns
- ⚠️ Skills mentioned inline in descriptions
- ⚠️ Projects without clear section headers
- ⚠️ Experiences with non-standard formatting

### Tips for Better Parsing
1. **Use clear section headers**: "Skills", "Experience", "Projects", "Achievements"
2. **Consistent formatting**: Use bullet points or structured lists
3. **Standard date formats**: "2020-2024" or "Jan 2020 - Dec 2024"
4. **Clear job titles**: Position at Company or Company - Position format

## Error Handling

The resume parser is **non-blocking**:
- ✅ If parsing fails, signup still succeeds
- ✅ User can provide data manually
- ✅ Logs show parsing errors for debugging

### Common Issues

1. **Parsing fails silently**
   - Check logs for error messages
   - Verify file format is PDF or DOCX
   - Try re-saving the resume in a standard format

2. **Missing data**
   - Resume might not have clear sections
   - Try manually providing data
   - Check resume format/structure

3. **Incorrect extraction**
   - Manual data always overrides parsed data
   - User can update profile after signup

## Performance

- **Fast**: Processes resumes in < 1 second typically
- **Efficient**: No external API calls, runs locally
- **Scalable**: Can handle multiple signups simultaneously

## Code Structure

### Files

1. **`services/resume-parser.service.js`**
   - Main parsing logic
   - Text extraction functions
   - Data extraction functions

2. **`services/auth.service.js`**
   - Integrated resume parsing into signup flow
   - Merges parsed data with manual data

### Key Functions

```javascript
// Parse resume file
const parsedData = await parseResume(fileBuffer, mimeType);

// Returns:
{
  skills: [...],
  projects: [...],
  experiences: [...],
  achievements: [...],
  aspirations: "..."
}
```

## Testing

### Test with Sample Resume

1. Create a resume with clear sections
2. Upload during signup
3. Check extracted data in response
4. Verify data is saved correctly

### Example Test Resume Structure

```
SKILLS
• Python, JavaScript, React
• Machine Learning, Data Science
• Product Management, Agile

EXPERIENCE
Senior Product Manager at AI Products Inc (2020-2024)
Led AI product initiatives...

PROJECTS
ML-Powered Recommendation Platform
Led product development of ML recommendation system...

ACHIEVEMENTS
• Product of the Year 2023
• AI Innovation Award
```

## Troubleshooting

### Issue: Parsing returns empty data

**Solutions:**
- Check if resume has clear section headers
- Verify file is not corrupted
- Try manually providing data

### Issue: Incorrect skill extraction

**Solutions:**
- Skills list should be in a dedicated "Skills" section
- Use bullet points or comma-separated format
- Manual override always works

### Issue: Projects not extracted

**Solutions:**
- Ensure "Projects" section is clearly labeled
- Use structured format with project names and descriptions
- Manual data always takes precedence

## Future Enhancements

Potential improvements (not implemented):
- Support for more file formats (TXT, RTF)
- Machine learning-based extraction for better accuracy
- Custom parsing rules per industry
- Resume template detection

## Support

For issues or questions:
1. Check server logs for parsing errors
2. Verify resume format and structure
3. Try providing data manually as fallback
4. Contact development team with resume sample

