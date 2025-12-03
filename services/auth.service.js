const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { API_GATEWAY_UPLOAD_URL, API_GATEWAY_DYNAMODB_URL } = require('../config/aws');
const userRepository = require('../repositories/user.repository');
const { parseResume } = require('./resume-parser.service');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Auth Service
 * Handles business logic for authentication (signup and login)
 */

/**
 * Upload file to S3 via API Gateway → Lambda
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} S3 URL of uploaded file
 */
const uploadResumeToS3 = async (fileBuffer, fileName, mimeType) => {
  if (!API_GATEWAY_UPLOAD_URL) {
    throw new Error(
      'API Gateway upload URL is not configured. ' +
      'Please set API_GATEWAY_UPLOAD_URL in your .env file. ' +
      'Example: API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload'
    );
  }
  
  // Validate URL format
  try {
    const url = new URL(API_GATEWAY_UPLOAD_URL);
    if (!url.hostname.includes('execute-api')) {
      console.warn('Warning: API Gateway URL does not appear to be a valid API Gateway endpoint');
    }
    console.log(`Uploading resume to API Gateway: ${url.origin}${url.pathname}`);
  } catch (urlError) {
    throw new Error(
      `Invalid API Gateway URL format: ${API_GATEWAY_UPLOAD_URL}. ` +
      'Expected format: https://xxxxx.execute-api.region.amazonaws.com/stage/upload'
    );
  }

  try {
    // Create FormData for multipart request
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Append file buffer with metadata
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    // Send file to API Gateway
    const response = await axios.post(API_GATEWAY_UPLOAD_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000, // 30 second timeout
    });

    // Lambda returns: { "url": "<s3-url>" }
    console.log('Upload response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      hasUrl: !!(response.data && response.data.url),
    });
    
    if (response.data && response.data.url) {
      const s3Url = response.data.url;
      console.log('✅ S3 URL extracted from response:', s3Url);
      return s3Url;
    } else {
      console.error('❌ Invalid response from upload service:', {
        responseData: response.data,
        expectedFormat: '{ "url": "<s3-url>" }',
      });
      throw new Error(`Invalid response from upload service. Expected { "url": "<s3-url>" }, got: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('API Gateway upload error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null,
      request: error.request ? {
        path: error.config?.url,
        method: error.config?.method
      } : null
    });
    
    // Handle axios errors
    if (error.response) {
      // API Gateway/Lambda returned an error
      const status = error.response.status;
      const responseData = error.response.data;
      
      // Handle specific API Gateway errors
      if (status === 403 || status === 404) {
        // 403/404 from API Gateway usually means "Missing Authentication Token" or wrong endpoint
        const errorMessage = typeof responseData === 'string' 
          ? responseData 
          : (responseData?.message || responseData?.error || responseData?.errorMessage || 'API Gateway error');
        
        // Provide helpful diagnostic message
        if (errorMessage.includes('Missing Authentication Token') || status === 404) {
          throw new Error(
            `API Gateway endpoint not found or misconfigured. ` +
            `Please verify: 1) API Gateway URL is correct (${API_GATEWAY_UPLOAD_URL}), ` +
            `2) API Gateway is deployed, 3) Method (POST) exists on /upload resource, ` +
            `4) Authorization is set to "None" in Method Request settings. ` +
            `Original error: ${errorMessage}`
          );
        }
        
        throw new Error(errorMessage);
      }
      
      // Other API Gateway/Lambda errors
      const errorMessage = typeof responseData === 'string' 
        ? responseData 
        : (responseData?.message || responseData?.error || responseData?.errorMessage || 'Failed to upload resume');
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(
        `Upload service is unavailable. ` +
        `Please check: 1) API Gateway URL is correct (${API_GATEWAY_UPLOAD_URL}), ` +
        `2) API Gateway is deployed and accessible, 3) Network connectivity.`
      );
    } else {
      // Error setting up the request
      throw new Error('Failed to upload resume: ' + error.message);
    }
  }
};

/**
 * Save or update alumni profile in DynamoDB
 * @param {number} userId - User ID (integer)
 * @param {Object} profileData - Extended profile data
 * @returns {Promise<Object>} Saved profile data
 */
const saveAlumniProfile = async (userId, profileData) => {
  if (!API_GATEWAY_DYNAMODB_URL) {
    throw new Error(
      'API Gateway DynamoDB URL is not configured. ' +
      'Please set API_GATEWAY_DYNAMODB_URL in your .env file.'
    );
  }

  try {
    // Ensure userId is sent as a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
    
    const response = await axios.post(API_GATEWAY_DYNAMODB_URL, {
      operation: 'putAlumniProfile',
      userId: numericUserId,
      profileData: profileData,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.error || 'Failed to save alumni profile');
    }
  } catch (error) {
    console.error('DynamoDB save error:', error);
    if (error.response) {
      const errorMessage = typeof error.response.data === 'string' 
        ? error.response.data 
        : (error.response.data?.message || error.response.data?.error || 'Failed to save profile');
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('DynamoDB service is unavailable');
    } else {
      throw new Error('Failed to save profile: ' + error.message);
    }
  }
};

/**
 * Get alumni profile from DynamoDB
 * @param {number} userId - User ID (integer)
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
const getAlumniProfile = async (userId) => {
  if (!API_GATEWAY_DYNAMODB_URL) {
    throw new Error(
      'API Gateway DynamoDB URL is not configured. ' +
      'Please set API_GATEWAY_DYNAMODB_URL in your .env file.'
    );
  }

  try {
    // Ensure userId is sent as a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
    
    if (isNaN(numericUserId)) {
      console.error(`Invalid userId for getAlumniProfile: ${userId} (type: ${typeof userId})`);
      return null;
    }
    
    console.log(`Fetching alumni profile for userId: ${numericUserId} from ${API_GATEWAY_DYNAMODB_URL}`);
    
    const response = await axios.post(API_GATEWAY_DYNAMODB_URL, {
      operation: 'getAlumniProfile',
      userId: numericUserId,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Log response for debugging
    console.log(`DynamoDB response for userId ${numericUserId}:`, {
      status: response.status,
      hasData: !!response.data,
      success: response.data?.success,
      hasDataField: !!response.data?.data,
      dataType: typeof response.data?.data,
    });

    // Handle different response formats
    if (response.data) {
      // Check if response is wrapped in body (API Gateway format)
      let responseData = response.data;
      if (responseData.body && typeof responseData.body === 'string') {
        try {
          responseData = JSON.parse(responseData.body);
        } catch (e) {
          console.error(`Failed to parse response.body for userId ${numericUserId}:`, e);
        }
      }
      
      if (responseData.success && responseData.data !== null && responseData.data !== undefined) {
        console.log(`Successfully fetched profile for userId ${numericUserId}, has data:`, {
          hasSkills: !!responseData.data.skills,
          hasAspirations: !!responseData.data.aspirations,
          hasProjects: !!responseData.data.projects,
          hasExperiences: !!responseData.data.experiences,
        });
        return responseData.data;
      } else if (responseData.success && (responseData.data === null || responseData.data === undefined)) {
        // Profile not found (this is expected for users without profiles)
        console.log(`Profile not found for userId ${numericUserId} (this is normal if user hasn't created a profile)`);
        return null;
      } else {
        // Response indicates failure
        console.warn(`DynamoDB response indicates failure for userId ${numericUserId}:`, responseData);
        return null;
      }
    } else {
      console.warn(`No data in response for userId ${numericUserId}`);
      return null;
    }
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // API Gateway/Lambda returned an error response
      const status = error.response.status;
      const responseData = error.response.data;
      
      console.error(`DynamoDB API error for userId ${userId}:`, {
        status,
        statusText: error.response.statusText,
        data: responseData,
        url: API_GATEWAY_DYNAMODB_URL,
      });
      
      // Return null for 404 (profile not found) - this is expected
      if (status === 404) {
        console.log(`Profile not found for userId ${userId} (404)`);
        return null;
      }
      
      // Log 500 errors but still return null to allow system to continue
      if (status === 500) {
        console.error(`DynamoDB server error (500) for userId ${userId}, returning null profile`);
        return null;
      }
      
      // For other HTTP errors, log and return null
      console.error(`DynamoDB HTTP error (${status}) for userId ${userId}, returning null profile`);
      return null;
    } else if (error.request) {
      // Request was made but no response received
      console.error(`DynamoDB request error for userId ${userId}:`, {
        message: error.message,
        code: error.code,
        url: API_GATEWAY_DYNAMODB_URL,
      });
      return null;
    } else {
      // Error setting up the request
      console.error(`DynamoDB setup error for userId ${userId}:`, error.message);
      return null;
    }
  }
};

/**
 * Validate signup data
 * @param {Object} userData - User signup data
 * @param {Object} file - Uploaded file (optional)
 * @throws {Error} If validation fails
 */
const validateSignupData = (userData, file) => {
  const { email, name, password, contact, willing_to_be_mentor, mentor_capacity } = userData;

  // Required fields validation
  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }

  if (!name || !name.trim()) {
    throw new Error('Name is required');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate mentor_capacity if willing_to_be_mentor is yes
  if (willing_to_be_mentor === 'yes' || willing_to_be_mentor === true) {
    if (!mentor_capacity || isNaN(mentor_capacity) || parseInt(mentor_capacity) <= 0) {
      throw new Error('mentor_capacity is required and must be a positive integer when willing_to_be_mentor is yes');
    }
  }

  // File validation (if provided)
  if (file) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Resume file is empty');
    }
  }
};

/**
 * Sign up a new user (alumni/industry)
 * @param {Object} userData - User signup data (includes both RDS and DynamoDB fields)
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Created user object and token (merged from RDS + DynamoDB)
 */
const signup = async (userData, file) => {
  try {
    // Validate input data
    validateSignupData(userData, file);

    // Check if email already exists
    const existingUser = await userRepository.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Parse resume if provided and extract structured data
    let parsedResumeData = {
      skills: [],
      projects: [],
      experiences: [],
      achievements: [],
      aspirations: null,
      bio: null,
      major: null,
      grad_year: null,
      relevant_coursework: [],
      linkedin_url: null,
      github_url: null,
      contact: null,
      location: null,
    };
    
    let resumeUrl = null;
    if (file) {
      console.log('Resume file received:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.buffer?.length || 0,
        hasBuffer: !!file.buffer,
      });
      
      // Parse resume to extract structured data
      try {
        console.log('📄 Parsing resume to extract skills, projects, experiences, achievements...');
        parsedResumeData = await parseResume(file.buffer, file.mimetype);
        console.log('✅ Resume parsed successfully:', {
          skillsCount: parsedResumeData.skills?.length || 0,
          projectsCount: parsedResumeData.projects?.length || 0,
          experiencesCount: parsedResumeData.experiences?.length || 0,
          achievementsCount: parsedResumeData.achievements?.length || 0,
          hasAspirations: !!parsedResumeData.aspirations,
          linkedinUrl: parsedResumeData.linkedin_url || 'Not found',
          githubUrl: parsedResumeData.github_url || 'Not found',
          contact: parsedResumeData.contact || 'Not found',
          location: parsedResumeData.location || 'Not found',
        });
      } catch (parseError) {
        console.error('⚠️ Failed to parse resume, continuing with signup:', {
          error: parseError.message,
        });
        // Continue signup even if parsing fails - user may have provided data manually
      }
      
      // Upload resume to S3 if provided
      // Check if API Gateway URL is configured
      if (!API_GATEWAY_UPLOAD_URL) {
        console.warn('⚠️ API_GATEWAY_UPLOAD_URL is not configured - resume will not be uploaded to S3');
        console.warn('   Resume parsing was successful, but file will not be stored in S3');
      } else {
        console.log('✅ API_GATEWAY_UPLOAD_URL is configured:', API_GATEWAY_UPLOAD_URL);
        
        try {
          console.log('📤 Uploading resume to S3 via API Gateway...');
          resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
          
          if (resumeUrl) {
            console.log('✅ Resume uploaded successfully to S3:', resumeUrl);
          } else {
            console.error('❌ Upload function returned null/undefined URL');
          }
        } catch (uploadError) {
          console.error('⚠️ Failed to upload resume to S3 (signup will continue):', {
            error: uploadError.message,
          });
          // Don't fail signup if resume upload fails
          // resumeUrl will remain null, but parsed data is already extracted
        }
      }
    } else {
      console.log('No resume file provided in signup request');
    }

    // Split data: RDS (atomic data) vs DynamoDB (profile data)
    const {
      // RDS fields (atomic data + willingness flags)
      email,
      name,
      contact,
      linkedin_url,
      major,
      grad_year,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
      // DynamoDB fields (profile data)
      skills,
      aspirations,
      bio,
      relevant_coursework,
      parsed_resume,
      projects,
      experiences,
      achievements,
      location,
    } = userData;

    // Merge LinkedIn URL - manual input takes precedence over parsed
    // Note: LinkedIn URL will be stored in DynamoDB profile (users table doesn't have linkedin_url field)
    const mergedLinkedInUrl = linkedin_url?.trim() || parsedResumeData.linkedin_url || null;

    // Merge contact - manual input takes precedence over parsed (stored in RDS)
    const mergedContact = (contact !== undefined && contact !== null && contact?.trim())
      ? contact.trim()
      : (parsedResumeData.contact || null);

    // Log contact being stored
    console.log('📝 Storing contact in RDS:', {
      hasContact: !!mergedContact,
      contact: mergedContact || 'Not provided',
      source: {
        contactFromResume: !!parsedResumeData.contact,
        contactFromManual: contact !== undefined && contact !== null && contact?.trim(),
      },
    });

    // Prepare RDS data (atomic fields + willingness flags)
    const rdsData = {
      email,
      name,
      password: hashedPassword,
      contact: mergedContact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
    };

    // Create user in RDS PostgreSQL
    const newUser = await userRepository.createUser(rdsData);

    // Merge manually provided data with parsed resume data
    // Manually provided data takes precedence over parsed data
    const mergedSkills = skills !== undefined 
      ? (Array.isArray(skills) ? skills : (typeof skills === 'string' ? JSON.parse(skills) : []))
      : (parsedResumeData.skills || []);
    
    const mergedAspirations = aspirations !== undefined && aspirations?.trim()
      ? aspirations.trim()
      : (parsedResumeData.aspirations || null);
    
    const mergedBio = bio !== undefined && bio?.trim()
      ? bio.trim()
      : (parsedResumeData.bio || null);
    
    const mergedMajor = major !== undefined && major?.trim()
      ? major.trim()
      : (parsedResumeData.major || null);
    
    const mergedGradYear = grad_year !== undefined
      ? (typeof grad_year === 'number' ? grad_year : parseInt(grad_year))
      : (parsedResumeData.grad_year || null);
    
    const mergedRelevantCoursework = relevant_coursework !== undefined
      ? (Array.isArray(relevant_coursework) ? relevant_coursework : (typeof relevant_coursework === 'string' ? JSON.parse(relevant_coursework) : []))
      : (parsedResumeData.relevant_coursework || []);
    
    const mergedProjects = projects !== undefined
      ? (Array.isArray(projects) ? projects : (typeof projects === 'string' ? JSON.parse(projects) : []))
      : (parsedResumeData.projects || []);
    
    const mergedExperiences = experiences !== undefined
      ? (Array.isArray(experiences) ? experiences : (typeof experiences === 'string' ? JSON.parse(experiences) : []))
      : (parsedResumeData.experiences || []);
    
    const mergedAchievements = achievements !== undefined
      ? (Array.isArray(achievements) ? achievements : (typeof achievements === 'string' ? JSON.parse(achievements) : []))
      : (parsedResumeData.achievements || []);

    // Merge location - manual input takes precedence over parsed (stored in DynamoDB)
    const mergedLocation = (location !== undefined && location !== null && location?.trim())
      ? location.trim()
      : (parsedResumeData.location || null);

    // Log location being stored
    console.log('📝 Storing location in DynamoDB:', {
      hasLocation: !!mergedLocation,
      location: mergedLocation || 'Not provided',
      source: {
        locationFromResume: !!parsedResumeData.location,
        locationFromManual: location !== undefined && location !== null && location?.trim(),
      },
    });

    // Prepare DynamoDB profile data
    // Include parsed resume data structure for reference
    // IMPORTANT: Include linkedin_url, github_url, and location in the check so profile is saved even if they're the only fields
    const hasProfileData = mergedSkills.length > 0 || mergedAspirations || mergedBio ||
                           mergedProjects.length > 0 || mergedExperiences.length > 0 || 
                           mergedAchievements.length > 0 || mergedMajor || mergedGradYear ||
                           mergedRelevantCoursework.length > 0 || parsed_resume || resumeUrl ||
                           mergedLinkedInUrl || parsedResumeData.github_url || mergedLocation;

    // Track if profile save was successful
    let profileSaveSuccess = false;

    if (hasProfileData) {
      // Create parsed_resume object with only metadata (no duplicate data)
      // Remove redundant fields that are already stored at top level
      let parsedResumeObject = null;
      
      if (parsed_resume !== undefined) {
        // User provided parsed_resume manually - use as is but remove duplicates
        const providedParsedResume = typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume;
        // Keep only metadata fields, remove duplicates of top-level fields
        const { skills, projects, experiences, achievements, aspirations, bio, major, grad_year, relevant_coursework, linkedin_url, github_url, ...metadata } = providedParsedResume;
        parsedResumeObject = Object.keys(metadata).length > 0 ? metadata : null;
      } else if (file) {
        // Resume was parsed - store only metadata/reference
        parsedResumeObject = {
          parsed_at: new Date().toISOString(),
          source: 'resume_upload',
          file_name: file.originalname || null,
          file_type: file.mimetype || null,
          // Note: Extracted data (skills, projects, etc.) is stored at top level, not here
        };
      }
      
      const profileData = {
        skills: mergedSkills,
        aspirations: mergedAspirations,
        bio: mergedBio, // Bio/About me
        major: mergedMajor, // Major/Field of study (for alumni, stored in DynamoDB)
        grad_year: mergedGradYear, // Graduation year (for alumni, stored in DynamoDB)
        relevant_coursework: mergedRelevantCoursework, // Relevant coursework
        parsed_resume: parsedResumeObject, // Only metadata, no duplicate data
        projects: mergedProjects,
        experiences: mergedExperiences,
        achievements: mergedAchievements,
        resume_url: resumeUrl || null,
        linkedin_url: mergedLinkedInUrl, // Store LinkedIn URL in DynamoDB profile
        github_url: parsedResumeData.github_url || null, // Store GitHub URL in DynamoDB profile
        location: mergedLocation, // Store location in DynamoDB profile
      };
      
      console.log('📝 Saving profile data to DynamoDB:', {
        hasSkills: mergedSkills.length > 0,
        hasProjects: mergedProjects.length > 0,
        hasExperiences: mergedExperiences.length > 0,
        hasAchievements: mergedAchievements.length > 0,
        hasAspirations: !!mergedAspirations,
        hasBio: !!mergedBio,
        hasMajor: !!mergedMajor,
        major: mergedMajor,
        hasGradYear: !!mergedGradYear,
        gradYear: mergedGradYear,
        hasCoursework: mergedRelevantCoursework.length > 0,
        courseworkCount: mergedRelevantCoursework.length,
        coursework: mergedRelevantCoursework.slice(0, 3),
        hasResumeUrl: !!resumeUrl,
        hasLinkedInUrl: !!mergedLinkedInUrl,
        linkedInUrl: mergedLinkedInUrl,
        hasGitHubUrl: !!parsedResumeData.github_url,
        githubUrl: parsedResumeData.github_url,
      });
      
      console.log('📦 ProfileData object being saved:', JSON.stringify({
        ...profileData,
        skills: profileData.skills.slice(0, 3),
        projects: profileData.projects.slice(0, 1),
        relevant_coursework: profileData.relevant_coursework,
      }, null, 2));

      // Save profile to DynamoDB
      try {
        console.log('💾 Attempting to save profile to DynamoDB:', {
          userId: newUser.id,
          hasLinkedInUrl: !!mergedLinkedInUrl,
          linkedInUrl: mergedLinkedInUrl,
          hasLocation: !!mergedLocation,
          location: mergedLocation,
          profileDataKeys: Object.keys(profileData),
        });
        await saveAlumniProfile(newUser.id, profileData);
        profileSaveSuccess = true;
        console.log('✅ Profile saved successfully for user:', newUser.id);
      } catch (profileError) {
        // Log detailed error but don't fail signup if profile save fails
        console.error('❌ Failed to save profile during signup:', {
          error: profileError.message,
          userId: newUser.id,
          userIdType: typeof newUser.id,
          profileDataKeys: Object.keys(profileData),
          linkedin_url_in_profileData: profileData.linkedin_url,
          resumeUrl: resumeUrl,
        });
        // Continue - profile can be saved later via update endpoint
      }
    } else {
      console.log('⚠️ No profile data to save (hasProfileData check failed)');
      console.log('   Checked fields:', {
        hasSkills: mergedSkills.length > 0,
        hasAspirations: !!mergedAspirations,
        hasProjects: mergedProjects.length > 0,
        hasExperiences: mergedExperiences.length > 0,
        hasAchievements: mergedAchievements.length > 0,
        hasParsedResume: !!parsed_resume,
        hasResumeUrl: !!resumeUrl,
        hasLinkedInUrl: !!mergedLinkedInUrl,
        linkedInUrl: mergedLinkedInUrl,
        hasGitHubUrl: !!parsedResumeData.github_url,
        hasLocation: !!mergedLocation,
        location: mergedLocation,
      });
    }

    // Get merged data (RDS + DynamoDB)
    let mergedUser = await getUserWithProfile(newUser.id);
    
    console.log('🔍 Checking mergedUser after getUserWithProfile:', {
      userId: newUser.id,
      hasMajor: !!mergedUser.major,
      major: mergedUser.major,
      hasGradYear: !!mergedUser.grad_year,
      gradYear: mergedUser.grad_year,
      hasCoursework: !!mergedUser.relevant_coursework && mergedUser.relevant_coursework.length > 0,
      courseworkCount: mergedUser.relevant_coursework?.length || 0,
      extractedMajor: mergedMajor,
      extractedGradYear: mergedGradYear,
      extractedCourseworkCount: mergedRelevantCoursework.length,
    });
    
    // If resume was uploaded but profile save failed, ensure resume_url is in response
    if (resumeUrl && !mergedUser.resume_url) {
      mergedUser.resume_url = resumeUrl;
      console.warn('Resume URL added to response despite DynamoDB save failure for user:', newUser.id);
    }
    
    // Fallback: If extracted values are not in response (due to DynamoDB save/retrieval issues), add them
    // This ensures extracted fields appear in response even if DynamoDB had temporary issues
    if (mergedLinkedInUrl && (!mergedUser.linkedin_url || mergedUser.linkedin_url === null || mergedUser.linkedin_url === '')) {
      mergedUser.linkedin_url = mergedLinkedInUrl;
      console.log('⚠️ LinkedIn URL not found in DynamoDB, using extracted value (fallback):', mergedLinkedInUrl);
    }
    
    if (parsedResumeData.github_url && (!mergedUser.github_url || mergedUser.github_url === null || mergedUser.github_url === '')) {
      mergedUser.github_url = parsedResumeData.github_url;
      console.log('⚠️ GitHub URL not found in DynamoDB, using extracted value (fallback):', parsedResumeData.github_url);
    }
    
    if (mergedMajor && (!mergedUser.major || mergedUser.major === null || mergedUser.major === '')) {
      mergedUser.major = mergedMajor;
      console.log('⚠️ Major not found in DynamoDB, using extracted value (fallback):', mergedMajor);
    }
    
    if (mergedGradYear !== null && mergedGradYear !== undefined && (!mergedUser.grad_year || mergedUser.grad_year === null || mergedUser.grad_year === undefined)) {
      mergedUser.grad_year = mergedGradYear;
      console.log('⚠️ Graduation year not found in DynamoDB, using extracted value (fallback):', mergedGradYear);
    }
    
    // Fallback for contact (from RDS, but ensure it's in response)
    if (mergedContact && (!mergedUser.contact || mergedUser.contact === null || mergedUser.contact === '')) {
      mergedUser.contact = mergedContact;
      console.log('⚠️ Contact not found in RDS, using extracted value (fallback):', mergedContact);
    }
    
    // Fallback for location (from DynamoDB, but ensure it's in response)
    if (mergedLocation && (!mergedUser.location || mergedUser.location === null || mergedUser.location === '')) {
      mergedUser.location = mergedLocation;
      console.log('⚠️ Location not found in DynamoDB, using extracted value (fallback):', mergedLocation);
    }
    
    if (mergedRelevantCoursework && Array.isArray(mergedRelevantCoursework) && mergedRelevantCoursework.length > 0 && 
        (!mergedUser.relevant_coursework || mergedUser.relevant_coursework === null || !Array.isArray(mergedUser.relevant_coursework) || mergedUser.relevant_coursework.length === 0)) {
      mergedUser.relevant_coursework = mergedRelevantCoursework;
      console.log('⚠️ Relevant coursework not found in DynamoDB, using extracted value (fallback):', mergedRelevantCoursework.length, 'courses');
    }
    
    console.log('📤 Final mergedUser before returning:', {
      hasMajor: !!mergedUser.major,
      major: mergedUser.major,
      hasGradYear: !!mergedUser.grad_year,
      gradYear: mergedUser.grad_year,
      hasCoursework: !!mergedUser.relevant_coursework && mergedUser.relevant_coursework.length > 0,
      courseworkCount: mergedUser.relevant_coursework?.length || 0,
      coursework: mergedUser.relevant_coursework?.slice(0, 3),
    });

    // Log profile creation for batch matching
    try {
      const { logUserProfileChange } = require('../repositories/profileChangeLog.repository');
      await logUserProfileChange(newUser.id, 'CREATE');
      console.log('✅ Logged profile creation for batch matching:', newUser.id);
    } catch (logError) {
      // Don't fail signup if logging fails
      console.warn('⚠️ Failed to log profile creation:', logError.message);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, type: 'alumni' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: mergedUser,
      token,
    };
  } catch (error) {
    // Re-throw with context
    if (error.code === 'DUPLICATE_EMAIL') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

/**
 * Get user with extended profile (RDS + DynamoDB)
 * @param {number} userId - User ID (integer)
 * @returns {Promise<Object>} Merged user data (RDS atomic data + DynamoDB profile data)
 */
const getUserWithProfile = async (userId) => {
  try {
    // Get basic info from RDS
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get extended profile from DynamoDB
    const profile = await getAlumniProfile(userId);

    // Merge data: Combine RDS atomic data with DynamoDB profile data
    if (profile) {
      // Clean up parsed_resume to remove duplicate fields if they exist
      let cleanedParsedResume = profile.parsed_resume;
      if (cleanedParsedResume && typeof cleanedParsedResume === 'object') {
        // Remove duplicate fields that are already at top level
        const {
          skills,
          projects,
          experiences,
          achievements,
          aspirations,
          bio,
          major,
          grad_year,
          relevant_coursework,
          linkedin_url,
          github_url,
          ...metadataOnly
        } = cleanedParsedResume;
        
        // Keep only metadata fields (non-empty)
        cleanedParsedResume = Object.keys(metadataOnly).length > 0 ? metadataOnly : null;
      }
      
      return {
        // RDS atomic data + willingness flags
        id: user.id,
        email: user.email,
        name: user.name,
        contact: user.contact,
        willing_to_be_mentor: user.willing_to_be_mentor || false,
        mentor_capacity: user.mentor_capacity || null,
        willing_to_be_judge: user.willing_to_be_judge || false,
        willing_to_be_sponsor: user.willing_to_be_sponsor || false,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // DynamoDB profile data (unique fields only)
        skills: profile.skills || [],
        aspirations: profile.aspirations || null,
        bio: profile.bio || null,
        major: profile.major || null,
        grad_year: profile.grad_year || null,
        relevant_coursework: profile.relevant_coursework || [],
        parsed_resume: cleanedParsedResume, // Only metadata, no duplicate data
        projects: profile.projects || [],
        experiences: profile.experiences || [],
        achievements: profile.achievements || [],
        resume_url: profile.resume_url || null,
        linkedin_url: profile.linkedin_url || null,
        github_url: profile.github_url || null,
        location: profile.location || null,
      };
    } else {
      // No profile data, return only RDS data with empty profile fields
      return {
        ...user,
        skills: [],
        aspirations: null,
        bio: null,
        major: null,
        grad_year: null,
        relevant_coursework: [],
        parsed_resume: null,
        projects: [],
        experiences: [],
        achievements: [],
        resume_url: null,
        linkedin_url: null,
        github_url: null,
        location: null,
        linkedin_url: null,
        github_url: null,
      };
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object and token (merged from RDS + DynamoDB)
 */
const login = async (email, password) => {
  try {
    // Validate input
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!password) {
      throw new Error('Password is required');
    }

    // Get user by email
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Get merged profile data
    const mergedUser = await getUserWithProfile(user.id);

    // Update last_login timestamp (fire-and-forget; don't block login on failure)
    userRepository.updateLastLogin(user.id).catch((err) => {
      console.warn('Failed to update user last_login:', err.message);
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, type: 'alumni' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: mergedUser,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Validate update data
 * @param {Object} updateData - User update data
 * @param {Object} file - Uploaded file (optional)
 * @throws {Error} If validation fails
 */
const validateUpdateData = (updateData, file) => {
  const { name, willing_to_be_mentor, mentor_capacity, password } = updateData;

  // Validate name if provided
  if (name !== undefined && (!name || !name.trim())) {
    throw new Error('Name cannot be empty');
  }

  // Validate password if provided
  if (password !== undefined) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  // Validate mentor_capacity if willing_to_be_mentor is yes
  if (willing_to_be_mentor === 'yes' || willing_to_be_mentor === true) {
    if (mentor_capacity !== undefined && (!mentor_capacity || isNaN(mentor_capacity) || parseInt(mentor_capacity) <= 0)) {
      throw new Error('mentor_capacity must be a positive integer when willing_to_be_mentor is yes');
    }
  }

  // File validation (if provided)
  if (file) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Resume file is empty');
    }
  }
};

/**
 * Update user information (RDS + DynamoDB)
 * @param {number} userId - User ID
 * @param {Object} updateData - User update data (both RDS and DynamoDB fields)
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Updated user object (merged from RDS + DynamoDB)
 */
const updateUser = async (userId, updateData, file) => {
  try {
    // Validate input data
    validateUpdateData(updateData, file);

    // Check if user exists
    const existingUser = await userRepository.getUserById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Split update data: RDS vs DynamoDB
    const {
      // RDS fields (atomic data + willingness flags)
      name,
      contact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
      password,
      // DynamoDB fields (profile data)
      skills,
      aspirations,
      bio,
      major,
      grad_year,
      relevant_coursework,
      parsed_resume,
      projects,
      experiences,
      achievements,
    } = updateData;

    // Prepare RDS update data
    const updateDataForDb = {};
    if (name !== undefined) updateDataForDb.name = name;
    if (contact !== undefined) updateDataForDb.contact = contact;
    if (willing_to_be_mentor !== undefined) updateDataForDb.willing_to_be_mentor = willing_to_be_mentor;
    if (mentor_capacity !== undefined) updateDataForDb.mentor_capacity = mentor_capacity;
    if (willing_to_be_judge !== undefined) updateDataForDb.willing_to_be_judge = willing_to_be_judge;
    if (willing_to_be_sponsor !== undefined) updateDataForDb.willing_to_be_sponsor = willing_to_be_sponsor;

    // Hash password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await userRepository.updateUserPassword(userId, hashedPassword);
    }

    // Check if there are any updates (RDS or DynamoDB)
    const hasRdsUpdates = Object.keys(updateDataForDb).length > 0;
    const hasProfileUpdates = skills !== undefined || aspirations !== undefined || bio !== undefined ||
                              major !== undefined || grad_year !== undefined || relevant_coursework !== undefined ||
                              parsed_resume !== undefined || projects !== undefined ||
                              experiences !== undefined || achievements !== undefined || file;
    const hasAnyUpdates = hasRdsUpdates || hasProfileUpdates;

    // Update user in RDS (only if there are RDS fields to update)
    let updatedUser = existingUser;
    if (hasRdsUpdates) {
      updatedUser = await userRepository.updateUser(userId, updateDataForDb);
      if (!updatedUser) {
        throw new Error('User not found');
      }
    }

    // Update DynamoDB profile (only if there are profile fields to update)
    if (hasProfileUpdates) {
      // Get current profile or create new one
      const currentProfile = await getAlumniProfile(userId);
      
      // Upload resume to S3 if provided
      let resumeUrl = currentProfile?.resume_url || null;
      if (file) {
        resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      }

      // Clean parsed_resume to remove duplicate fields
      let cleanedParsedResume = null;
      if (parsed_resume !== undefined) {
        const providedParsedResume = typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume;
        // Remove duplicate fields that are stored at top level
        const { skills: _, projects: __, experiences: ___, achievements: ____, aspirations: _____, bio: ______, major: _______, grad_year: ________, relevant_coursework: _________, linkedin_url: __________, github_url: ___________, ...metadata } = providedParsedResume;
        cleanedParsedResume = Object.keys(metadata).length > 0 ? metadata : null;
      } else {
        // Use existing parsed_resume but clean it
        const existingParsedResume = currentProfile?.parsed_resume;
        if (existingParsedResume && typeof existingParsedResume === 'object') {
          const { skills: _, projects: __, experiences: ___, achievements: ____, aspirations: _____, bio: ______, major: _______, grad_year: ________, relevant_coursework: _________, linkedin_url: __________, github_url: ___________, ...metadata } = existingParsedResume;
          cleanedParsedResume = Object.keys(metadata).length > 0 ? metadata : null;
        }
      }
      
      // Merge profile data
      const profileData = {
        skills: skills !== undefined ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : (currentProfile?.skills || []),
        aspirations: aspirations !== undefined ? (aspirations?.trim() || null) : (currentProfile?.aspirations || null),
        bio: bio !== undefined ? (bio?.trim() || null) : (currentProfile?.bio || null),
        major: major !== undefined ? (major?.trim() || null) : (currentProfile?.major || null),
        grad_year: grad_year !== undefined ? (typeof grad_year === 'number' ? grad_year : parseInt(grad_year)) : (currentProfile?.grad_year || null),
        relevant_coursework: relevant_coursework !== undefined ? (Array.isArray(relevant_coursework) ? relevant_coursework : JSON.parse(relevant_coursework)) : (currentProfile?.relevant_coursework || []),
        parsed_resume: cleanedParsedResume, // Only metadata, no duplicate data
        projects: projects !== undefined ? (Array.isArray(projects) ? projects : JSON.parse(projects)) : (currentProfile?.projects || []),
        experiences: experiences !== undefined ? (Array.isArray(experiences) ? experiences : JSON.parse(experiences)) : (currentProfile?.experiences || []),
        achievements: achievements !== undefined ? (Array.isArray(achievements) ? achievements : JSON.parse(achievements)) : (currentProfile?.achievements || []),
        resume_url: resumeUrl,
        linkedin_url: currentProfile?.linkedin_url || null,
        github_url: currentProfile?.github_url || null,
      };

      // Update profile in DynamoDB
      await saveAlumniProfile(userId, profileData);
    }

    // Log profile update for batch matching (if ANY updates were made)
    if (hasAnyUpdates) {
      try {
        const { logUserProfileChange } = require('../repositories/profileChangeLog.repository');
        await logUserProfileChange(userId, 'UPDATE');
        console.log('✅ Logged profile update for batch matching:', userId);
      } catch (logError) {
        // Don't fail update if logging fails
        console.warn('⚠️ Failed to log profile update:', logError.message);
      }
    }

    // Return merged data
    return await getUserWithProfile(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Save or update extended alumni profile
 * @param {number} userId - User ID
 * @param {Object} profileData - Extended profile data (skills, aspirations, projects, etc.)
 * @returns {Promise<Object>} Saved profile data
 */
const saveExtendedProfile = async (userId, profileData) => {
  try {
    // Verify user exists
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Clean parsed_resume to remove duplicate fields
    let cleanedProfileData = { ...profileData };
    if (cleanedProfileData.parsed_resume && typeof cleanedProfileData.parsed_resume === 'object') {
      const { skills, projects, experiences, achievements, aspirations, bio, major, grad_year, relevant_coursework, linkedin_url, github_url, ...metadata } = cleanedProfileData.parsed_resume;
      cleanedProfileData.parsed_resume = Object.keys(metadata).length > 0 ? metadata : null;
    }

    // Save to DynamoDB (only profile fields, not willingness flags)
    const savedProfile = await saveAlumniProfile(userId, cleanedProfileData);
    
    // Log profile update for batch matching
    try {
      const { logUserProfileChange } = require('../repositories/profileChangeLog.repository');
      await logUserProfileChange(userId, 'UPDATE');
      console.log('✅ Logged profile update for batch matching (saveExtendedProfile):', userId);
    } catch (logError) {
      // Don't fail update if logging fails
      console.warn('⚠️ Failed to log profile update:', logError.message);
    }
    
    return savedProfile;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user from both RDS and DynamoDB
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user was deleted
 */
const deleteUser = async (userId) => {
  try {
    // Check if user exists
    const existingUser = await userRepository.getUserById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Delete profile from DynamoDB first (if exists)
    try {
      const profile = await getAlumniProfile(userId);
      if (profile) {
        // Delete from DynamoDB via Lambda
        if (API_GATEWAY_DYNAMODB_URL) {
          await axios.post(API_GATEWAY_DYNAMODB_URL, {
            operation: 'deleteAlumniProfile',
            userId: userId,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          });
        }
      }
    } catch (profileError) {
      // Log error but continue with RDS deletion
      console.error('Failed to delete profile from DynamoDB:', profileError);
    }

    // Delete user from RDS
    const deleted = await userRepository.deleteUser(userId);

    if (!deleted) {
      throw new Error('Failed to delete user');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all users with merged profiles
 * @returns {Promise<Array>} Array of user objects (merged from RDS + DynamoDB)
 */
const getAllUsers = async () => {
  try {
    // Get all users from RDS
    const users = await userRepository.getAllUsers();
    
    // Get profiles from DynamoDB for all users
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        try {
          const profile = await getAlumniProfile(user.id);
          return {
            // RDS atomic data + willingness flags
            id: user.id,
            email: user.email,
            name: user.name,
            contact: user.contact,
            willing_to_be_mentor: user.willing_to_be_mentor || false,
            mentor_capacity: user.mentor_capacity || null,
            willing_to_be_judge: user.willing_to_be_judge || false,
            willing_to_be_sponsor: user.willing_to_be_sponsor || false,
            created_at: user.created_at,
            updated_at: user.updated_at,
            // DynamoDB profile data
            skills: profile?.skills || [],
            aspirations: profile?.aspirations || null,
            parsed_resume: profile?.parsed_resume || null,
            projects: profile?.projects || [],
            experiences: profile?.experiences || [],
            achievements: profile?.achievements || [],
            resume_url: profile?.resume_url || null,
          };
        } catch (error) {
          // If profile fetch fails, return user with empty profile fields
          console.error(`Failed to get profile for user ${user.id}:`, error);
          return {
            ...user,
            skills: [],
            aspirations: null,
            parsed_resume: null,
            projects: [],
            experiences: [],
            achievements: [],
            resume_url: null,
          };
        }
      })
    );

    return usersWithProfiles;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user by ID (merged from RDS + DynamoDB)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User object (merged from RDS + DynamoDB)
 */
const getUserById = async (userId) => {
  try {
    return await getUserWithProfile(userId);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadResumeToS3,
  getUserWithProfile,
  saveExtendedProfile,
  getAlumniProfile,
};

