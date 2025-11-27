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
  try {
    // Extract form data
    const {
      email,
      name,
      password,
      contact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
    } = req.body;

    // Get uploaded file from multer
    const file = req.file;

    // Prepare user data
    const userData = {
      email: email?.trim(),
      name: name?.trim(),
      password,
      contact: contact?.trim() || null,
      willing_to_be_mentor: willing_to_be_mentor || 'no',
      mentor_capacity: mentor_capacity ? parseInt(mentor_capacity) : null,
      willing_to_be_judge: willing_to_be_judge || 'no',
      willing_to_be_sponsor: willing_to_be_sponsor || 'no',
    };

    // Call service to signup user
    const result = await authService.signup(userData, file);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        error: error.message,
      });
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: error.message,
      });
    }

    if (error.message.includes('mentor_capacity')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Signup error:', error);
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
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Call service to login user
    const result = await authService.login(email.trim(), password);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid email or password' || error.message === 'Email is required' || error.message === 'Password is required') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message || 'An error occurred during login',
    });
  }
};

/**
 * PUT /api/auth/user/:id
 * Update user information
 */
const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      name,
      contact,
      willing_to_be_mentor,
      mentor_capacity,
      willing_to_be_judge,
      willing_to_be_sponsor,
      password,
    } = req.body;

    // Get uploaded file from multer (optional)
    const file = req.file;

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name?.trim();
    if (contact !== undefined) updateData.contact = contact?.trim() || null;
    if (willing_to_be_mentor !== undefined) updateData.willing_to_be_mentor = willing_to_be_mentor;
    if (mentor_capacity !== undefined) updateData.mentor_capacity = mentor_capacity ? parseInt(mentor_capacity) : null;
    if (willing_to_be_judge !== undefined) updateData.willing_to_be_judge = willing_to_be_judge;
    if (willing_to_be_sponsor !== undefined) updateData.willing_to_be_sponsor = willing_to_be_sponsor;
    if (password !== undefined) updateData.password = password;

    // Call service to update user
    const updatedUser = await authService.updateUser(userId, updateData, file);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: error.message,
      });
    }

    if (error.message.includes('mentor_capacity') || error.message.includes('Password must be')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Update user error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message || 'An error occurred during update',
    });
  }
};

/**
 * DELETE /api/auth/user/:id
 * Delete user account
 */
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Call service to delete user
    await authService.deleteUser(userId);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message || 'An error occurred during deletion',
    });
  }
};

module.exports = {
  signup,
  login,
  updateUser,
  deleteUser,
};

