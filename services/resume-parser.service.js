/**
 * Resume Parser Service
 * Free, local resume parsing with high accuracy
 * Extracts: skills, projects, experiences, achievements from PDF/DOCX files
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from PDF file
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPDF = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

/**
 * Extract text from DOCX file
 * @param {Buffer} fileBuffer - DOCX file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromDOCX = async (fileBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
};

/**
 * Extract text from resume file based on file type
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromResume = async (fileBuffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(fileBuffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await extractTextFromDOCX(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}. Only PDF and DOCX are supported.`);
  }
};

/**
 * Normalize text for processing
 * @param {string} text - Raw text
 * @returns {string} Normalized text
 */
const normalizeText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Extract skills from resume text
 * @param {string} text - Resume text
 * @returns {Array<string>} Array of skills
 */
const extractSkills = (text) => {
  const skills = new Set();
  const normalizedText = text.toLowerCase();
  
  // Common skill keywords and patterns
  const skillPatterns = [
    // Technical skills
    /\b(java|javascript|python|typescript|react|vue|angular|node\.js|express|django|flask|spring|php|ruby|go|rust|c\+\+|c#|\.net|sql|mysql|postgresql|mongodb|redis|aws|azure|gcp|docker|kubernetes|git|linux|unix|bash|shell|html|css|sass|less|bootstrap|jquery|webpack|npm|yarn)\b/gi,
    
    // Data science & ML
    /\b(machine learning|deep learning|artificial intelligence|ai|ml|nlp|computer vision|data science|data analytics|pandas|numpy|scikit-learn|tensorflow|pytorch|keras|spark|hadoop|tableau|power bi|r language|statistics|regression|classification)\b/gi,
    
    // Product & Business
    /\b(product management|product strategy|agile|scrum|kanban|lean|stakeholder management|project management|business analysis|requirements gathering|user research|wireframing|prototyping|figma|sketch|jira|confluence|roadmapping|go-to-market|gtm)\b/gi,
    
    // Soft skills
    /\b(leadership|team management|communication|presentation|negotiation|problem solving|critical thinking|collaboration|mentoring|coaching|strategic thinking|innovation)\b/gi,
    
    // Methodologies
    /\b(devops|ci\/cd|microservices|api|rest|graphql|soap|tdd|test driven development|bdd|behavior driven development|tdd|unit testing|integration testing)\b/gi,
  ];

  // Extract skills using patterns
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const skill = match.trim();
        if (skill.length > 2 && skill.length < 50) {
          // Capitalize first letter of each word
          const capitalized = skill.split(/[\s-]+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          skills.add(capitalized);
        }
      });
    }
  });

  // Look for explicit "Skills" or "Technical Skills" section
  const skillsSectionRegex = /(?:skills?|technical\s+skills?|core\s+competencies?|expertise|proficiencies?)[\s:]*\n([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+\s*:|\n[A-Z][A-Z\s]+\n|$)/i;
  const skillsMatch = text.match(skillsSectionRegex);
  
  if (skillsMatch) {
    const skillsSection = skillsMatch[1];
    // Extract skills from bullet points, commas, or line breaks
    const skillMatches = skillsSection.match(/[•\-\*]?\s*([A-Z][a-zA-Z\s&,/\-]{2,40})/g);
    if (skillMatches) {
      skillMatches.forEach(match => {
        const cleaned = match.replace(/^[•\-\*]\s*/, '').trim();
        if (cleaned.length > 2 && cleaned.length < 50) {
          // Split comma-separated skills
          if (cleaned.includes(',')) {
            cleaned.split(',').forEach(skill => {
              const trimmed = skill.trim();
              if (trimmed.length > 2) skills.add(trimmed);
            });
          } else {
            skills.add(cleaned);
          }
        }
      });
    }
  }

  // Remove duplicates and return as array (limit to top 20)
  return Array.from(skills).slice(0, 20);
};

/**
 * Extract projects from resume text
 * @param {string} text - Resume text
 * @returns {Array<Object>} Array of project objects
 */
const extractProjects = (text) => {
  const projects = [];
  
  // Look for "Projects" section with improved regex
  const projectsSectionRegex = /(?:projects?|portfolio|key\s+projects?|notable\s+projects?|personal\s+projects?|technical\s+projects?)[\s:]*\n([\s\S]*?)(?=\n\n[A-Z][a-z]+\s*:|\n[A-Z][A-Z\s]+\n|experience|education|skills|achievements|$)/i;
  const projectsMatch = text.match(projectsSectionRegex);
  
  if (projectsMatch) {
    const projectsSection = projectsMatch[1];
    const lines = projectsSection.split('\n').filter(line => line.trim().length > 0);
    
    let currentProject = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Improved project title detection - more flexible patterns
      const isProjectTitle = (
        // Pattern 1: Line starts with capital letter and looks like a title (3-80 chars)
        (line.length >= 3 && line.length <= 80 && line.match(/^[A-Z][a-zA-Z0-9\s\-&,():\/]{2,78}$/)) ||
        // Pattern 2: Bullet point followed by capitalized text
        (line.match(/^[•\-\*]\s*[A-Z][a-zA-Z0-9\s\-&,():\/]{2,78}$/)) ||
        // Pattern 3: Numbered list (1., 2., etc.)
        (line.match(/^\d+[\.\)]\s*[A-Z][a-zA-Z0-9\s\-&,():\/]{2,78}$/)) ||
        // Pattern 4: First line in section that's not a bullet
        (i === 0 && !line.match(/^[•\-\*]/) && line.length >= 5 && line.length <= 80)
      );
      
      if (isProjectTitle && !line.toLowerCase().includes('github') && !line.match(/^https?:\/\//)) {
        // If we have a previous project, save it
        if (currentProject && currentProject.name) {
          projects.push(currentProject);
        }
        
        // Start new project - clean the name
        const name = line
          .replace(/^[•\-\*]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/:$/, '')
          .trim();
        
        if (name.length >= 3 && name.length <= 80) {
          currentProject = {
            name: name,
            description: null,
            github_url: null,
            technologies: []
          };
        }
      } else if (currentProject) {
        // Check if line contains GitHub URL (various formats)
        const githubUrlPatterns = [
          /(?:github|github\.com)[\s:]*([^\s\)\]\},]+)/i,
          /https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9\-\.]+\/?[a-zA-Z0-9\-\.]*/i,
          /github\.com\/[a-zA-Z0-9\-\.]+/i,
        ];
        
        for (const pattern of githubUrlPatterns) {
          const githubUrlMatch = line.match(pattern);
          if (githubUrlMatch) {
            let githubUrl = githubUrlMatch[1] || githubUrlMatch[0];
            githubUrl = githubUrl.trim();
            
            // Clean up URL if needed
            if (!githubUrl.startsWith('http')) {
              githubUrl = githubUrl.replace(/^[:\s]+/, '');
              if (githubUrl.includes('github.com')) {
                githubUrl = githubUrl.match(/github\.com[^\s\)\]\},]*/i)?.[0] || githubUrl;
                githubUrl = githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`;
              } else {
                githubUrl = `https://github.com/${githubUrl}`;
              }
            }
            
            // Validate and clean GitHub URL - extract just profile/repo path
            const githubMatch = githubUrl.match(/https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9\-\.]+(?:\/[a-zA-Z0-9\-\.]+)?)/i);
            if (githubMatch && githubMatch[2]) {
              // If it's a repo URL, keep it; if it's just username, make it profile URL
              const pathParts = githubMatch[2].split('/');
              if (pathParts.length >= 2) {
                // It's a repo URL - keep as is
                currentProject.github_url = `https://github.com/${githubMatch[2]}`;
              } else {
                // Just username - use profile URL
                currentProject.github_url = `https://github.com/${pathParts[0]}`;
              }
            }
            break; // Found GitHub URL, move on
          }
        }
        
        // Check if line contains technologies mentioned
        const techKeywords = ['using', 'built with', 'technologies', 'tech stack', 'stack', 'tools', 'tech:'];
        if (techKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
          const techMatch = line.match(/(?:using|built with|technologies|tech stack|stack|tools|tech)[\s:]*([^\n]+)/i);
          if (techMatch) {
            const techs = techMatch[1].split(/[,\-&|]/).map(t => t.trim()).filter(t => t.length > 0);
            currentProject.technologies = techs.slice(0, 10);
          }
        }
        
        // Add to description (skip GitHub/tech lines if they're already captured)
        // But include them in description if they're part of the description context
        const isGitHubLine = line.toLowerCase().includes('github');
        const isTechLine = techKeywords.some(keyword => line.toLowerCase().includes(keyword));
        const isUrlOnly = line.match(/^https?:\/\/[^\s]+$/); // Line is just a URL
        
        if (line.length > 10 && !isUrlOnly) {
          // Include in description but mark if it's GitHub/tech related
          const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
          if (cleanLine.length > 0) {
            if (!currentProject.description) {
              currentProject.description = cleanLine;
            } else {
              // Add with proper spacing
              if (!currentProject.description.endsWith('.')) {
                currentProject.description += '. ' + cleanLine;
              } else {
                currentProject.description += ' ' + cleanLine;
              }
            }
          }
        }
      }
    }
    
    // Add last project
    if (currentProject && currentProject.name) {
      projects.push(currentProject);
    }
  }
  
  // Also look for inline project mentions with better patterns
  const projectActionVerbs = [
    'developed', 'created', 'built', 'designed', 'implemented', 'launched',
    'engineered', 'architected', 'constructed', 'devised', 'established'
  ];
  
  const projectPattern = new RegExp(
    `(?:${projectActionVerbs.join('|')})\\s+([A-Z][a-zA-Z0-9\\s\\-&,()]{5,60}?)(?:[.\n,;]|\\s+(?:using|with|for)|$)`,
    'gi'
  );
  
  const projectMentions = text.match(projectPattern);
  if (projectMentions && projects.length < 5) {
    projectMentions.slice(0, 5 - projects.length).forEach(mention => {
      const match = mention.match(new RegExp(
        `(?:${projectActionVerbs.join('|')})\\s+([A-Z][a-zA-Z0-9\\s\\-&,()]{5,60}?)(?:[.\\n,;]|\\s+(?:using|with|for)|$)`,
        'i'
      ));
      if (match && match[1]) {
        const name = match[1].trim();
        // Avoid duplicates and invalid names
        if (name.length >= 5 && name.length <= 60 &&
            !projects.some(p => p.name.toLowerCase() === name.toLowerCase()) &&
            !name.match(/^(the|a|an|this|that)\s/i)) {
          projects.push({
            name: name,
            description: mention.trim(),
            github_url: null,
            technologies: []
          });
        }
      }
    });
  }
  
  // Look for GitHub URLs in project descriptions and associate them
  projects.forEach((project, index) => {
    // Search in description for GitHub URL
    if (project.description) {
      const githubUrlMatch = project.description.match(/(?:github|github\.com)[\s:]*([^\s\)\]\},]+)/i);
      if (githubUrlMatch && !project.github_url) {
        let githubUrl = githubUrlMatch[1].trim();
        if (githubUrl.includes('github.com')) {
          githubUrl = githubUrl.match(/github\.com[^\s\)\]\},]*/i)?.[0] || githubUrl;
          githubUrl = githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`;
          if (githubUrl.match(/https?:\/\/(www\.)?github\.com\/[\w\-\.]+/i)) {
            project.github_url = githubUrl;
          }
        }
      }
    }
    
    // Clean up descriptions (limit to 500 characters)
    if (project.description && project.description.length > 500) {
      project.description = project.description.substring(0, 497) + '...';
    }
    
    // Remove null/empty fields
    if (!project.github_url) delete project.github_url;
    if (!project.technologies || project.technologies.length === 0) delete project.technologies;
  });
  
  return projects.slice(0, 5); // Limit to 5 projects
};

/**
 * Extract work experiences from resume text
 * @param {string} text - Resume text
 * @returns {Array<Object>} Array of experience objects
 */
const extractExperiences = (text) => {
  const experiences = [];
  
  // Look for "Experience" or "Work Experience" section
  const experienceSectionRegex = /(?:work\s+experience|professional\s+experience|experience|employment|career)[\s:]*\n([\s\S]*?)(?=\n\n[A-Z][a-z]+\s*:|\n[A-Z][A-Z\s]+\n|education|projects|skills|achievements|$)/i;
  const experienceMatch = text.match(experienceSectionRegex);
  
  if (experienceMatch) {
    const experienceSection = experienceMatch[1];
    
    // Split by double newlines or patterns that suggest new job entry
    const jobBlocks = experienceSection.split(/(?:\n{2,}|(?=\n[A-Z][a-zA-Z\s]+\s*[–—\-]\s*[A-Z]|(?=\n\w+\s+at\s+\w+)))/);
    
    jobBlocks.forEach(block => {
      const blockText = block.trim();
      if (blockText.length < 20) return;
      
      const experience = {
        company: null,
        position: null,
        duration: null,
        description: null
      };
      
      // Extract position and company (common patterns)
      // Pattern 1: "Position at Company" or "Position, Company"
      let match = blockText.match(/^([A-Z][a-zA-Z\s&,/\-()]{5,60}?)\s+(?:at|@|,)\s+([A-Z][a-zA-Z\s&,/\-()]{3,50})/);
      if (match) {
        experience.position = match[1].trim();
        experience.company = match[2].trim();
      }
      
      // Pattern 2: "Company - Position" or "Company | Position"
      if (!experience.position) {
        match = blockText.match(/^([A-Z][a-zA-Z\s&,/\-()]{3,50})\s*[–—\-\|]\s*([A-Z][a-zA-Z\s&,/\-()]{5,60})/);
        if (match) {
          experience.company = match[1].trim();
          experience.position = match[2].trim();
        }
      }
      
      // Extract duration (dates like "2020-2024", "Jan 2020 - Dec 2024", etc.)
      const durationMatch = blockText.match(/(\d{4}\s*[–—\-]\s*\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s*[–—\-]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{4}\s*[–—\-]\s*present|\d{4}\s*[–—\-]\s*current)/i);
      if (durationMatch) {
        experience.duration = durationMatch[1].trim();
      }
      
      // Extract description (remaining text after position/company/duration)
      const lines = blockText.split('\n').filter(line => line.trim().length > 10);
      const descriptionLines = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        // Skip lines that are clearly position/company/duration
        if (!trimmed.match(/^[A-Z][a-zA-Z\s&,/\-()]{5,60}?\s+(?:at|@|,)\s+[A-Z]/) &&
            !trimmed.match(/^[A-Z][a-zA-Z\s&,/\-()]{3,50}\s*[–—\-\|]\s*[A-Z]/) &&
            !trimmed.match(/\d{4}\s*[–—\-]\s*\d{4}/)) {
          descriptionLines.push(trimmed.replace(/^[•\-\*]\s*/, ''));
        }
      });
      
      if (descriptionLines.length > 0) {
        experience.description = descriptionLines.join(' ').trim();
        if (experience.description.length > 500) {
          experience.description = experience.description.substring(0, 497) + '...';
        }
      }
      
      // Only add if we have at least position or company
      if (experience.position || experience.company) {
        experiences.push(experience);
      }
    });
  }
  
  return experiences.slice(0, 10); // Limit to 10 experiences
};

/**
 * Extract achievements from resume text
 * @param {string} text - Resume text
 * @returns {Array<string>} Array of achievement strings
 */
const extractAchievements = (text) => {
  const achievements = new Set();
  
  // Look for "Achievements", "Awards", "Honors" section
  const achievementsSectionRegex = /(?:achievements?|awards?|honors?|recognition|accomplishments?|certifications?)[\s:]*\n([\s\S]*?)(?=\n\n[A-Z][a-z]+\s*:|\n[A-Z][A-Z\s]+\n|projects?|experience|education|skills|$)/i;
  const achievementsMatch = text.match(achievementsSectionRegex);
  
  if (achievementsMatch) {
    const achievementsSection = achievementsMatch[1];
    const lines = achievementsSection.split('\n').filter(line => line.trim().length > 5);
    
    lines.forEach(line => {
      const cleaned = line.trim().replace(/^[•\-\*]\s*/, '');
      if (cleaned.length > 5 && cleaned.length < 200) {
        achievements.add(cleaned);
      }
    });
  }
  
  // Also extract certifications from anywhere in the resume
  const certPatterns = [
    /(?:certified|certification|certificate)\s+in\s+([A-Z][a-zA-Z\s&,/\-()]{5,50})/gi,
    /([A-Z][a-zA-Z\s&,/\-()]{5,50})\s+(?:certified|certification|certificate)/gi,
    /\b(AWS|Azure|GCP|Google|Microsoft|Oracle|Salesforce|Cisco|PMP|CSM|Scrum)\s+[A-Z][a-zA-Z\s&,/\-()]{3,40}(?:certified|certification|certificate)?/gi
  ];
  
  certPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        if (cleaned.length > 5 && cleaned.length < 200) {
          achievements.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(achievements).slice(0, 10); // Limit to 10 achievements
};

/**
 * Extract aspirations/career objectives from resume text
 * @param {string} text - Resume text
 * @returns {string|null} Aspiration text
 */
const extractAspirations = (text) => {
  // Look for "Objective", "Summary", "Profile" sections
  const aspirationPatterns = [
    /(?:objective|career\s+objective|summary|professional\s+summary|profile|about)[\s:]*\n([\s\S]{10,500}?)(?=\n\n[A-Z]|experience|education|skills|$)/i
  ];
  
  for (const pattern of aspirationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const aspiration = match[1].trim().replace(/\n+/g, ' ');
      if (aspiration.length > 20 && aspiration.length < 500) {
        return aspiration;
      }
    }
  }
  
  return null;
};

/**
 * Extract bio/about me from resume text
 * @param {string} text - Resume text
 * @returns {string|null} Bio text
 */
const extractBio = (text) => {
  // Look for "Bio", "About", "About Me", "Personal Statement" sections
  const bioPatterns = [
    /(?:bio|about\s+me|about|personal\s+statement|background)[\s:]*\n([\s\S]{20,1000}?)(?=\n\n[A-Z]|experience|education|skills|projects|$)/i
  ];
  
  for (const pattern of bioPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const bio = match[1].trim().replace(/\n+/g, ' ');
      if (bio.length > 20 && bio.length < 1000) {
        return bio;
      }
    }
  }
  
  // Also check if aspirations section is actually a bio
  const aspirations = extractAspirations(text);
  if (aspirations && aspirations.length > 50) {
    return aspirations;
  }
  
  return null;
};

/**
 * Extract major/field of study from resume text
 * @param {string} text - Resume text
 * @returns {string|null} Major/field of study
 */
const extractMajor = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Look for "Education" section - more flexible regex
  const educationSectionRegex = /(?:education|academic\s+background|qualifications?|degree|university|college)[\s:]*\n([\s\S]{50,3000}?)(?=\n\n[A-Z][a-z]+\s*:|experience|skills|projects|work|achievements|$)/i;
  let educationMatch = text.match(educationSectionRegex);
  
  // If not found, try searching for education info anywhere
  if (!educationMatch) {
    // Look for degree patterns anywhere in text
    const degreeAnywherePattern = /(?:bachelor|master|phd|bs|ba|ms|ma|ph\.?d\.?)[\s\S]{0,200}/i;
    const degreeMatch = text.match(degreeAnywherePattern);
    if (degreeMatch) {
      educationMatch = { 1: degreeMatch[0] };
    }
  }
  
  if (educationMatch) {
    const educationSection = educationMatch[1];
    
    // Pattern 1: "Bachelor of Science in Computer Science" or "BS in Computer Science"
    const degreePatterns = [
      // Full degree with major
      /(?:bachelor|master|phd|doctorate|bs|ba|ms|ma|ph\.?d\.?|m\.?sc|b\.?sc|b\.?eng|m\.?eng)\s+(?:of\s+)?(?:science|arts|engineering|technology|business|computer\s+science|applied\s+science)?\s+(?:in\s+)?([A-Z][a-zA-Z\s&,/\-()]{3,80})/i,
      // "Major: Computer Science" or "Majoring in Computer Science"
      /(?:major|field\s+of\s+study|degree|studied|specialization|concentration)[\s:]+([A-Z][a-zA-Z\s&,/\-()]{3,80})/i,
      // "Computer Science major" or "Computer Science degree"
      /([A-Z][a-zA-Z\s&,/\-()]{3,80})\s+(?:major|degree|bachelor|master|phd|studies)/i,
      // Just degree type followed by major
      /(?:bachelor|master|phd|bs|ba|ms|ma)\s+(?:of\s+)?([A-Z][a-zA-Z\s&,/\-()]{3,80})/i,
    ];
    
    for (const pattern of degreePatterns) {
      const match = educationSection.match(pattern);
      if (match && match[1]) {
        let major = match[1].trim();
        // Clean up common prefixes/suffixes
        major = major.replace(/^(in|of|the)\s+/i, '');
        major = major.replace(/\s+(major|degree|bachelor|master|phd|studies|program)$/i, '');
        // Remove trailing punctuation and parenthetical content (GPA, dates, etc.)
        major = major.replace(/[.,;:]+$/, '');
        major = major.replace(/\s*\([^)]*$/, ''); // Remove opening parenthesis and everything after (e.g., "Management Information Systems (GPA")
        major = major.replace(/\s*\([^)]*\)/, ''); // Remove parenthetical content (e.g., "(GPA: 3.8)")
        major = major.trim();
        if (major.length > 3 && major.length < 100) {
          // Validate it's not just a single word that's too short
          if (major.split(/\s+/).length > 0) {
            return major;
          }
        }
      }
    }
    
    // Pattern 2: Look for common majors in the education section (expanded list)
    const commonMajors = [
      'Computer Science', 'Software Engineering', 'Information Technology', 'Data Science',
      'Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
      'Business Administration', 'Business Management', 'Marketing', 'Finance', 'Economics', 'Accounting',
      'Mathematics', 'Applied Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biology',
      'Psychology', 'Sociology', 'Political Science', 'History', 'International Relations',
      'English', 'Literature', 'Communications', 'Journalism', 'Media Studies',
      'Biomedical Engineering', 'Chemical Engineering', 'Aerospace Engineering',
      'Information Systems', 'Cybersecurity', 'Artificial Intelligence', 'Machine Learning'
    ];
    
    for (const major of commonMajors) {
      const majorRegex = new RegExp(`\\b${major.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (educationSection.match(majorRegex)) {
        return major;
      }
    }
    
    // Pattern 3: Extract from lines that look like degree information
    const lines = educationSection.split('\n').filter(line => line.trim().length > 5);
    for (const line of lines) {
      // Look for capitalized phrases that might be majors
      const majorCandidates = line.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g);
      if (majorCandidates) {
        for (const candidate of majorCandidates) {
          // Check if it's a known major or looks like one
          if (candidate.length > 5 && candidate.length < 60 && 
              !candidate.match(/^(Bachelor|Master|PhD|BS|BA|MS|MA|University|College|Expected|Graduated)/i)) {
            // Check against common majors (case-insensitive)
            for (const commonMajor of commonMajors) {
              if (candidate.toLowerCase().includes(commonMajor.toLowerCase()) || 
                  commonMajor.toLowerCase().includes(candidate.toLowerCase())) {
                return commonMajor;
              }
            }
            // If it looks like a major (2+ words, capitalized), return it
            if (candidate.split(/\s+/).length >= 2) {
              return candidate;
            }
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Extract graduation year from resume text
 * @param {string} text - Resume text
 * @returns {number|null} Graduation year
 */
const extractGradYear = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Look for "Education" section - more flexible
  const educationSectionRegex = /(?:education|academic\s+background|qualifications?|degree|university|college)[\s:]*\n([\s\S]{50,3000}?)(?=\n\n[A-Z][a-z]+\s*:|experience|skills|projects|work|achievements|$)/i;
  let educationMatch = text.match(educationSectionRegex);
  
  // If not found, search entire text
  if (!educationMatch) {
    educationMatch = { 1: text };
  }
  
  const educationSection = educationMatch[1];
  
  // Pattern 1: "Expected: 2025" or "Graduated: 2024" or "Expected Graduation: 2025"
  const explicitYearPatterns = [
    /(?:expected|graduated|graduation|completed|degree|class\s+of|will\s+graduate)[\s:]+(\d{4})/i,
    /(?:expected|graduated|graduation|completed)[\s:]+(?:may|june|december|spring|fall|winter|summer)?[\s,]*(\d{4})/i,
    /(?:graduating|graduate)[\s:]+(?:in|on)?[\s,]*(\d{4})/i,
  ];
  
  for (const pattern of explicitYearPatterns) {
    const match = educationSection.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= 2100) {
        return year;
      }
    }
  }
  
  // Pattern 2: Date ranges "2020 - 2024" or "2020-2024" (take end year as graduation)
  const dateRangePattern = /(\d{4})\s*[–—\-]\s*(\d{4})/;
  const rangeMatch = educationSection.match(dateRangePattern);
  if (rangeMatch && rangeMatch[2]) {
    const year = parseInt(rangeMatch[2], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }
  
  // Pattern 3: "2020 - Present" or "2020-Present" (ongoing, likely current student)
  const ongoingPattern = /(\d{4})\s*[–—\-]\s*(?:present|current|now|ongoing)/i;
  const ongoingMatch = educationSection.match(ongoingPattern);
  if (ongoingMatch && ongoingMatch[1]) {
    const startYear = parseInt(ongoingMatch[1], 10);
    if (startYear >= 1900 && startYear <= 2100) {
      // If it's recent (within last 5 years), likely current student - estimate grad year
      const currentYear = new Date().getFullYear();
      if (startYear >= currentYear - 5) {
        // Estimate graduation as 4 years from start (typical bachelor's)
        const estimatedGrad = startYear + 4;
        if (estimatedGrad <= currentYear + 2) {
          return estimatedGrad;
        }
      }
    }
  }
  
  // Pattern 4: Find all 4-digit years in education section and pick the most recent/future one
  const allYears = educationSection.match(/\b(19\d{2}|20[0-3]\d)\b/g);
  if (allYears && allYears.length > 0) {
    const years = allYears.map(y => parseInt(y, 10)).filter(y => y >= 1900 && y <= 2100);
    if (years.length > 0) {
      // Sort and take the most recent/future year (likely graduation year)
      years.sort((a, b) => b - a);
      const currentYear = new Date().getFullYear();
      // Prefer future years (expected graduation) or recent past (just graduated)
      const futureYears = years.filter(y => y >= currentYear);
      if (futureYears.length > 0) {
        return futureYears[0]; // Most recent future year
      }
      // If no future years, take most recent past year
      return years[0];
    }
  }
  
  // Pattern 5: Search entire text for graduation-related years
  const fullTextYearPattern = /(?:graduated|graduation|expected\s+graduation|class\s+of|will\s+graduate)[\s:]+(\d{4})/i;
  const fullTextMatch = text.match(fullTextYearPattern);
  if (fullTextMatch && fullTextMatch[1]) {
    const year = parseInt(fullTextMatch[1], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }
  
  return null;
};

/**
 * Extract relevant coursework from resume text
 * @param {string} text - Resume text
 * @returns {Array<string>} Array of course names
 */
const extractRelevantCoursework = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const coursework = new Set();
  
  // Look for "Relevant Coursework", "Coursework", "Courses" section - more flexible
  const courseworkSectionRegex = /(?:relevant\s+coursework|coursework|courses|key\s+courses|selected\s+courses|core\s+courses|technical\s+courses)[\s:]*\n([\s\S]{20,3000}?)(?=\n\n[A-Z][a-z]+\s*:|experience|education|skills|projects|work|achievements|$)/i;
  const courseworkMatch = text.match(courseworkSectionRegex);
  
  if (courseworkMatch) {
    const courseworkSection = courseworkMatch[1];
    const lines = courseworkSection.split('\n').filter(line => line.trim().length > 3);
    
    lines.forEach(line => {
      let cleaned = line.trim().replace(/^[•\-\*]\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '');
      
      // Skip lines that are clearly not courses
      if (cleaned.match(/^(and|or|the|a|an|including|such\s+as)\s/i) || 
          cleaned.length < 5 || 
          cleaned.length > 150) {
        return;
      }
      
      // Pattern 1: Course code + name "CS 101: Introduction to Programming"
      const courseCodePattern = /([A-Z]{2,6}\s*\d{2,4}[\w]*[\s:]+[A-Z][a-zA-Z\s&,/\-()]{5,100})/g;
      const codeMatches = cleaned.match(courseCodePattern);
      if (codeMatches) {
        codeMatches.forEach(match => {
          const course = match.trim().replace(/[.,;]+$/, '');
          if (course.length > 8 && course.length < 120) {
            coursework.add(course);
          }
        });
        return; // Found course code, skip other patterns for this line
      }
      
      // Pattern 2: Course name without code "Introduction to Programming"
      // Look for capitalized phrases that look like course names
      if (cleaned.match(/^[A-Z]/) && cleaned.split(/\s+/).length >= 2) {
        // Check if it contains course-like keywords
        const courseKeywords = [
          'introduction', 'advanced', 'fundamentals', 'principles', 'systems',
          'data structures', 'algorithms', 'database', 'software', 'engineering',
          'machine learning', 'artificial intelligence', 'networks', 'security',
          'web development', 'mobile', 'cloud', 'distributed', 'operating'
        ];
        
        const lowerCleaned = cleaned.toLowerCase();
        const hasCourseKeyword = courseKeywords.some(keyword => lowerCleaned.includes(keyword));
        
        if (hasCourseKeyword || cleaned.length > 10) {
          const course = cleaned.replace(/[.,;]+$/, '');
          if (course.length > 5 && course.length < 120) {
            coursework.add(course);
          }
        }
      }
      
      // Pattern 3: Comma-separated courses in a single line
      if (cleaned.includes(',')) {
        const courses = cleaned.split(',').map(c => c.trim()).filter(c => c.length > 5 && c.length < 100);
        courses.forEach(course => {
          if (course.match(/^[A-Z]/)) {
            coursework.add(course.replace(/[.,;]+$/, ''));
          }
        });
      }
    });
  }
  
  // Also look for courses mentioned in education section
  const educationSectionRegex = /(?:education|academic\s+background)[\s:]*\n([\s\S]{50,3000}?)(?=\n\n[A-Z][a-z]+\s*:|experience|skills|projects|work|achievements|$)/i;
  const educationMatch = text.match(educationSectionRegex);
  
  if (educationMatch && coursework.size < 10) {
    const educationSection = educationMatch[1];
    const lines = educationSection.split('\n').filter(line => line.trim().length > 5);
    
    lines.forEach(line => {
      const cleaned = line.trim();
      
      // Look for course codes or course-like patterns
      const coursePatterns = [
        /\b([A-Z]{2,6}\s*\d{2,4}[\w]*[\s:]+[A-Z][a-zA-Z\s&,/\-()]{5,80})/g,
        /\b(Introduction\s+to|Advanced\s+[A-Z][a-z]+|Data\s+Structures|Algorithms|Database|Software\s+Engineering|Machine\s+Learning)[\s\S]{0,50}/gi,
      ];
      
      for (const pattern of coursePatterns) {
        const matches = cleaned.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const course = match.trim().replace(/[.,;]+$/, '');
            if (course.length > 5 && course.length < 120) {
              coursework.add(course);
            }
          });
        }
      }
    });
  }
  
  // Also search for common course patterns anywhere in text
  if (coursework.size < 5) {
    const commonCoursePatterns = [
      /\b([A-Z]{2,6}\s*\d{2,4}[\w]*)\b/g, // Course codes like CS101, CS 101, CS101A
      /\b(Data\s+Structures|Algorithms|Database\s+Systems|Operating\s+Systems|Computer\s+Networks|Software\s+Engineering|Machine\s+Learning|Artificial\s+Intelligence)\b/gi,
    ];
    
    for (const pattern of commonCoursePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const course = match.trim();
          if (course.length > 2 && course.length < 100) {
            coursework.add(course);
          }
        });
      }
    }
  }
  
  return Array.from(coursework).slice(0, 15); // Limit to 15 courses
};

/**
 * Extract LinkedIn URL from resume text
 * @param {string} text - Resume text
 * @returns {string|null} LinkedIn URL
 */
const extractLinkedInUrl = (text) => {
  if (!text || typeof text !== 'string' || text.length < 10) {
    return null;
  }

  // Remove all line breaks and normalize whitespace for easier matching
  const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
  
  // SUPER SIMPLE APPROACH: Find any occurrence of linkedin.com
  const linkedinIndex = normalizedText.indexOf('linkedin.com');
  
  if (linkedinIndex === -1) {
    return null;
  }
  
  // Extract context around the linkedin.com occurrence (200 chars before and after)
  const start = Math.max(0, linkedinIndex - 200);
  const end = Math.min(text.length, linkedinIndex + 200);
  const context = text.substring(start, end);
  
  // Try multiple patterns on the context
  const patterns = [
    // Full URL with protocol
    /(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|pub|profile)\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
    // Just the domain part
    /((?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub|profile)\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
    // Very flexible - just linkedin.com/in/username
    /(linkedin\.com\/(?:in|pub|profile)\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
  ];
  
  for (const pattern of patterns) {
    const matches = context.match(pattern);
    if (matches && matches[1]) {
      let url = matches[1].trim();
      
      // Clean trailing punctuation
      url = url.replace(/[.,;:!?)\]}\s\/]+$/g, '');
      
      // Ensure it starts with http
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Extract just the profile part (remove query params, fragments)
      const profileMatch = url.match(/(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|pub|profile)\/[a-zA-Z0-9\-]+)/i);
      if (profileMatch && profileMatch[1]) {
        const finalUrl = profileMatch[1];
        // Validate it looks like a LinkedIn URL
        if (finalUrl.length > 20 && finalUrl.length < 200) {
          return finalUrl;
        }
      }
    }
  }
  
  // BRUTE FORCE: Find "linkedin.com" and try to extract URL around it
  const linkedinMatch = context.match(/([a-zA-Z0-9\-\.:/\s]*linkedin\.com\/[a-zA-Z0-9\-\./]+)/i);
  if (linkedinMatch && linkedinMatch[1]) {
    let url = linkedinMatch[1].trim();
    // Clean up
    url = url.replace(/^[^\w]*/, ''); // Remove leading non-word chars
    url = url.replace(/[.,;:!?)\]}\s\/]+$/g, ''); // Remove trailing punctuation
    
    // Extract the linkedin.com part
    const domainMatch = url.match(/linkedin\.com\/(?:in|pub|profile)\/[a-zA-Z0-9\-]+/i);
    if (domainMatch) {
      const finalUrl = 'https://' + domainMatch[0];
      if (finalUrl.length > 20 && finalUrl.length < 200) {
        return finalUrl;
      }
    }
  }
  
  return null;
};

/**
 * Extract GitHub URL from resume text
 * @param {string} text - Resume text
 * @returns {string|null} GitHub URL
 */
const extractGitHubUrl = (text) => {
  if (!text || typeof text !== 'string' || text.length < 10) {
    return null;
  }

  // Remove all line breaks and normalize whitespace for easier matching
  const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
  
  // SUPER SIMPLE APPROACH: Find any occurrence of github.com
  const githubIndex = normalizedText.indexOf('github.com');
  
  if (githubIndex === -1) {
    return null;
  }
  
  // Extract context around the github.com occurrence (200 chars before and after)
  const start = Math.max(0, githubIndex - 200);
  const end = Math.min(text.length, githubIndex + 200);
  const context = text.substring(start, end);
  
  // Try multiple patterns on the context
  const patterns = [
    // Full URL with protocol
    /(https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
    // Just the domain part
    /((?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
    // Very flexible - just github.com/username
    /(github\.com\/[a-zA-Z0-9\-]+(?:\/[a-zA-Z0-9\-]*)?)/i,
  ];
  
  for (const pattern of patterns) {
    const matches = context.match(pattern);
    if (matches && matches[1]) {
      let url = matches[1].trim();
      
      // Clean trailing punctuation
      url = url.replace(/[.,;:!?)\]}\s\/]+$/g, '');
      
      // Ensure it starts with http
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Extract username (first part after github.com/)
      const usernameMatch = url.match(/https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9\-]+)/i);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        // Return profile URL (just username, not repo)
        const finalUrl = `https://github.com/${username}`;
        // Validate it looks like a GitHub URL
        if (finalUrl.length > 15 && finalUrl.length < 200 && username.length > 0) {
          return finalUrl;
        }
      }
    }
  }
  
  // BRUTE FORCE: Find "github.com" and try to extract URL around it
  const githubMatch = context.match(/([a-zA-Z0-9\-\.:/\s]*github\.com\/[a-zA-Z0-9\-\./]+)/i);
  if (githubMatch && githubMatch[1]) {
    let url = githubMatch[1].trim();
    // Clean up
    url = url.replace(/^[^\w]*/, ''); // Remove leading non-word chars
    url = url.replace(/[.,;:!?)\]}\s\/]+$/g, ''); // Remove trailing punctuation
    
    // Extract the github.com part and username
    const domainMatch = url.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
    if (domainMatch && domainMatch[1]) {
      const username = domainMatch[1];
      const finalUrl = `https://github.com/${username}`;
      if (finalUrl.length > 15 && finalUrl.length < 200 && username.length > 0) {
        return finalUrl;
      }
    }
  }
  
  return null;
};

/**
 * Parse resume file and extract structured data
 * @param {Buffer} fileBuffer - Resume file buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} Parsed resume data
 */
const parseResume = async (fileBuffer, mimeType) => {
  try {
    console.log('Starting resume parsing...', { mimeType, fileSize: fileBuffer.length });
    
    // Extract text from file
    const rawText = await extractTextFromResume(fileBuffer, mimeType);
    const text = normalizeText(rawText);
    
    console.log('Text extracted, length:', text.length);
    console.log('Raw text sample (first 500 chars):', rawText.substring(0, 500));
    
    // Extract structured data
    const skills = extractSkills(text);
    const projects = extractProjects(text);
    const experiences = extractExperiences(text);
    const achievements = extractAchievements(text);
    const aspirations = extractAspirations(text);
    const bio = extractBio(text);
    const major = extractMajor(text);
    const gradYear = extractGradYear(text);
    const relevantCoursework = extractRelevantCoursework(text);
    
    // Extract LinkedIn and GitHub URLs - try both raw and normalized text
    // URLs might be broken across lines in raw text, so we search both
    console.log('🔍 Extracting LinkedIn and GitHub URLs...');
    console.log('   Searching in raw text (length:', rawText.length, 'chars)');
    console.log('   Searching in normalized text (length:', text.length, 'chars)');
    
    // Try raw text first (preserves line breaks which might be part of URL)
    let linkedinUrl = extractLinkedInUrl(rawText);
    let githubUrl = extractGitHubUrl(rawText);
    
    // If not found in raw, try normalized
    if (!linkedinUrl) {
      console.log('   LinkedIn not found in raw text, trying normalized...');
      linkedinUrl = extractLinkedInUrl(text);
    }
    
    if (!githubUrl) {
      console.log('   GitHub not found in raw text, trying normalized...');
      githubUrl = extractGitHubUrl(text);
    }
    
    // Debug: Show what we're searching for
    const hasLinkedInInText = rawText.toLowerCase().includes('linkedin') || text.toLowerCase().includes('linkedin');
    const hasGitHubInText = rawText.toLowerCase().includes('github') || text.toLowerCase().includes('github');
    
    console.log('   Found "linkedin" in text:', hasLinkedInInText);
    console.log('   Found "github" in text:', hasGitHubInText);
    
    if (linkedinUrl) {
      console.log('✅ LinkedIn URL extracted:', linkedinUrl);
    } else {
      console.log('⚠️ LinkedIn URL not found in resume');
      if (hasLinkedInInText) {
        console.log('   ⚠️ WARNING: "linkedin" found in text but URL extraction failed!');
        // Show snippet around linkedin mention for debugging
        const linkedinPos = (rawText.toLowerCase().indexOf('linkedin') || text.toLowerCase().indexOf('linkedin')) || -1;
        if (linkedinPos > -1) {
          const snippet = (rawText.length > linkedinPos ? rawText : text).substring(Math.max(0, linkedinPos - 50), linkedinPos + 100);
          console.log('   Context around "linkedin":', snippet);
        }
      }
    }
    
    if (githubUrl) {
      console.log('✅ GitHub URL extracted:', githubUrl);
    } else {
      console.log('⚠️ GitHub URL not found in resume');
      if (hasGitHubInText) {
        console.log('   ⚠️ WARNING: "github" found in text but URL extraction failed!');
      }
    }
    
    const result = {
      skills: skills.length > 0 ? skills : [],
      projects: projects.length > 0 ? projects : [],
      experiences: experiences.length > 0 ? experiences : [],
      achievements: achievements.length > 0 ? achievements : [],
      aspirations: aspirations || null,
      bio: bio || null,
      major: major || null,
      grad_year: gradYear || null,
      relevant_coursework: relevantCoursework.length > 0 ? relevantCoursework : [],
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
    };
    
    // Debug extraction of new fields
    console.log('🔍 Extracting Major, Grad Year, and Coursework...');
    if (result.major) {
      console.log('✅ Major extracted:', result.major);
    } else {
      console.log('⚠️ Major not found in resume');
    }
    
    if (result.grad_year) {
      console.log('✅ Graduation year extracted:', result.grad_year);
    } else {
      console.log('⚠️ Graduation year not found in resume');
    }
    
    if (result.relevant_coursework.length > 0) {
      console.log('✅ Relevant coursework extracted:', result.relevant_coursework.length, 'courses');
      console.log('   Courses:', result.relevant_coursework.slice(0, 5).join(', '));
    } else {
      console.log('⚠️ Relevant coursework not found in resume');
    }
    
    console.log('Resume parsing complete:', {
      skillsCount: result.skills.length,
      projectsCount: result.projects.length,
      experiencesCount: result.experiences.length,
      achievementsCount: result.achievements.length,
      hasAspirations: !!result.aspirations,
      hasBio: !!result.bio,
      hasMajor: !!result.major,
      major: result.major,
      hasGradYear: !!result.grad_year,
      gradYear: result.grad_year,
      courseworkCount: result.relevant_coursework.length,
      coursework: result.relevant_coursework.slice(0, 5),
      hasLinkedIn: !!result.linkedin_url,
      hasGitHub: !!result.github_url,
      linkedinUrl: result.linkedin_url,
      githubUrl: result.github_url,
    });
    
    return result;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

module.exports = {
  parseResume,
  extractTextFromResume,
};

