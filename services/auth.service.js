const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { API_GATEWAY_UPLOAD_URL } = require('../config/aws');
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
    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      throw new Error('Invalid response from upload service');
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
 * Sign up a new user
 * @param {Object} userData - User signup data
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Created user object and token
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
      resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
    }

    // Prepare user data for database
    const userDataForDb = {
      ...userData,
      password: hashedPassword,
      resume_url: resumeUrl,
    };

    // Create user in database
    const newUser = await userRepository.createUser(userDataForDb);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete newUser.password;

    return {
      user: newUser,
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
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object and token
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete user.password;

    return {
      user,
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
 * Update user information
 * @param {number} userId - User ID
 * @param {Object} updateData - User update data
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Updated user object
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

    // Prepare update data
    const updateDataForDb = { ...updateData };

    // Hash password if provided
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, SALT_ROUNDS);
      await userRepository.updateUserPassword(userId, hashedPassword);
      delete updateDataForDb.password; // Remove from regular update
    }

    // Upload resume to S3 if provided
    if (file) {
      const resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      updateDataForDb.resume_url = resumeUrl;
    }

    // Update user in database
    const updatedUser = await userRepository.updateUser(userId, updateDataForDb);

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user
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

    // Delete user from database
    const deleted = await userRepository.deleteUser(userId);

    if (!deleted) {
      throw new Error('Failed to delete user');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  signup,
  login,
  updateUser,
  deleteUser,
  uploadResumeToS3,
};

