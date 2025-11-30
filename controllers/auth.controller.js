const authService = require('../services/auth.service');

/**
 * Auth Controller
 * Handles HTTP requests and responses for authentication endpoints
 */

/**
 * POST /api/auth/signup
 * Register a new user
 */
const signup = async (req, res) => {
  console.log('-> triggered endpoint POST /api/auth/signup');
  try {
    // Extract form data (both RDS atomic data and DynamoDB profile data)
    const {
      // RDS atomic fields + willingness flags
      email,
      name,
      password,
      contact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
      // DynamoDB profile fields
      skills,
      aspirations,
      parsed_resume,
      projects,
      experiences,
      achievements,
    } = req.body;

    // Get uploaded file from multer
    const file = req.file;

    // Debug: Log received values for willingness flags
    console.log('[Signup] Received willingness flags:', {
      willing_to_be_mentor: willing_to_be_mentor,
      willing_to_be_mentor_type: typeof willing_to_be_mentor,
      willing_to_be_judge: willing_to_be_judge,
      willing_to_be_sponsor: willing_to_be_sponsor,
    });

    // Normalize willingness flags (handle case variations and normalize to lowercase)
    const normalizeWillingnessFlag = (value) => {
      if (value === undefined || value === null || value === '') {
        return 'no';
      }
      // Convert to string and lowercase for comparison
      const strValue = String(value).toLowerCase().trim();
      // Accept 'yes', 'true', '1', or boolean true
      if (strValue === 'yes' || strValue === 'true' || strValue === '1' || value === true) {
        return 'yes';
      }
      return 'no';
    };

    // Prepare user data (will be split in service layer)
    const userData = {
      // RDS atomic data + willingness flags
      email: email?.trim(),
      name: name?.trim(),
      password,
      contact: contact?.trim() || null,
      // Normalize willingness flags
      willing_to_be_mentor: normalizeWillingnessFlag(willing_to_be_mentor),
      mentor_capacity: mentor_capacity ? parseInt(mentor_capacity) : null,
      // Normalize other willingness flags
      willing_to_be_judge: normalizeWillingnessFlag(willing_to_be_judge),
      willing_to_be_sponsor: normalizeWillingnessFlag(willing_to_be_sponsor),
      mentor_capacity: mentor_capacity ? parseInt(mentor_capacity) : null,
      // DynamoDB profile data
      skills: skills ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : undefined,
      aspirations: aspirations?.trim() || undefined,
      parsed_resume: parsed_resume ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : undefined,
      projects: projects ? (Array.isArray(projects) ? projects : JSON.parse(projects)) : undefined,
      experiences: experiences ? (Array.isArray(experiences) ? experiences : JSON.parse(experiences)) : undefined,
      achievements: achievements ? (Array.isArray(achievements) ? achievements : JSON.parse(achievements)) : undefined,
    };

    // Debug: Log normalized values
    console.log('[Signup] Normalized userData.willing_to_be_mentor:', userData.willing_to_be_mentor);

    // Call service to signup user
    const result = await authService.signup(userData, file);

    // Return success response
    console.log('-> finished endpoint execution POST /api/auth/signup');
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'Email already exists') {
      console.log('-> finished endpoint execution POST /api/auth/signup');
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        error: error.message,
      });
    }

    if (error.message.includes('Invalid file type')) {
      console.log('-> finished endpoint execution POST /api/auth/signup');
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: error.message,
      });
    }

    if (error.message.includes('mentor_capacity')) {
      console.log('-> finished endpoint execution POST /api/auth/signup');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Signup error:', error);
    console.log('-> finished endpoint execution POST /api/auth/signup');
    res.status(400).json({
      success: false,
      message: 'Failed to register user',
      error: error.message || 'An error occurred during signup',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
const login = async (req, res) => {
  console.log('-> triggered endpoint POST /api/auth/login');
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('-> finished endpoint execution POST /api/auth/login');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Call service to login user
    const result = await authService.login(email.trim(), password);

    // Return success response
    console.log('-> finished endpoint execution POST /api/auth/login');
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid email or password' || error.message === 'Email is required' || error.message === 'Password is required') {
      console.log('-> finished endpoint execution POST /api/auth/login');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Login error:', error);
    console.log('-> finished endpoint execution POST /api/auth/login');
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message || 'An error occurred during login',
    });
  }
};

/**
 * PUT /api/auth/user/:id
 * Update user information (RDS atomic fields only)
 */
const updateUser = async (req, res) => {
  console.log(`-> triggered endpoint PUT /api/auth/user/:id`);
  try {
    const userId = parseInt(req.params.id);
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
    } = req.body;

    // Get uploaded file from multer (optional)
    const file = req.file;

    // Prepare update data (both RDS and DynamoDB fields)
    const updateData = {};
    // RDS fields
    if (name !== undefined) updateData.name = name?.trim();
    if (contact !== undefined) updateData.contact = contact?.trim() || null;
    if (willing_to_be_mentor !== undefined) updateData.willing_to_be_mentor = willing_to_be_mentor;
    if (mentor_capacity !== undefined) updateData.mentor_capacity = mentor_capacity ? parseInt(mentor_capacity) : null;
    if (willing_to_be_judge !== undefined) updateData.willing_to_be_judge = willing_to_be_judge;
    if (willing_to_be_sponsor !== undefined) updateData.willing_to_be_sponsor = willing_to_be_sponsor;
    if (password !== undefined) updateData.password = password;
    // DynamoDB fields
    if (skills !== undefined) updateData.skills = skills;
    if (aspirations !== undefined) updateData.aspirations = aspirations;
    if (parsed_resume !== undefined) updateData.parsed_resume = parsed_resume;
    if (projects !== undefined) updateData.projects = projects;
    if (experiences !== undefined) updateData.experiences = experiences;
    if (achievements !== undefined) updateData.achievements = achievements;

    // Call service to update user
    const updatedUser = await authService.updateUser(userId, updateData, file);

    // Return success response
    console.log('-> finished endpoint execution PUT /api/auth/user/:id');
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'User not found') {
      console.log('-> finished endpoint execution PUT /api/auth/user/:id');
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    if (error.message.includes('Invalid file type')) {
      console.log('-> finished endpoint execution PUT /api/auth/user/:id');
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: error.message,
      });
    }

    if (error.message.includes('mentor_capacity') || error.message.includes('Password must be')) {
      console.log('-> finished endpoint execution PUT /api/auth/user/:id');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.log('-> finished endpoint execution PUT /api/auth/user/:id');
    console.error('Update user error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message || 'An error occurred during update',
    });
  }
};

/**
 * GET /api/auth/users
 * Get all users with merged profiles
 */
const getAllUsers = async (req, res) => {
  console.log('-> triggered endpoint GET /api/auth/users');
  try {
    const users = await authService.getAllUsers();

    console.log('-> finished endpoint execution GET /api/auth/users');
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    });
  } catch (error) {
    console.log('-> finished endpoint execution GET /api/auth/users');
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/auth/user/:id
 * Get one user's complete info (RDS + DynamoDB merged)
 */
const getUserById = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/auth/user/:id`);
  try {
    const userId = parseInt(req.params.id);

    const user = await authService.getUserById(userId);

    console.log('-> finished endpoint execution GET /api/auth/user/:id');
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      console.log('-> finished endpoint execution GET /api/auth/user/:id');
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/auth/user/:id');
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * DELETE /api/auth/user/:id
 * Delete user account from both RDS and DynamoDB
 */
const deleteUser = async (req, res) => {
  console.log(`-> triggered endpoint DELETE /api/auth/user/:id`);
  try {
    const userId = parseInt(req.params.id);

    // Call service to delete user (deletes from both RDS and DynamoDB)
    await authService.deleteUser(userId);

    // Return success response
    console.log('-> finished endpoint execution DELETE /api/auth/user/:id');
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'User not found') {
      console.log('-> finished endpoint execution DELETE /api/auth/user/:id');
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    // Generic error response
    console.log('-> finished endpoint execution DELETE /api/auth/user/:id');
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message || 'An error occurred during deletion',
    });
  }
};

/**
 * POST /api/auth/user/:id/profile
 * Save or update extended alumni profile in DynamoDB
 */
const saveExtendedProfile = async (req, res) => {
  console.log(`-> triggered endpoint POST /api/auth/user/:id/profile`);
  try {
    const userId = parseInt(req.params.id);
    const {
      skills,
      aspirations,
      parsed_resume,
      projects,
      experiences,
      achievements,
      resume_url,
    } = req.body;

    // Get uploaded file from multer (optional)
    const file = req.file;

    // Prepare profile data (DynamoDB fields only)
    const profileData = {
      skills: Array.isArray(skills) ? skills : (skills ? JSON.parse(skills) : []),
      aspirations: aspirations?.trim() || null,
      parsed_resume: parsed_resume ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : null,
      projects: Array.isArray(projects) ? projects : (projects ? JSON.parse(projects) : []),
      experiences: Array.isArray(experiences) ? experiences : (experiences ? JSON.parse(experiences) : []),
      achievements: Array.isArray(achievements) ? achievements : (achievements ? JSON.parse(achievements) : []),
      resume_url: resume_url?.trim() || null,
    };

    // Upload resume to S3 if provided
    if (file) {
      const resumeUrl = await authService.uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      profileData.resume_url = resumeUrl;
    }

    // Save profile to DynamoDB
    const savedProfile = await authService.saveExtendedProfile(userId, profileData);

    console.log('-> finished endpoint execution POST /api/auth/user/:id/profile');
    res.status(200).json({
      success: true,
      message: 'Alumni profile saved successfully',
      data: savedProfile,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      console.log('-> finished endpoint execution POST /api/auth/user/:id/profile');
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution POST /api/auth/user/:id/profile');
    console.error('Save extended profile error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to save alumni profile',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/auth/user/:id/profile
 * Get user with extended profile (RDS + DynamoDB merged)
 */
const getUserWithProfile = async (req, res) => {
  console.log(`-> triggered endpoint GET /api/auth/user/:id/profile`);
  try {
    const userId = parseInt(req.params.id);

    const user = await authService.getUserWithProfile(userId);

    console.log('-> finished endpoint execution GET /api/auth/user/:id/profile');
    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      console.log('-> finished endpoint execution GET /api/auth/user/:id/profile');
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    console.log('-> finished endpoint execution GET /api/auth/user/:id/profile');
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  saveExtendedProfile,
  getUserWithProfile,
};

