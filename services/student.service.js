const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { API_GATEWAY_UPLOAD_URL, API_GATEWAY_STUDENT_PROFILES_URL } = require('../config/aws');
const studentRepository = require('../repositories/student.repository');
const { parseResume } = require('./resume-parser.service');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Student Service
 * Handles business logic for student operations
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
      console.warn('⚠️  Warning: API Gateway URL does not appear to be a valid API Gateway endpoint');
    }
    console.log(`📤 Uploading resume to API Gateway: ${url.origin}${url.pathname}`);
  } catch (urlError) {
    throw new Error(
      `Invalid API Gateway URL format: ${API_GATEWAY_UPLOAD_URL}. ` +
      'Expected format: https://xxxxx.execute-api.region.amazonaws.com/stage/upload'
    );
  }

  try {
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    console.log('📋 Upload details:', {
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      apiGatewayUrl: API_GATEWAY_UPLOAD_URL,
    });

    const response = await axios.post(API_GATEWAY_UPLOAD_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
    });

    console.log('📥 Upload response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
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
 * Save or update student profile in DynamoDB
 * @param {string} studentId - Student UUID
 * @param {Object} profileData - Extended profile data
 * @returns {Promise<Object>} Saved profile data
 */
const saveStudentProfile = async (studentId, profileData) => {
  if (!API_GATEWAY_STUDENT_PROFILES_URL) {
    throw new Error(
      'API Gateway Student Profiles URL is not configured. ' +
      'Please set API_GATEWAY_STUDENT_PROFILES_URL in your .env file.'
    );
  }

  try {
    const response = await axios.post(API_GATEWAY_STUDENT_PROFILES_URL, {
      operation: 'putStudentProfile',
      studentId: studentId,
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
      throw new Error(response.data?.error || 'Failed to save student profile');
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
 * Get student profile from DynamoDB
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
const getStudentProfile = async (studentId) => {
  if (!API_GATEWAY_STUDENT_PROFILES_URL) {
    throw new Error(
      'API Gateway Student Profiles URL is not configured. ' +
      'Please set API_GATEWAY_STUDENT_PROFILES_URL in your .env file.'
    );
  }

  try {
    const response = await axios.post(API_GATEWAY_STUDENT_PROFILES_URL, {
      operation: 'getStudentProfile',
      studentId: studentId,
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
 * @param {Object} studentData - Student signup data
 * @param {Object} file - Uploaded file (optional)
 * @throws {Error} If validation fails
 */
const validateSignupData = (studentData, file) => {
  const { email, name, password, contact, major, grad_year } = studentData;

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

  // Validate grad_year if provided
  if (grad_year !== undefined && grad_year !== null) {
    const year = parseInt(grad_year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      throw new Error('Graduation year must be a valid year');
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
 * Sign up a new student
 * @param {Object} studentData - Student signup data (includes both RDS and DynamoDB fields)
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Created student object and token (merged from RDS + DynamoDB)
 */
const signup = async (studentData, file) => {
  try {
    // Validate input data
    validateSignupData(studentData, file);

    // Check if email already exists
    const existingStudent = await studentRepository.getStudentByEmail(studentData.email);
    if (existingStudent) {
      throw new Error('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(studentData.password, SALT_ROUNDS);

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
        console.log('📄 Parsing resume to extract skills, projects, experiences, achievements, major, grad_year, relevant_coursework...');
        parsedResumeData = await parseResume(file.buffer, file.mimetype);
        console.log('✅ Resume parsed successfully:', {
          skillsCount: parsedResumeData.skills?.length || 0,
          projectsCount: parsedResumeData.projects?.length || 0,
          experiencesCount: parsedResumeData.experiences?.length || 0,
          achievementsCount: parsedResumeData.achievements?.length || 0,
          hasAspirations: !!parsedResumeData.aspirations,
          hasMajor: !!parsedResumeData.major,
          major: parsedResumeData.major || 'Not found',
          hasGradYear: !!parsedResumeData.grad_year,
          gradYear: parsedResumeData.grad_year || 'Not found',
          relevantCourseworkCount: parsedResumeData.relevant_coursework?.length || 0,
          linkedinUrl: parsedResumeData.linkedin_url || 'Not found',
          githubUrl: parsedResumeData.github_url || 'Not found',
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
      // RDS fields (atomic data)
      name,
      email,
      contact,
      linkedin_url,
      major,
      grad_year,
      // DynamoDB fields (profile data)
      skills,
      aspirations,
      parsed_resume,
      projects,
      experiences,
      achievements,
      relevant_coursework,
    } = studentData;

    // Merge LinkedIn URL - manual input takes precedence over parsed
    const mergedLinkedInUrl = linkedin_url?.trim() || parsedResumeData.linkedin_url || null;

    // Merge manually provided data with parsed resume data
    // Manually provided data takes precedence over parsed data
    const mergedSkills = skills !== undefined 
      ? (Array.isArray(skills) ? skills : (typeof skills === 'string' ? JSON.parse(skills) : []))
      : (parsedResumeData.skills || []);
    
    const mergedAspirations = aspirations !== undefined && aspirations?.trim()
      ? aspirations.trim()
      : (parsedResumeData.aspirations || null);
    
    const mergedMajor = major !== undefined && major !== null && major?.trim()
      ? major.trim()
      : (parsedResumeData.major || null);
    
    // Handle grad_year: use parsed value if not manually provided (null or undefined)
    const mergedGradYear = (grad_year !== undefined && grad_year !== null)
      ? (typeof grad_year === 'number' ? grad_year : parseInt(grad_year))
      : (parsedResumeData.grad_year || null);
    
    const mergedProjects = projects !== undefined
      ? (Array.isArray(projects) ? projects : (typeof projects === 'string' ? JSON.parse(projects) : []))
      : (parsedResumeData.projects || []);
    
    const mergedExperiences = experiences !== undefined
      ? (Array.isArray(experiences) ? experiences : (typeof experiences === 'string' ? JSON.parse(experiences) : []))
      : (parsedResumeData.experiences || []);
    
    const mergedAchievements = achievements !== undefined
      ? (Array.isArray(achievements) ? achievements : (typeof achievements === 'string' ? JSON.parse(achievements) : []))
      : (parsedResumeData.achievements || []);
    
    const mergedRelevantCoursework = relevant_coursework !== undefined
      ? (Array.isArray(relevant_coursework) ? relevant_coursework : (typeof relevant_coursework === 'string' ? JSON.parse(relevant_coursework) : []))
      : (parsedResumeData.relevant_coursework || []);

    // Prepare RDS data (atomic fields) - auto-populate from parsed resume if not provided
    const rdsData = {
      name,
      email,
      password: hashedPassword,
      contact,
      linkedin_url: mergedLinkedInUrl,
      major: mergedMajor,
      grad_year: mergedGradYear,
    };

    // Log major and grad_year being stored in RDS
    console.log('📝 Storing student data in RDS:', {
      hasMajor: !!mergedMajor,
      major: mergedMajor || 'Not provided',
      hasGradYear: !!mergedGradYear,
      gradYear: mergedGradYear || 'Not provided',
      source: {
        majorFromResume: !!parsedResumeData.major,
        majorFromManual: major !== undefined && major?.trim(),
        gradYearFromResume: !!parsedResumeData.grad_year,
        gradYearFromManual: grad_year !== undefined,
      },
    });

    // Create student in RDS PostgreSQL
    const newStudent = await studentRepository.createStudent(rdsData);
    
    // Log what was returned from database
    console.log('📊 Student created in RDS, returned data:', {
      student_id: newStudent.student_id,
      major: newStudent.major,
      grad_year: newStudent.grad_year,
      grad_year_type: typeof newStudent.grad_year,
    });

    // Prepare DynamoDB profile data (if any profile fields provided)
    // Include parsed resume data structure for reference
    const hasProfileData = mergedSkills.length > 0 || mergedAspirations || 
                           mergedProjects.length > 0 || mergedExperiences.length > 0 || 
                           mergedAchievements.length > 0 || mergedRelevantCoursework.length > 0 ||
                           parsed_resume || resumeUrl || parsedResumeData.github_url;

    if (hasProfileData) {
      // Create parsed_resume object with only metadata (no duplicate data)
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
        parsed_resume: parsedResumeObject,
        projects: mergedProjects,
        experiences: mergedExperiences,
        achievements: mergedAchievements,
        relevant_coursework: mergedRelevantCoursework,
        resume_url: resumeUrl || null,
        github_url: parsedResumeData.github_url || null,
      };

      // Save profile to DynamoDB
      try {
        console.log('💾 Saving profile to DynamoDB:', {
          studentId: newStudent.student_id,
          hasRelevantCoursework: mergedRelevantCoursework.length > 0,
          relevantCourseworkCount: mergedRelevantCoursework.length,
          relevantCoursework: mergedRelevantCoursework.slice(0, 5),
          profileDataKeys: Object.keys(profileData),
        });
        await saveStudentProfile(newStudent.student_id, profileData);
        console.log('✅ Profile saved successfully for student:', newStudent.student_id);
      } catch (profileError) {
        // Log error but don't fail signup if profile save fails
        console.error('Failed to save profile during signup:', profileError);
        // Optionally, you could rollback the RDS insert here if needed
      }
    }

    // Get merged data (RDS + DynamoDB)
    // Use the newly created student object directly to avoid potential timing issues
    const mergedStudent = await getStudentWithProfile(newStudent.student_id);
    
    // Log merged student data to verify fields
    console.log('📋 Merged student data before returning:', {
      student_id: mergedStudent?.student_id,
      major: mergedStudent?.major,
      grad_year: mergedStudent?.grad_year,
      grad_year_type: typeof mergedStudent?.grad_year,
      hasRelevantCoursework: !!mergedStudent?.relevant_coursework,
      relevantCourseworkCount: mergedStudent?.relevant_coursework?.length || 0,
      relevantCoursework: mergedStudent?.relevant_coursework?.slice(0, 3) || [],
      extractedRelevantCourseworkCount: mergedRelevantCoursework?.length || 0,
      extractedRelevantCoursework: mergedRelevantCoursework?.slice(0, 3) || [],
    });
    
    // Fallback: If relevant_coursework was extracted but not in response (due to DynamoDB save/retrieval issues), add it
    if (mergedRelevantCoursework && mergedRelevantCoursework.length > 0) {
      if (!mergedStudent.relevant_coursework || mergedStudent.relevant_coursework.length === 0) {
        mergedStudent.relevant_coursework = mergedRelevantCoursework;
        console.log('⚠️ Relevant coursework not found in DynamoDB response, using extracted value (fallback):', {
          count: mergedRelevantCoursework.length,
          items: mergedRelevantCoursework.slice(0, 3),
        });
      } else {
        console.log('✅ Relevant coursework found in DynamoDB response:', {
          count: mergedStudent.relevant_coursework.length,
          items: mergedStudent.relevant_coursework.slice(0, 3),
        });
      }
    } else {
      console.log('ℹ️ No relevant coursework was extracted or merged');
    }

    // Generate JWT token
    const token = jwt.sign(
      { studentId: newStudent.student_id, email: newStudent.email, type: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      student: mergedStudent,
      token,
    };
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

/**
 * Login student
 * @param {string} email - Student email
 * @param {string} password - Student password
 * @returns {Promise<Object>} Student object and token
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

    // Get student by email
    const student = await studentRepository.getStudentByEmail(email);
    if (!student) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Get merged profile data
    const mergedStudent = await getStudentWithProfile(student.student_id);

    // Generate JWT token
    const token = jwt.sign(
      { studentId: student.student_id, email: student.email, type: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      student: mergedStudent,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all students with merged profiles
 * @returns {Promise<Array>} Array of student objects (merged from RDS + DynamoDB)
 */
const getAllStudents = async () => {
  try {
    // Get all students from RDS
    const students = await studentRepository.getAllStudents();
    
    // Get profiles from DynamoDB for all students
    const studentsWithProfiles = await Promise.all(
      students.map(async (student) => {
        try {
          const profile = await getStudentProfile(student.student_id);
          return {
            // RDS atomic data
            student_id: student.student_id,
            name: student.name,
            email: student.email,
            contact: student.contact,
            linkedin_url: student.linkedin_url,
            major: student.major,
            grad_year: student.grad_year,
            created_at: student.created_at,
            updated_at: student.updated_at,
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
          // If profile fetch fails, return student with empty profile fields
          console.error(`Failed to get profile for student ${student.student_id}:`, error);
          return {
            ...student,
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

    return studentsWithProfiles;
  } catch (error) {
    throw error;
  }
};

/**
 * Get student by ID
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Student object
 */
const getStudentById = async (studentId) => {
  try {
    const student = await studentRepository.getStudentById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    return student;
  } catch (error) {
    throw error;
  }
};

/**
 * Get student with extended profile (RDS + DynamoDB)
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Merged student data (RDS atomic data + DynamoDB profile data)
 */
const getStudentWithProfile = async (studentId) => {
  try {
    // Get basic info from RDS
    const student = await studentRepository.getStudentById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get extended profile from DynamoDB
    const profile = await getStudentProfile(studentId);

    // Merge data: Combine RDS atomic data with DynamoDB profile data
    // If profile exists, merge its fields directly into the student object
    if (profile) {
      return {
        // RDS atomic data
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        contact: student.contact,
        linkedin_url: student.linkedin_url,
        major: student.major,
        grad_year: student.grad_year,
        created_at: student.created_at,
        updated_at: student.updated_at,
        // DynamoDB profile data
        skills: profile.skills || [],
        aspirations: profile.aspirations || null,
        parsed_resume: profile.parsed_resume || null,
        projects: profile.projects || [],
        experiences: profile.experiences || [],
        achievements: profile.achievements || [],
        relevant_coursework: profile.relevant_coursework || [],
        resume_url: profile.resume_url || null,
      };
    } else {
      // No profile data, return only RDS data with empty profile fields
      return {
        ...student,
        skills: [],
        aspirations: null,
        parsed_resume: null,
        projects: [],
        experiences: [],
        achievements: [],
        relevant_coursework: [],
        resume_url: null,
      };
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Validate update data
 * @param {Object} updateData - Student update data
 * @param {Object} file - Uploaded file (optional)
 * @throws {Error} If validation fails
 */
const validateUpdateData = (updateData, file) => {
  const { name, grad_year } = updateData;

  // Validate name if provided
  if (name !== undefined && (!name || !name.trim())) {
    throw new Error('Name cannot be empty');
  }

  // Validate password if provided
  if (updateData.password !== undefined) {
    if (!updateData.password || updateData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  // Validate grad_year if provided
  if (grad_year !== undefined && grad_year !== null) {
    const year = parseInt(grad_year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      throw new Error('Graduation year must be a valid year');
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
 * Delete student profile from DynamoDB
 * @param {string} studentId - Student UUID
 * @returns {Promise<boolean>} True if profile was deleted
 */
const deleteStudentProfile = async (studentId) => {
  if (!API_GATEWAY_STUDENT_PROFILES_URL) {
    throw new Error(
      'API Gateway Student Profiles URL is not configured. ' +
      'Please set API_GATEWAY_STUDENT_PROFILES_URL in your .env file.'
    );
  }

  try {
    const response = await axios.post(API_GATEWAY_STUDENT_PROFILES_URL, {
      operation: 'deleteStudentProfile',
      studentId: studentId,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data && response.data.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('DynamoDB delete error:', error);
    if (error.response && error.response.status === 404) {
      // Profile doesn't exist, that's okay
      return false;
    }
    throw error;
  }
};

/**
 * Update student information (RDS + DynamoDB)
 * @param {string} studentId - Student UUID
 * @param {Object} updateData - Student update data (both RDS and DynamoDB fields)
 * @param {Object} file - Uploaded resume file (optional)
 * @returns {Promise<Object>} Updated student object (merged from RDS + DynamoDB)
 */
const updateStudent = async (studentId, updateData, file) => {
  try {
    // Validate input data
    validateUpdateData(updateData, file);

    // Check if student exists
    const existingStudent = await studentRepository.getStudentById(studentId);
    if (!existingStudent) {
      throw new Error('Student not found');
    }

    // Split update data: RDS vs DynamoDB
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
    } = updateData;

    // Prepare RDS update data
    const updateDataForDb = {};
    if (name !== undefined) updateDataForDb.name = name;
    if (contact !== undefined) updateDataForDb.contact = contact;
    if (linkedin_url !== undefined) updateDataForDb.linkedin_url = linkedin_url;
    if (major !== undefined) updateDataForDb.major = major;
    if (grad_year !== undefined) updateDataForDb.grad_year = grad_year;

    // Hash password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await studentRepository.updateStudentPassword(studentId, hashedPassword);
    }

    // Update student in RDS (only if there are RDS fields to update)
    let updatedStudent = existingStudent;
    if (Object.keys(updateDataForDb).length > 0) {
      updatedStudent = await studentRepository.updateStudent(studentId, updateDataForDb);
      if (!updatedStudent) {
        throw new Error('Student not found');
      }
    }

    // Prepare DynamoDB profile update data
    const hasProfileUpdates = skills !== undefined || aspirations !== undefined || 
                              parsed_resume !== undefined || projects !== undefined ||
                              experiences !== undefined || achievements !== undefined || file;

    if (hasProfileUpdates) {
      // Get current profile or create new one
      const currentProfile = await getStudentProfile(studentId);
      
      // Upload resume to S3 if provided
      let resumeUrl = currentProfile?.resume_url || null;
      if (file) {
        resumeUrl = await uploadResumeToS3(file.buffer, file.originalname, file.mimetype);
      }

      // Merge profile data
      const profileData = {
        skills: skills !== undefined ? (Array.isArray(skills) ? skills : (typeof skills === 'string' ? JSON.parse(skills) : [])) : (currentProfile?.skills || []),
        aspirations: aspirations !== undefined ? (aspirations?.trim() || null) : (currentProfile?.aspirations || null),
        parsed_resume: parsed_resume !== undefined ? (typeof parsed_resume === 'string' ? JSON.parse(parsed_resume) : parsed_resume) : (currentProfile?.parsed_resume || null),
        projects: projects !== undefined ? (Array.isArray(projects) ? projects : (typeof projects === 'string' ? JSON.parse(projects) : [])) : (currentProfile?.projects || []),
        experiences: experiences !== undefined ? (Array.isArray(experiences) ? experiences : (typeof experiences === 'string' ? JSON.parse(experiences) : [])) : (currentProfile?.experiences || []),
        achievements: achievements !== undefined ? (Array.isArray(achievements) ? achievements : (typeof achievements === 'string' ? JSON.parse(achievements) : [])) : (currentProfile?.achievements || []),
        resume_url: resumeUrl,
      };

      // Update profile in DynamoDB
      await saveStudentProfile(studentId, profileData);
    }

    // Return merged data
    return await getStudentWithProfile(studentId);
  } catch (error) {
    throw error;
  }
};

/**
 * Save or update extended student profile
 * @param {string} studentId - Student UUID
 * @param {Object} profileData - Extended profile data
 * @returns {Promise<Object>} Saved profile data
 */
const saveExtendedProfile = async (studentId, profileData) => {
  try {
    // Verify student exists
    const student = await studentRepository.getStudentById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Save to DynamoDB
    const savedProfile = await saveStudentProfile(studentId, profileData);
    return savedProfile;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete student from both RDS and DynamoDB
 * @param {string} studentId - Student UUID
 * @returns {Promise<boolean>} True if student was deleted
 */
const deleteStudent = async (studentId) => {
  try {
    // Check if student exists
    const existingStudent = await studentRepository.getStudentById(studentId);
    if (!existingStudent) {
      throw new Error('Student not found');
    }

    // Delete profile from DynamoDB first (if exists)
    try {
      const profile = await getStudentProfile(studentId);
      if (profile) {
        // Delete from DynamoDB via Lambda
        await deleteStudentProfile(studentId);
      }
    } catch (profileError) {
      // Log error but continue with RDS deletion
      console.error('Failed to delete profile from DynamoDB:', profileError);
    }

    // Delete student from RDS
    const deleted = await studentRepository.deleteStudent(studentId);

    if (!deleted) {
      throw new Error('Failed to delete student');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  signup,
  login,
  getAllStudents,
  getStudentById,
  getStudentWithProfile,
  updateStudent,
  saveExtendedProfile,
  deleteStudent,
  deleteStudentProfile,
  uploadResumeToS3,
};

