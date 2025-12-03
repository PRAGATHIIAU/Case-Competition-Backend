const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const userRepository = require('../repositories/user.repository');
const { getAlumniProfile } = require('./auth.service');
const { getAllStudents, getStudentWithProfile } = require('./student.service');

const execAsync = promisify(exec);

/**
 * Matching Service
 * Handles mentor-mentee matching using Python script
 */

/**
 * Get all mentors (alumni willing to be mentors)
 * @returns {Promise<Array>} Array of mentor profiles (merged from RDS + DynamoDB)
 */
const getAllMentors = async () => {
  try {
    // Use direct database query to filter mentors (more efficient and reliable)
    let mentorUsers;
    try {
      // Try using the direct query first
      mentorUsers = await userRepository.getMentorUsers();
      console.log(`[getAllMentors] Found ${mentorUsers.length} mentors using direct query`);
    } catch (error) {
      // Fallback: Get all users and filter in JavaScript
      console.log(`[getAllMentors] Direct query failed, using fallback filter method`);
      const users = await userRepository.getAllUsers();
      console.log(`[getAllMentors] Total users fetched: ${users.length}`);
      
      if (users.length > 0) {
        console.log(`[getAllMentors] Sample user willing_to_be_mentor value:`, users[0].willing_to_be_mentor, `(type: ${typeof users[0].willing_to_be_mentor})`);
      }
      
      // Filter only users willing to be mentors
      // Handle boolean values from PostgreSQL (pg library converts to JS boolean, but be defensive)
      // Also handle string values ('yes', 'true', 't') or numeric (1) in case of data inconsistency
      mentorUsers = users.filter(user => {
        const willing = user.willing_to_be_mentor;
        // Check for JavaScript boolean true
        if (willing === true) return true;
        // Check for string representations
        if (typeof willing === 'string' && (willing.toLowerCase() === 'true' || willing.toLowerCase() === 'yes' || willing.toLowerCase() === 't')) return true;
        // Check for numeric (1 = true, 0 = false)
        if (willing === 1) return true;
        return false;
      });
      
      console.log(`[getAllMentors] Users willing to be mentors (after filter): ${mentorUsers.length}`);
    }
    
    // Get profiles from DynamoDB for all mentors
    // Use Promise.allSettled to ensure all mentors are processed even if some profiles fail
    const profileResults = await Promise.allSettled(
      mentorUsers.map(async (user) => {
        try {
          const profile = await getAlumniProfile(user.id);
          return {
            user,
            profile,
          };
        } catch (error) {
          // This should rarely happen now since getAlumniProfile returns null on errors
          console.warn(`Unexpected error getting profile for mentor ${user.id}:`, error.message);
          return {
            user,
            profile: null,
          };
        }
      })
    );
    
    // Process results and build mentor objects
    const mentorsWithProfiles = profileResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        const { user, profile } = result.value;
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
          location: profile?.location || null,
        };
      } else {
        // If Promise.allSettled result is rejected (shouldn't happen with our error handling)
        const user = mentorUsers[index];
        console.warn(`Profile fetch rejected for mentor ${user?.id || 'unknown'}:`, result.reason);
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
    });
    
    return mentorsWithProfiles;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all mentees (students)
 * @returns {Promise<Array>} Array of student profiles (merged from RDS + DynamoDB)
 */
const getAllMentees = async () => {
  try {
    // getAllStudents already merges RDS and DynamoDB data
    const studentsWithProfiles = await getAllStudents();
    return studentsWithProfiles;
  } catch (error) {
    throw error;
  }
};

/**
 * Perform mentor-mentee matching using Python script
 * @param {number|null} mentorId - Optional mentor ID to filter matching to a specific mentor
 * @returns {Promise<Object>} Matching results
 */
const performMatching = async (mentorId = null) => {
  try {
    // Fetch all mentors and mentees
    let mentors = await getAllMentors();
    
    // If mentorId is provided, filter to only that mentor
    if (mentorId !== null && mentorId !== undefined) {
      const mentorIdNum = typeof mentorId === 'string' ? parseInt(mentorId, 10) : Number(mentorId);
      if (isNaN(mentorIdNum)) {
        throw new Error('Invalid mentor ID. Must be a valid number.');
      }
      
      // Filter mentors to only include the specified mentor
      mentors = mentors.filter(mentor => mentor.id === mentorIdNum);
      
      if (mentors.length === 0) {
        // Check if mentor exists but is not willing to be a mentor
        const userRepository = require('../repositories/user.repository');
        const user = await userRepository.getUserById(mentorIdNum);
        
        if (!user) {
          throw new Error(`Mentor with ID ${mentorIdNum} not found.`);
        }
        
        if (!user.willing_to_be_mentor) {
          throw new Error(`User with ID ${mentorIdNum} is not willing to be a mentor.`);
        }
        
        // If user exists and is willing, but not in mentors list, there might be an issue
        throw new Error(`Mentor with ID ${mentorIdNum} could not be retrieved for matching.`);
      }
      
      console.log(`[performMatching] Filtered to mentor ID: ${mentorIdNum}`);
    }
    
    const mentees = await getAllMentees();
    
    // Prepare input data for Python script
    const inputData = {
      mentors,
      mentees
    };
    
    // Get path to Python script
    const scriptPath = path.join(__dirname, '..', 'matching', 'mentor_mentee_matcher.py');
    
    // Check if Python script exists
    try {
      await fs.access(scriptPath);
    } catch (error) {
      throw new Error(`Python matching script not found at ${scriptPath}`);
    }
    
    // Convert input data to JSON string
    const inputJson = JSON.stringify(inputData);
    
    // Detect Python command (try 'python' first, then 'python3')
    let pythonCommand = 'python';
    try {
      await execAsync('python --version');
    } catch (error) {
      try {
        await execAsync('python3 --version');
        pythonCommand = 'python3';
      } catch (error2) {
        throw new Error('Python is not installed or not found in PATH. Please install Python 3.');
      }
    }
    
    // Use file-based approach for better cross-platform compatibility
    const matchingDir = path.join(__dirname, '..', 'matching');
    const timestamp = Date.now();
    const tempInputFile = path.join(matchingDir, `temp_input_${timestamp}.json`);
    
    let result;
    let stdoutData = '';
    let stderrData = '';
    let outputJson = '';
    
    try {
      // Write input to temp file
      await fs.writeFile(tempInputFile, inputJson, 'utf8');
      
      // Execute Python script using spawn for better error handling
      // This approach works better on Windows PowerShell
      
      const pythonProcess = spawn(pythonCommand, [scriptPath, tempInputFile], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      // Wait for process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python script exited with code ${code}. stderr: ${stderrData.substring(0, 1000)}`));
          } else {
            resolve();
          }
        });
        
        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to spawn Python process: ${error.message}. stderr: ${stderrData.substring(0, 1000)}`));
        });
      });
      
      // Process output
      outputJson = stdoutData.trim();
      
      // Remove any BOM or leading whitespace that might interfere
      if (outputJson.length > 0 && outputJson.charCodeAt(0) === 0xFEFF) {
        outputJson = outputJson.slice(1);
      }
      
      // Log stderr if there's any (for debugging, but don't fail if it's just warnings)
      if (stderrData.trim()) {
        console.warn('Python script stderr (warnings/info):', stderrData.substring(0, 500));
      }
      
      // Clean up temp input file
      await fs.unlink(tempInputFile).catch(() => {});
      
      // Validate that output starts with JSON (either { or [)
      if (!outputJson || (!outputJson.startsWith('{') && !outputJson.startsWith('['))) {
        throw new Error(`Python script output is not valid JSON. Output: ${outputJson.substring(0, 200)}`);
      }
      
      // Parse JSON output
      try {
        result = JSON.parse(outputJson);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON output: ${parseError.message}. Output preview: ${outputJson.substring(0, 500)}`);
      }
    } catch (error) {
      // Clean up temp input file on error
      await fs.unlink(tempInputFile).catch(() => {});
      
      // Log error details for debugging
      console.error('Python script execution error:', error.message);
      if (stderrData) {
        console.error('Python script stderr:', stderrData.substring(0, 1000));
      }
      if (stdoutData) {
        console.error('Python script stdout (on error):', stdoutData.substring(0, 500));
      }
      
      throw new Error(`Failed to execute matching script: ${error.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('Matching service error:', error);
    throw error;
  }
};

/**
 * Find similar students for a specific mentor
 * @param {number} mentorId - Mentor ID
 * @returns {Promise<Array>} Array of student IDs with similarity scores, sorted by score (descending)
 */
const findSimilarStudentsForMentor = async (mentorId) => {
  try {
    // Validate mentorId
    const mentorIdNum = typeof mentorId === 'string' ? parseInt(mentorId, 10) : Number(mentorId);
    if (isNaN(mentorIdNum)) {
      throw new Error('Mentor ID must be a valid number');
    }

    // Get user directly from users table by ID (not filtered by willing_to_be_mentor)
    const user = await userRepository.getUserById(mentorIdNum);
    
    if (!user) {
      throw new Error('Mentor not found');
    }

    // Get alumni profile from DynamoDB
    const profile = await getAlumniProfile(mentorIdNum);

    // Merge user data with profile data (similar to getUserWithProfile)
    const mentor = {
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
      location: profile?.location || null,
    };

    // Get all students
    const students = await getAllMentees();

    if (students.length === 0) {
      return [];
    }

    // Prepare mentor data for Python script
    // Set mentor_capacity to a high value to ensure all similarity scores are returned
    const mentorForMatching = {
      ...mentor,
      willing_to_be_mentor: true,
      mentor_capacity: students.length, // Set capacity to number of students to get all scores
    };

    // Prepare input data for Python script (one mentor, all students)
    const inputData = {
      mentors: [mentorForMatching],
      mentees: students
    };

    // Get path to Python script
    const scriptPath = path.join(__dirname, '..', 'matching', 'mentor_mentee_matcher.py');

    // Check if Python script exists
    try {
      await fs.access(scriptPath);
    } catch (error) {
      throw new Error(`Python matching script not found at ${scriptPath}`);
    }

    // Convert input data to JSON string
    const inputJson = JSON.stringify(inputData);

    // Detect Python command (try 'python' first, then 'python3')
    let pythonCommand = 'python';
    try {
      await execAsync('python --version');
    } catch (error) {
      try {
        await execAsync('python3 --version');
        pythonCommand = 'python3';
      } catch (error2) {
        throw new Error('Python is not installed or not found in PATH. Please install Python 3.');
      }
    }

    // Use file-based approach for better cross-platform compatibility
    const matchingDir = path.join(__dirname, '..', 'matching');
    const timestamp = Date.now();
    const tempInputFile = path.join(matchingDir, `temp_input_${timestamp}.json`);

    let result;
    let stdoutData = '';
    let stderrData = '';
    let outputJson = '';

    try {
      // Write input to temp file
      await fs.writeFile(tempInputFile, inputJson, 'utf8');

      // Execute Python script using spawn for better error handling
      const pythonProcess = spawn(pythonCommand, [scriptPath, tempInputFile], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      // Wait for process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python script exited with code ${code}. stderr: ${stderrData.substring(0, 1000)}`));
          } else {
            resolve();
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to spawn Python process: ${error.message}. stderr: ${stderrData.substring(0, 1000)}`));
        });
      });

      // Process output
      outputJson = stdoutData.trim();

      // Remove any BOM or leading whitespace that might interfere
      if (outputJson.length > 0 && outputJson.charCodeAt(0) === 0xFEFF) {
        outputJson = outputJson.slice(1);
      }

      // Log stderr if there's any (for debugging, but don't fail if it's just warnings)
      if (stderrData.trim()) {
        console.warn('Python script stderr (warnings/info):', stderrData.substring(0, 500));
      }

      // Clean up temp input file
      await fs.unlink(tempInputFile).catch(() => {});

      // Validate that output starts with JSON (either { or [)
      if (!outputJson || (!outputJson.startsWith('{') && !outputJson.startsWith('['))) {
        throw new Error(`Python script output is not valid JSON. Output: ${outputJson.substring(0, 200)}`);
      }

      // Parse JSON output
      try {
        result = JSON.parse(outputJson);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON output: ${parseError.message}. Output preview: ${outputJson.substring(0, 500)}`);
      }
    } catch (error) {
      // Clean up temp input file on error
      await fs.unlink(tempInputFile).catch(() => {});

      // Log error details for debugging
      console.error('Python script execution error:', error.message);
      if (stderrData) {
        console.error('Python script stderr:', stderrData.substring(0, 1000));
      }
      if (stdoutData) {
        console.error('Python script stdout (on error):', stdoutData.substring(0, 500));
      }

      throw new Error(`Failed to execute matching script: ${error.message}`);
    }

    // Extract similarity scores from the result
    // The result.matches object has mentor IDs as keys
    // Since we passed only one mentor, there should be one key
    const mentorIdStr = String(mentorIdNum);
    const mentorMatch = result.matches?.[mentorIdStr];

    if (!mentorMatch || !mentorMatch.mentees || mentorMatch.mentees.length === 0) {
      // If no matches found, return empty array
      return [];
    }

    // Extract student IDs with similarity scores
    // Sort by similarity score (descending)
    const studentScores = mentorMatch.mentees
      .map(mentee => ({
        student_id: mentee.mentee_id,
        similarity_score: mentee.similarity_score || 0
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score);

    // Return student IDs with similarity scores in descending order of similarity
    return studentScores;
  } catch (error) {
    console.error('Find similar students error:', error);
    throw error;
  }
};

/**
 * Find similar mentors for a specific student
 * @param {string} studentId - Student ID (UUID)
 * @returns {Promise<Array>} Array of mentor IDs with similarity scores, sorted by score (descending)
 */
const findSimilarMentorsForStudent = async (studentId) => {
  try {
    // Validate studentId (UUID format)
    if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
      throw new Error('Student ID must be a valid UUID string');
    }

    // Get student with merged profile data
    const student = await getStudentWithProfile(studentId);
    
    if (!student) {
      throw new Error('Student not found');
    }

    // Get all mentors
    const mentors = await getAllMentors();

    if (mentors.length === 0) {
      return [];
    }

    // Prepare student data for Python script (as mentee)
    // Ensure student has student_id field (can be id or student_id)
    const studentForMatching = {
      ...student,
      student_id: student.student_id || student.id,
    };

    // Prepare mentors data for Python script
    // Set each mentor's capacity to 1 so they can all receive one copy of the student
    // We'll duplicate the student so each mentor can get assigned one copy
    const mentorsForMatching = mentors.map(mentor => ({
      ...mentor,
      willing_to_be_mentor: true,
      mentor_capacity: 1, // Each mentor can take 1 mentee
    }));

    // Duplicate the student so each mentor can receive one copy
    // This allows us to get similarity scores for all mentors
    // Each student copy will have a unique ID but same profile data
    const studentCopies = mentorsForMatching.map((mentor, index) => ({
      ...studentForMatching,
      student_id: `${studentForMatching.student_id}_copy_${index}`, // Temporary unique ID
      original_student_id: studentForMatching.student_id, // Keep track of original
    }));

    // Prepare input data for Python script (duplicated students as mentees, all mentors)
    const inputData = {
      mentors: mentorsForMatching,
      mentees: studentCopies
    };

    // Get path to Python script
    const scriptPath = path.join(__dirname, '..', 'matching', 'mentor_mentee_matcher.py');

    // Check if Python script exists
    try {
      await fs.access(scriptPath);
    } catch (error) {
      throw new Error(`Python matching script not found at ${scriptPath}`);
    }

    // Convert input data to JSON string
    const inputJson = JSON.stringify(inputData);

    // Detect Python command (try 'python' first, then 'python3')
    let pythonCommand = 'python';
    try {
      await execAsync('python --version');
    } catch (error) {
      try {
        await execAsync('python3 --version');
        pythonCommand = 'python3';
      } catch (error2) {
        throw new Error('Python is not installed or not found in PATH. Please install Python 3.');
      }
    }

    // Use file-based approach for better cross-platform compatibility
    const matchingDir = path.join(__dirname, '..', 'matching');
    const timestamp = Date.now();
    const tempInputFile = path.join(matchingDir, `temp_input_${timestamp}.json`);

    let result;
    let stdoutData = '';
    let stderrData = '';
    let outputJson = '';

    try {
      // Write input to temp file
      await fs.writeFile(tempInputFile, inputJson, 'utf8');

      // Execute Python script using spawn for better error handling
      const pythonProcess = spawn(pythonCommand, [scriptPath, tempInputFile], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      // Wait for process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python script exited with code ${code}. stderr: ${stderrData.substring(0, 1000)}`));
          } else {
            resolve();
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to spawn Python process: ${error.message}. stderr: ${stderrData.substring(0, 1000)}`));
        });
      });

      // Process output
      outputJson = stdoutData.trim();

      // Remove any BOM or leading whitespace that might interfere
      if (outputJson.length > 0 && outputJson.charCodeAt(0) === 0xFEFF) {
        outputJson = outputJson.slice(1);
      }

      // Log stderr if there's any (for debugging, but don't fail if it's just warnings)
      if (stderrData.trim()) {
        console.warn('Python script stderr (warnings/info):', stderrData.substring(0, 500));
      }

      // Clean up temp input file
      await fs.unlink(tempInputFile).catch(() => {});

      // Validate that output starts with JSON (either { or [)
      if (!outputJson || (!outputJson.startsWith('{') && !outputJson.startsWith('['))) {
        throw new Error(`Python script output is not valid JSON. Output: ${outputJson.substring(0, 200)}`);
      }

      // Parse JSON output
      try {
        result = JSON.parse(outputJson);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON output: ${parseError.message}. Output preview: ${outputJson.substring(0, 500)}`);
      }
    } catch (error) {
      // Clean up temp input file on error
      await fs.unlink(tempInputFile).catch(() => {});

      // Log error details for debugging
      console.error('Python script execution error:', error.message);
      if (stderrData) {
        console.error('Python script stderr:', stderrData.substring(0, 1000));
      }
      if (stdoutData) {
        console.error('Python script stdout (on error):', stdoutData.substring(0, 500));
      }

      throw new Error(`Failed to execute matching script: ${error.message}`);
    }

    // Extract similarity scores from the result
    // The result.matches object has mentor IDs as keys
    // Since we duplicated the student for each mentor, each mentor should have one student copy assigned
    const mentorScores = [];

    if (result.matches && typeof result.matches === 'object') {
      // Iterate through all mentors in the matches
      for (const [mentorIdStr, mentorMatch] of Object.entries(result.matches)) {
        if (mentorMatch && mentorMatch.mentees && Array.isArray(mentorMatch.mentees) && mentorMatch.mentees.length > 0) {
          // Each mentor should have exactly one student copy assigned
          // Get the similarity score from the first (and only) mentee
          const studentMatch = mentorMatch.mentees[0];
          
          if (studentMatch && studentMatch.similarity_score !== undefined) {
            mentorScores.push({
              mentor_id: parseInt(mentorIdStr, 10),
              similarity_score: studentMatch.similarity_score || 0
            });
          }
        } else {
          // If mentor has no matches, they have zero similarity
          mentorScores.push({
            mentor_id: parseInt(mentorIdStr, 10),
            similarity_score: 0
          });
        }
      }
    }

    // Also include mentors that weren't in the matches (they have zero similarity)
    const matchedMentorIds = new Set(mentorScores.map(m => m.mentor_id));
    mentorsForMatching.forEach((mentor, index) => {
      if (!matchedMentorIds.has(mentor.id)) {
        mentorScores.push({
          mentor_id: mentor.id,
          similarity_score: 0
        });
      }
    });

    // Sort by similarity score (descending)
    mentorScores.sort((a, b) => b.similarity_score - a.similarity_score);

    // Return mentor IDs with similarity scores in descending order of similarity
    return mentorScores;
  } catch (error) {
    console.error('Find similar mentors error:', error);
    throw error;
  }
};

module.exports = {
  getAllMentors,
  getAllMentees,
  performMatching,
  findSimilarStudentsForMentor,
  findSimilarMentorsForStudent
};

