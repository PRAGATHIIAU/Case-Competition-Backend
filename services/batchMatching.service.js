const { spawn } = require('child_process');
const path = require('path');
const { getAllMentors, getAllMentees } = require('./matching.service');
const { 
  saveSimilarityScores, 
  saveMentorStudentMappings,
  getAssignedMentor,
  getStudentSimilarityScores 
} = require('../repositories/matchingResults.repository');
const { getChangesCountLast24Hours, clearAllLogs } = require('../repositories/profileChangeLog.repository');
const pool = require('../config/db');
const { 
  CREATE_NIGHTLY_SIMILARITY_SCORES_TABLE, 
  CREATE_MENTOR_STUDENT_MAPPING_TABLE 
} = require('../models/matchingResults.model');

/**
 * Batch Matching Service
 * Handles nightly batch processing for mentor-mentee matching
 */

/**
 * Initialize database tables if they don't exist
 */
const initializeTables = async () => {
  try {
    await pool.query(CREATE_NIGHTLY_SIMILARITY_SCORES_TABLE);
    await pool.query(CREATE_MENTOR_STUDENT_MAPPING_TABLE);
    console.log('✅ Matching results tables initialized');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};

/**
 * Run batch matching process
 * @returns {Promise<Object>} Batch matching results
 */
const runBatchMatching = async () => {
  try {
    // Initialize tables if needed
    await initializeTables();

    // Check for changes in last 24 hours
    const changesCount = await getChangesCountLast24Hours();
    
    if (changesCount === 0) {
      return {
        success: true,
        message: 'No new users or updates. Skipping batch.',
        stats: {
          changesCount: 0,
          mentorsCount: 0,
          menteesCount: 0,
          scoresSaved: 0,
          mappingsUpdated: 0,
        },
        updatedMappingsCount: 0,
      };
    }

    console.log(`📊 Found ${changesCount} profile changes in last 24 hours. Running batch matching...`);

    // Fetch all mentors and mentees
    const mentors = await getAllMentors();
    const mentees = await getAllMentees();

    console.log(`📋 Fetched ${mentors.length} mentors and ${mentees.length} mentees`);

    if (mentors.length === 0 || mentees.length === 0) {
      return {
        success: true,
        message: 'No mentors or mentees available for matching',
        stats: {
          changesCount,
          mentorsCount: mentors.length,
          menteesCount: mentees.length,
          scoresSaved: 0,
          mappingsUpdated: 0,
        },
        updatedMappingsCount: 0,
      };
    }

    // Prepare input data for Python script with ALL meaningful profile data
    const inputData = {
      mentors: mentors.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        skills: m.skills || [],
        projects: m.projects || [],
        experiences: m.experiences || [],
        achievements: m.achievements || [],
        aspirations: m.aspirations || null,
        parsed_resume: m.parsed_resume || null, // Include parsed resume for rich context
        bio: m.bio || null, // Include bio if available
        location: m.location || null,
        willing_to_be_mentor: m.willing_to_be_mentor || false,
        mentor_capacity: m.mentor_capacity || 0,
        // Include additional context fields if available
        major: m.major || null,
        grad_year: m.grad_year || null,
        relevant_coursework: m.relevant_coursework || [],
      })),
      mentees: mentees.map(s => ({
        id: s.student_id || s.id,
        student_id: s.student_id || s.id,
        name: s.name,
        email: s.email,
        skills: s.skills || [],
        projects: s.projects || [],
        experiences: s.experiences || [],
        achievements: s.achievements || [],
        aspirations: s.aspirations || null,
        parsed_resume: s.parsed_resume || null, // Include parsed resume for rich context
        major: s.major || null,
        grad_year: s.grad_year || null, // Include grad_year for context
        relevant_coursework: s.relevant_coursework || [],
        mentor_preference: s.mentor_preference || null,
        location: s.location || null,
        mentorship_interest: s.mentorship_interest || false,
        mentor_paired: s.mentor_paired || false,
        // Include additional context if available
        linkedin_url: s.linkedin_url || null,
      })),
    };

    // Get Python script path
    const scriptPath = path.join(__dirname, '..', 'matching', 'mentor_mentee_matcher.py');

    // Execute Python script with STDIN input
    const result = await executePythonScript(scriptPath, inputData);

    if (!result.success) {
      throw new Error(result.message || 'Python script execution failed');
    }

    // Extract results
    const { matches, statistics } = result;

    // Prepare batch timestamp
    const batchTimestamp = new Date().toISOString();

    // Save similarity scores
    const similarityScores = [];
    for (const [mentorIdStr, matchData] of Object.entries(matches || {})) {
      const mentorId = parseInt(mentorIdStr, 10);
      if (matchData.mentees && Array.isArray(matchData.mentees)) {
        for (const mentee of matchData.mentees) {
          similarityScores.push({
            mentor_id: mentorId,
            student_id: mentee.mentee_id,
            similarity_score: mentee.similarity_score || 0,
            batch_timestamp: batchTimestamp,
          });
        }
      }
    }

    let scoresSaved = 0;
    if (similarityScores.length > 0) {
      scoresSaved = await saveSimilarityScores(similarityScores);
      console.log(`💾 Saved ${scoresSaved} similarity scores`);
    }

    // Save mentor-student mappings (respecting capacity)
    const mappings = [];
    for (const [mentorIdStr, matchData] of Object.entries(matches || {})) {
      const mentorId = parseInt(mentorIdStr, 10);
      if (matchData.mentees && Array.isArray(matchData.mentees) && matchData.mentees.length > 0) {
        // Only take the top student (first one, already sorted by similarity)
        const topMentee = matchData.mentees[0];
        mappings.push({
          mentor_id: mentorId,
          student_id: topMentee.mentee_id,
          similarity_score: topMentee.similarity_score || 0,
          batch_timestamp: batchTimestamp,
        });
      }
    }

    let mappingsUpdated = 0;
    if (mappings.length > 0) {
      mappingsUpdated = await saveMentorStudentMappings(mappings);
      console.log(`💾 Updated ${mappingsUpdated} mentor-student mappings`);
    }

    return {
      success: true,
      message: 'Batch run completed',
      stats: {
        changesCount,
        mentorsCount: mentors.length,
        menteesCount: mentees.length,
        scoresSaved,
        mappingsUpdated,
        totalMatches: Object.keys(matches || {}).length,
      },
      updatedMappingsCount: mappingsUpdated,
      statistics: statistics || {},
    };
  } catch (error) {
    console.error('Batch matching error:', error);
    throw error;
  }
};

/**
 * Execute Python script with JSON input via STDIN
 * @param {string} scriptPath - Path to Python script
 * @param {Object} inputData - Input data to send via STDIN
 * @returns {Promise<Object>} Parsed JSON output from script
 */
const executePythonScript = (scriptPath, inputData) => {
  return new Promise((resolve, reject) => {
    // Detect Python command
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    // Spawn Python process
    const pythonProcess = spawn(pythonCommand, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Send input data via STDIN
    const inputJson = JSON.stringify(inputData);
    pythonProcess.stdin.write(inputJson);
    pythonProcess.stdin.end();

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script stderr:', stderrData);
        reject(new Error(`Python script exited with code ${code}. stderr: ${stderrData.substring(0, 1000)}`));
        return;
      }

      // Parse JSON output
      try {
        const outputJson = stdoutData.trim();
        
        // Remove BOM if present
        const cleanOutput = outputJson.charCodeAt(0) === 0xFEFF 
          ? outputJson.slice(1) 
          : outputJson;

        if (!cleanOutput || (!cleanOutput.startsWith('{') && !cleanOutput.startsWith('['))) {
          reject(new Error(`Python script output is not valid JSON. Output: ${cleanOutput.substring(0, 200)}`));
          return;
        }

        const result = JSON.parse(cleanOutput);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError);
        console.error('Output:', stdoutData.substring(0, 500));
        reject(new Error(`Failed to parse JSON output: ${parseError.message}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
};

/**
 * Get recommendations for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Recommendations with assigned mentor and similarity scores
 */
const getStudentRecommendations = async (studentId) => {
  try {
    // Get assigned mentor
    const assignedMentor = await getAssignedMentor(studentId);

    // Get top similarity scores
    const similarityScores = await getStudentSimilarityScores(studentId, 10);

    return {
      assignedMentor: assignedMentor || null,
      similarityScores: similarityScores || [],
      hasAssignment: !!assignedMentor,
    };
  } catch (error) {
    console.error('Error getting student recommendations:', error);
    throw error;
  }
};

/**
 * Get assignment details for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Assignment details
 */
const getStudentAssignment = async (studentId) => {
  try {
    const assignment = await getAssignedMentor(studentId);
    
    if (!assignment) {
      return {
        assigned: false,
        mentor: null,
        metadata: null,
      };
    }

    return {
      assigned: true,
      mentor: {
        id: assignment.mentor_id,
        name: assignment.mentor_name,
        email: assignment.mentor_email,
      },
      metadata: {
        similarityScore: assignment.similarity_score,
        assignedAt: assignment.assigned_at,
        batchTimestamp: assignment.batch_timestamp,
      },
    };
  } catch (error) {
    console.error('Error getting student assignment:', error);
    throw error;
  }
};

module.exports = {
  runBatchMatching,
  getStudentRecommendations,
  getStudentAssignment,
  getChangesCountLast24Hours,
  clearAllLogs,
};

