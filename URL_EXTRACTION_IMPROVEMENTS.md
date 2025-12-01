# LinkedIn & GitHub URL Extraction Improvements

## Problem
LinkedIn and GitHub URLs were returning `null` in the signup response even when present in resumes.

## Root Causes Identified

1. **Pattern Matching Too Strict**: Original regex patterns were too specific
2. **Text Normalization Issues**: URLs split across lines in PDFs/DOCX might be broken during normalization
3. **Insufficient Fallback Patterns**: Not enough alternative patterns to catch various URL formats
4. **URL Cleaning Too Aggressive**: Trailing character removal might have been too strict

## Solutions Implemented

### 1. Enhanced Pattern Matching

**LinkedIn URL Extraction:**
- ✅ Full URL pattern: `https://linkedin.com/in/username`
- ✅ Short format: `linkedin.com/in/username`
- ✅ Labeled format: `LinkedIn: linkedin.com/in/username`
- ✅ Flexible search: Any mention of `linkedin.com` in text
- ✅ Contact section search: Special handling for header/footer

**GitHub URL Extraction:**
- ✅ Full URL pattern: `https://github.com/username`
- ✅ Short format: `github.com/username`
- ✅ Labeled format: `GitHub: github.com/username`
- ✅ Flexible search: Any mention of `github.com` in text
- ✅ Contact section search: Special handling for header/footer

### 2. Dual Text Search

- **Raw Text Search**: Searches in original extracted text first (before normalization)
- **Normalized Text Search**: Falls back to normalized text if not found in raw
- **Why**: URLs might be broken across lines in PDF/DOCX files; raw text preserves them better

### 3. Better URL Cleaning

- ✅ Handles trailing punctuation: `,`, `.`, `;`, `:`, `!`, `?`, `)`, `]`, `}`
- ✅ Handles trailing whitespace and slashes
- ✅ Preserves valid URL structure
- ✅ Removes query parameters and fragments from LinkedIn URLs

### 4. Multiple Fallback Strategies

1. **Direct URL Match**: Most reliable - matches full URLs
2. **Domain Match**: Matches `linkedin.com` or `github.com` anywhere
3. **Labeled Match**: Matches "LinkedIn: ..." or "GitHub: ..." patterns
4. **Contact Section**: Searches header/footer sections specifically

### 5. Enhanced Debug Logging

- Logs when URLs are found or not found
- Shows extracted URL values
- Helps troubleshoot extraction issues

## Code Changes

### Before
```javascript
const linkedinUrl = extractLinkedInUrl(text);
const githubUrl = extractGitHubUrl(text);
```

### After
```javascript
// Try both raw and normalized text
const linkedinUrl = extractLinkedInUrl(rawText) || extractLinkedInUrl(text);
const githubUrl = extractGitHubUrl(rawText) || extractGitHubUrl(text);
```

## Supported URL Formats

### LinkedIn
- ✅ `https://www.linkedin.com/in/john-doe`
- ✅ `https://linkedin.com/in/john-doe`
- ✅ `linkedin.com/in/john-doe`
- ✅ `LinkedIn: linkedin.com/in/john-doe`
- ✅ `https://www.linkedin.com/in/john-doe/`
- ✅ `https://www.linkedin.com/in/john-doe?trk=...`

### GitHub
- ✅ `https://github.com/johndoe`
- ✅ `https://www.github.com/johndoe`
- ✅ `github.com/johndoe`
- ✅ `GitHub: github.com/johndoe`
- ✅ `https://github.com/johndoe/repo-name` → Extracts profile URL
- ✅ `github.com/johndoe/repo-name` → Extracts profile URL

## Testing

To test URL extraction:

1. **Create a test resume** with LinkedIn/GitHub URLs in various formats
2. **Upload via signup endpoint**
3. **Check console logs** for extraction status
4. **Verify response** contains `linkedin_url` and `github_url`

### Example Test Cases

```text
Contact:
LinkedIn: https://www.linkedin.com/in/john-doe
GitHub: github.com/johndoe

Or:

linkedin.com/in/jane-smith
github.com/janesmith

Or:

https://www.linkedin.com/in/bob-johnson
https://github.com/bobjohnson
```

## Expected Response

```json
{
  "linkedin_url": "https://www.linkedin.com/in/john-doe",
  "github_url": "https://github.com/johndoe"
}
```

## Troubleshooting

If URLs still return `null`:

1. **Check console logs** for extraction attempts
2. **Verify URL format** in resume matches supported patterns
3. **Check if URL is split** across multiple lines (raw text search should handle this)
4. **Verify resume parsing** is working (check other extracted fields)

## Next Steps

- Monitor extraction success rate in production
- Collect feedback on edge cases
- Consider adding OCR support for image-based resumes if needed

