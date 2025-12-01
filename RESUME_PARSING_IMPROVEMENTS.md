# Resume Parsing Improvements - Projects, LinkedIn & GitHub URLs

## ✅ Improvements Completed

### 1. Enhanced Project Extraction

**Improvements:**
- ✅ Better project title detection with multiple pattern matching
- ✅ Improved description extraction (multi-line support)
- ✅ Automatic GitHub URL extraction per project
- ✅ Technology stack extraction from project descriptions
- ✅ Better handling of various project formatting styles

**Extracted Fields:**
```json
{
  "name": "ML-Powered Recommendation Platform",
  "description": "Led product development of ML recommendation system increasing user engagement by 45%, managed cross-functional team of 15 engineers and data scientists",
  "github_url": "https://github.com/username/project-name", // Optional
  "technologies": ["React", "Node.js"] // Optional
}
```

### 2. LinkedIn URL Extraction

**Features:**
- ✅ Extracts LinkedIn URLs from anywhere in the resume
- ✅ Handles multiple formats:
  - Full URLs: `https://www.linkedin.com/in/username`
  - Short formats: `linkedin.com/in/username`
  - Contact sections
- ✅ Validates URL format before storing

**Storage:**
- Stored in DynamoDB profile as `linkedin_url`
- Included in signup request automatically
- Manual input takes precedence over parsed

### 3. GitHub URL Extraction

**Features:**
- ✅ Extracts GitHub URLs from resume (profile URL)
- ✅ Extracts GitHub URLs per project (project-specific repos)
- ✅ Handles multiple formats:
  - Profile URLs: `https://github.com/username`
  - Repo URLs: `https://github.com/username/repo-name`
  - Short formats: `github.com/username`
- ✅ Validates URL format before storing

**Storage:**
- Profile GitHub URL: Stored in DynamoDB as `github_url`
- Project GitHub URLs: Stored within each project object as `github_url`

## Example Signup Request

When a resume is uploaded, the system automatically extracts and includes:

```json
{
  "email": "lisa.anderson6@example.com",
  "name": "Lisa Anderson",
  "password": "SecurePass123!",
  "contact": "+1-555-0110",
  "willing_to_be_mentor": "yes",
  "mentor_capacity": 4,
  "willing_to_be_judge": "yes",
  "willing_to_be_sponsor": "yes",
  
  // Automatically extracted from resume:
  "linkedin_url": "https://www.linkedin.com/in/lisa-anderson",
  "skills": ["Product Management", "Machine Learning", "Strategy", "Python"],
  "projects": [
    {
      "name": "ML-Powered Recommendation Platform",
      "description": "Led product development of ML recommendation system increasing user engagement by 45%, managed cross-functional team of 15 engineers and data scientists",
      "github_url": "https://github.com/lisa-anderson/ml-recommendation-platform"
    },
    {
      "name": "AI Chatbot Product",
      "description": "Launched conversational AI product serving 100K+ users, defined product roadmap, worked with ML team on model improvements",
      "github_url": "https://github.com/lisa-anderson/ai-chatbot"
    }
  ],
  "experiences": [
    {
      "company": "AI Products Inc",
      "position": "Senior Product Manager - AI/ML",
      "duration": "2020-2024",
      "description": "Led AI product initiatives, defined product strategy, collaborated with engineering teams on ML model deployment, managed product lifecycle from conception to launch"
    }
  ],
  "achievements": ["Product of the Year 2023", "AI Innovation Award"],
  "aspirations": "Guide students interested in product management, especially in AI/ML domain. Help them understand product strategy, technical decision-making, and career transitions from engineering to product",
  "github_url": "https://github.com/lisa-anderson"
}
```

## Response Format

The signup response includes all extracted data:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "lisa.anderson6@example.com",
      "name": "Lisa Anderson",
      "contact": "+1-555-0110",
      "skills": ["Product Management", "Machine Learning", "Strategy", "Python"],
      "projects": [
        {
          "name": "ML-Powered Recommendation Platform",
          "description": "Led product development...",
          "github_url": "https://github.com/lisa-anderson/ml-recommendation-platform"
        }
      ],
      "experiences": [...],
      "achievements": [...],
      "linkedin_url": "https://www.linkedin.com/in/lisa-anderson",
      "github_url": "https://github.com/lisa-anderson",
      "resume_url": "https://s3.amazonaws.com/..."
    },
    "token": "jwt-token-here"
  }
}
```

## How It Works

### Project Extraction

1. **Finds Projects Section:**
   - Looks for headers: "Projects", "Portfolio", "Key Projects", etc.
   - Extracts all projects listed in that section

2. **Extracts Project Details:**
   - **Name**: Project title (capitalized, structured)
   - **Description**: Multi-line description text
   - **GitHub URL**: Extracted from project description or adjacent lines
   - **Technologies**: Extracted from "using", "built with", "tech stack" lines

3. **Improves Accuracy:**
   - Handles bullet points, numbered lists, and structured formats
   - Associates GitHub URLs with correct projects
   - Extracts inline project mentions from other sections

### LinkedIn URL Extraction

1. **Multiple Detection Patterns:**
   - Full URL: `https://www.linkedin.com/in/username`
   - Short format: `linkedin.com/in/username`
   - Text patterns: "LinkedIn: ...", "linkedin.com/..."

2. **Search Locations:**
   - Header/contact section
   - Footer
   - Anywhere in resume text

3. **Validation:**
   - Ensures proper LinkedIn URL format
   - Normalizes to full URL format

### GitHub URL Extraction

1. **Profile GitHub URL:**
   - Extracted from contact section or header
   - Stored as `github_url` in profile

2. **Project GitHub URLs:**
   - Extracted from project descriptions
   - Stored within each project object
   - Can have different GitHub URLs for different projects

3. **Multiple Formats Supported:**
   - `https://github.com/username`
   - `github.com/username`
   - `https://github.com/username/repo-name`

## Data Precedence

**Manual Input Overrides Parsed Data:**
- If user provides `linkedin_url` manually → uses manual value
- If user provides `projects` manually → uses manual projects
- If user provides `github_url` manually → uses manual value
- Otherwise → uses parsed data from resume

## Testing

### Test with Resume Containing:

1. **LinkedIn URL in header:**
   ```
   Contact: +1-555-0110
   LinkedIn: https://www.linkedin.com/in/lisa-anderson
   GitHub: https://github.com/lisa-anderson
   ```

2. **Projects with GitHub URLs:**
   ```
   PROJECTS
   ML-Powered Recommendation Platform
   Led product development of ML recommendation system...
   GitHub: https://github.com/lisa-anderson/ml-recommendation-platform
   ```

3. **Structured Project Format:**
   ```
   Projects:
   1. Project Name
      Description of project with details
      Technologies: React, Node.js, MongoDB
      GitHub: github.com/username/project
   ```

## Files Modified

1. ✅ `services/resume-parser.service.js`
   - Improved `extractProjects()` function
   - Added `extractLinkedInUrl()` function
   - Added `extractGitHubUrl()` function
   - Updated `parseResume()` to include URLs

2. ✅ `services/auth.service.js`
   - Integrated LinkedIn and GitHub URL extraction
   - Merged parsed URLs with manual input
   - Updated `getUserWithProfile()` to include URLs in response

3. ✅ `controllers/auth.controller.js`
   - Added `linkedin_url` to request body extraction

## Next Steps

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Test with sample resume:**
   - Upload resume with LinkedIn and GitHub URLs
   - Verify extraction in signup response

3. **Verify data storage:**
   - Check DynamoDB profile includes `linkedin_url` and `github_url`
   - Verify projects include `github_url` field

## Notes

- LinkedIn and GitHub URLs are extracted automatically
- No manual entry needed if URLs are in resume
- Manual input always takes precedence over parsed data
- URLs are validated before storage
- All extraction is free and runs locally

