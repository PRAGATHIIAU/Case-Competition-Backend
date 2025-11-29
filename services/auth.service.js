const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { API_GATEWAY_UPLOAD_URL, API_GATEWAY_DYNAMODB_URL } = require('../config/aws');
const userRepository = require('../repositories/user.repository');

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
    
    const response = await axios.post(API_GATEWAY_DYNAMODB_URL, {
      operation: 'getAlumniProfile',
      userId: numericUserId,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('DynamoDB get error:', error);
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
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

    // Upload resume to S3 if provided
    let resumeUrl = null;
    if (file) {
      console.log('Resume file received:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.buffer?.length || 0,
        hasBuffer: !!file.buffer,
      });
      
      // Check if API Gateway URL is configured
      if (!API_GATEWAY_UPLOAD_URL) {
        console.error('❌ API_GATEWAY_UPLOAD_URL is not configured in .env file');
        console.error('   Please set API_GATEWAY_UPLOAD_URL in your .env file');
        console.error('   Example: API_GATEWAY_UPLOAD_URL=https://xxxxx.execute-api.region.amazonaws.com/prod/upload');
      } else {
        console.log('✅ API_GATEWAY_UPLOAD_URL is configured:', API_GATEWAY_UPLOAD_URL);
      }
      
      try {
        console.log('Attempting to upload resume to S3 via API Gateway...');
        resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
        
        if (resumeUrl) {
          console.log('✅ Resume uploaded successfully to S3:', resumeUrl);
        } else {
          console.error('❌ Upload function returned null/undefined URL');
        }
      } catch (uploadError) {
        console.error('❌ Failed to upload resume to S3:', {
          error: uploadError.message,
          stack: uploadError.stack,
          name: uploadError.name,
        });
        // Don't fail signup if resume upload fails, but log the error
        // resumeUrl will remain null
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
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
      // DynamoDB fields (profile data)
      skills,
      aspirations,
      parsed_resume,
      projects,
      experiences,
      achievements,
    } = userData;

    // Prepare RDS data (atomic fields + willingness flags)
    const rdsData = {
      email,
      name,
      password: hashedPassword,
      contact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
    };

    // Create user in RDS PostgreSQL
    const newUser = await userRepository.createUser(rdsData);

    // Prepare DynamoDB profile data (if any profile fields provided OR resume uploaded)
    const hasProfileData = skills || aspirations || parsed_resume || 
                           projects || experiences || achievements || resumeUrl;

    // Track if profile save was successful
    let profileSaveSuccess = false;

    if (hasProfileData) {
      const profileData = {
        skills: skills !== undefined ? (Array.isArray(skills) ? skills : (typeof skills === 'string' ? JSON.parse(skills) : [])) : [],
        aspirations: aspirations !== undefined ? (aspirations?.trim() || null) : null,
        parsed_resume: parsed_resume !== undefined ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : null,
        projects: projects !== undefined ? (Array.isArray(projects) ? projects : (typeof projects === 'string' ? JSON.parse(projects) : [])) : [],
        experiences: experiences !== undefined ? (Array.isArray(experiences) ? experiences : (typeof experiences === 'string' ? JSON.parse(experiences) : [])) : [],
        achievements: achievements !== undefined ? (Array.isArray(achievements) ? achievements : (typeof achievements === 'string' ? JSON.parse(achievements) : [])) : [],
        resume_url: resumeUrl || null,
      };

      // Save profile to DynamoDB
      try {
        await saveAlumniProfile(newUser.id, profileData);
        profileSaveSuccess = true;
        console.log('Profile saved successfully for user:', newUser.id);
      } catch (profileError) {
        // Log detailed error but don't fail signup if profile save fails
        console.error('Failed to save profile during signup:', {
          error: profileError.message,
          userId: newUser.id,
          userIdType: typeof newUser.id,
          profileDataKeys: Object.keys(profileData),
          resumeUrl: resumeUrl,
        });
        // Continue - profile can be saved later via update endpoint
      }
    }

    // Get merged data (RDS + DynamoDB)
    let mergedUser = await getUserWithProfile(newUser.id);
    
    // If resume was uploaded but profile save failed, ensure resume_url is in response
    if (resumeUrl && !mergedUser.resume_url) {
      mergedUser.resume_url = resumeUrl;
      console.warn('Resume URL added to response despite DynamoDB save failure for user:', newUser.id);
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
        skills: profile.skills || [],
        aspirations: profile.aspirations || null,
        parsed_resume: profile.parsed_resume || null,
        projects: profile.projects || [],
        experiences: profile.experiences || [],
        achievements: profile.achievements || [],
        resume_url: profile.resume_url || null,
      };
    } else {
      // No profile data, return only RDS data with empty profile fields
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

    // Update user in RDS (only if there are RDS fields to update)
    let updatedUser = existingUser;
    if (Object.keys(updateDataForDb).length > 0) {
      updatedUser = await userRepository.updateUser(userId, updateDataForDb);
      if (!updatedUser) {
        throw new Error('User not found');
      }
    }

    // Prepare DynamoDB profile update data
    const hasProfileUpdates = skills !== undefined || aspirations !== undefined || 
                              parsed_resume !== undefined || projects !== undefined ||
                              experiences !== undefined || achievements !== undefined || file;

    if (hasProfileUpdates) {
      // Get current profile or create new one
      const currentProfile = await getAlumniProfile(userId);
      
      // Upload resume to S3 if provided
      let resumeUrl = currentProfile?.resume_url || null;
      if (file) {
        resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      }

      // Merge profile data
      const profileData = {
        skills: skills !== undefined ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : (currentProfile?.skills || []),
        aspirations: aspirations !== undefined ? (aspirations?.trim() || null) : (currentProfile?.aspirations || null),
        parsed_resume: parsed_resume !== undefined ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : (currentProfile?.parsed_resume || null),
        projects: projects !== undefined ? (Array.isArray(projects) ? projects : JSON.parse(projects)) : (currentProfile?.projects || []),
        experiences: experiences !== undefined ? (Array.isArray(experiences) ? experiences : JSON.parse(experiences)) : (currentProfile?.experiences || []),
        achievements: achievements !== undefined ? (Array.isArray(achievements) ? achievements : JSON.parse(achievements)) : (currentProfile?.achievements || []),
        resume_url: resumeUrl,
      };

      // Update profile in DynamoDB
      await saveAlumniProfile(userId, profileData);
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

    // Save to DynamoDB (only profile fields, not willingness flags)
    const savedProfile = await saveAlumniProfile(userId, profileData);
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

