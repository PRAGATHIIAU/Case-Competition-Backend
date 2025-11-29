const { exec } = require('child_process');
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
    const mentorsWithProfiles = await Promise.all(
      mentorUsers.map(async (user) => {
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
          console.error(`Failed to get profile for mentor ${user.id}:`, error);
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
    const tempInputFile = path.join(matchingDir, `temp_input_${Date.now()}.json`);
    const tempOutputFile = path.join(matchingDir, `temp_output_${Date.now()}.json`);
    
    let result;
    try {
      // Write input to temp file
      await fs.writeFile(tempInputFile, inputJson, 'utf8');
      
      // Execute Python script with file path as argument (more reliable than stdin)
      // The Python script supports reading from a file if path is provided as argument
      // Redirect stderr to null device to prevent mixing with JSON output on stdout
      const isWindows = process.platform === 'win32';
      const nullDevice = isWindows ? 'nul' : '/dev/null';
      const command = `${pythonCommand} "${scriptPath}" "${tempInputFile}" > "${tempOutputFile}" 2>${nullDevice}`;
      
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: true
      });
      
      // Read output from temp file (should only contain JSON from stdout)
      let outputJson;
      try {
        outputJson = await fs.readFile(tempOutputFile, 'utf8');
        outputJson = outputJson.trim();
        
        // Remove any BOM or leading whitespace that might interfere
        if (outputJson.charCodeAt(0) === 0xFEFF) {
          outputJson = outputJson.slice(1);
        }
      } catch (readError) {
        throw new Error(`Failed to read Python script output: ${readError.message}`);
      }
      
      // Clean up temp files
      await Promise.all([
        fs.unlink(tempInputFile).catch(() => {}),
        fs.unlink(tempOutputFile).catch(() => {})
      ]);
      
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
      // Clean up temp files on error
      await Promise.all([
        fs.unlink(tempInputFile).catch(() => {}),
        fs.unlink(tempOutputFile).catch(() => {})
      ]);
      
      // If parsing failed, try to read what was in the output file to debug
      try {
        const errorOutput = await fs.readFile(tempOutputFile, 'utf8').catch(() => '');
        console.error('Python script stdout output (non-JSON):', errorOutput.substring(0, 500));
        console.error('JSON parse error details:', error.message);
      } catch (readError) {
        // Ignore read error
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

