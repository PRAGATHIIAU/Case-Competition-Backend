const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const userRepository = require('../repositories/user.repository');
const { getAlumniProfile } = require('./auth.service');
const { getAllStudents } = require('./student.service');

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
 * @returns {Promise<Object>} Matching results
 */
const performMatching = async () => {
  try {
    // Fetch all mentors and mentees
    const [mentors, mentees] = await Promise.all([
      getAllMentors(),
      getAllMentees()
    ]);
    
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

module.exports = {
  getAllMentors,
  getAllMentees,
  performMatching
};

