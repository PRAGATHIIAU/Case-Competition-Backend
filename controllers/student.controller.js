const studentService = require('../services/student.service');

/**
 * Student Controller
 * Handles HTTP requests and responses for student endpoints
 */

/**
 * POST /api/students/signup
 * Register a new student
 */
const signup = async (req, res) => {
  try {
    // Extract form data (both RDS atomic data and DynamoDB profile data)
    const {
      // RDS atomic fields
      email,
      name,
      password,
      contact,
      linkedin_url,
      major,
      grad_year,
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

    // Prepare student data (will be split in service layer)
    const studentData = {
      // RDS atomic data
      email: email?.trim(),
      name: name?.trim(),
      password,
      contact: contact?.trim() || null,
      linkedin_url: linkedin_url?.trim() || null,
      major: major?.trim() || null,
      grad_year: grad_year ? parseInt(grad_year) : null,
      // DynamoDB profile data
      skills: skills ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : undefined,
      aspirations: aspirations?.trim() || undefined,
      parsed_resume: parsed_resume ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : undefined,
      projects: projects ? (Array.isArray(projects) ? projects : JSON.parse(projects)) : undefined,
      experiences: experiences ? (Array.isArray(experiences) ? experiences : JSON.parse(experiences)) : undefined,
      achievements: achievements ? (Array.isArray(achievements) ? achievements : JSON.parse(achievements)) : undefined,
    };

    // Call service to signup student (will split and store in RDS + DynamoDB)
    const result = await studentService.signup(studentData, file);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
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

    if (error.message.includes('Password must be') || error.message.includes('Email is required') || error.message.includes('Name is required')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Student signup error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to register student',
      error: error.message || 'An error occurred during signup',
    });
  }
};

/**
 * POST /api/students/login
 * Authenticate student and return token
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

    // Call service to login student
    const result = await studentService.login(email.trim(), password);

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
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message || 'An error occurred during login',
    });
  }
};

/**
 * GET /api/students
 * Get all students
 */
const getAllStudents = async (req, res) => {
  try {
    const students = await studentService.getAllStudents();

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: students,
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/students/:id
 * Get one student's complete info (RDS + DynamoDB merged)
 */
const getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get merged data from both RDS and DynamoDB
    const student = await studentService.getStudentWithProfile(studentId);

    res.status(200).json({
      success: true,
      message: 'Student retrieved successfully',
      data: student,
    });
  } catch (error) {
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        error: error.message,
      });
    }

    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * PUT /api/students/:id
 * Update student information (RDS + DynamoDB - Integrated)
 */
const updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const {
      // RDS fields (atomic data)
      name,
      contact,
      linkedin_url,
      major,
      grad_year,
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
    if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url?.trim() || null;
    if (major !== undefined) updateData.major = major?.trim() || null;
    if (grad_year !== undefined) updateData.grad_year = grad_year ? parseInt(grad_year) : null;
    if (password !== undefined) updateData.password = password;
    // DynamoDB fields
    if (skills !== undefined) updateData.skills = skills;
    if (aspirations !== undefined) updateData.aspirations = aspirations;
    if (parsed_resume !== undefined) updateData.parsed_resume = parsed_resume;
    if (projects !== undefined) updateData.projects = projects;
    if (experiences !== undefined) updateData.experiences = experiences;
    if (achievements !== undefined) updateData.achievements = achievements;

    // Call service to update student (updates both RDS and DynamoDB)
    const updatedStudent = await studentService.updateStudent(studentId, updateData, file);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
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

    if (error.message.includes('Password must be') || error.message.includes('Name cannot be empty')) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Update student error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update student',
      error: error.message || 'An error occurred during update',
    });
  }
};

/**
 * DELETE /api/students/:id
 * Delete student account from both RDS and DynamoDB
 */
const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Call service to delete student (deletes from both RDS and DynamoDB)
    await studentService.deleteStudent(studentId);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    // Handle specific error types
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        error: error.message,
      });
    }

    // Generic error response
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message || 'An error occurred during deletion',
    });
  }
};

/**
 * POST /api/students/:id/profile
 * Save or update extended student profile in DynamoDB
 */
const saveExtendedProfile = async (req, res) => {
  try {
    const studentId = req.params.id;
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

    // Prepare profile data
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
      const resumeUrl = await studentService.uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      profileData.resume_url = resumeUrl;
    }

    // Save profile to DynamoDB
    const savedProfile = await studentService.saveExtendedProfile(studentId, profileData);

    res.status(200).json({
      success: true,
      message: 'Student profile saved successfully',
      data: savedProfile,
    });
  } catch (error) {
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        error: error.message,
      });
    }

    console.error('Save extended profile error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to save student profile',
      error: error.message || 'An error occurred',
    });
  }
};

/**
 * GET /api/students/:id/profile
 * Get student with extended profile (RDS + DynamoDB merged)
 */
const getStudentWithProfile = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await studentService.getStudentWithProfile(studentId);

    res.status(200).json({
      success: true,
      message: 'Student profile retrieved successfully',
      data: student,
    });
  } catch (error) {
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        error: error.message,
      });
    }

    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student profile',
      error: error.message || 'An error occurred',
    });
  }
};

module.exports = {
  signup,
  login,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  saveExtendedProfile,
  getStudentWithProfile,
};

