const pool = require('../config/db');
const { MatchingResultsModel } = require('../models/matchingResults.model');

/**
 * Matching Results Repository
 * Handles storage and retrieval of matching results
 */

/**
 * Save similarity scores from a batch run
 * @param {Array} scores - Array of {mentor_id, student_id, similarity_score, batch_timestamp}
 * @returns {Promise<number>} Number of inserted records
 */
const saveSimilarityScores = async (scores) => {
  if (!scores || scores.length === 0) {
    return 0;
  }

  const query = `
    INSERT INTO ${MatchingResultsModel.NIGHTLY_SIMILARITY_SCORES_TABLE} 
      (mentor_id, student_id, similarity_score, batch_timestamp)
    VALUES ${scores.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
    ON CONFLICT (mentor_id, student_id, batch_timestamp) 
    DO UPDATE SET similarity_score = EXCLUDED.similarity_score
  `;

  const values = scores.flatMap(score => [
    score.mentor_id,
    score.student_id,
    score.similarity_score,
    score.batch_timestamp,
  ]);

  try {
    const result = await pool.query(query, values);
    return scores.length;
  } catch (error) {
    console.error('Error saving similarity scores:', error);
    throw error;
  }
};

/**
 * Save or update mentor-student mappings
 * @param {Array} mappings - Array of {mentor_id, student_id, similarity_score, batch_timestamp}
 * @returns {Promise<number>} Number of updated/inserted records
 */
const saveMentorStudentMappings = async (mappings) => {
  if (!mappings || mappings.length === 0) {
    return 0;
  }

  // Use a transaction to ensure atomicity
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let updatedCount = 0;
    
    for (const mapping of mappings) {
      // First, deactivate any existing mappings for this student
      const deactivateQuery = `
        UPDATE ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE}
        SET is_active = FALSE
        WHERE student_id = $1 AND is_active = TRUE
      `;
      await client.query(deactivateQuery, [mapping.student_id]);
      
      // Insert or update the new mapping
      const upsertQuery = `
        INSERT INTO ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE} 
          (mentor_id, student_id, similarity_score, batch_timestamp, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (mentor_id, student_id)
        DO UPDATE SET 
          similarity_score = EXCLUDED.similarity_score,
          batch_timestamp = EXCLUDED.batch_timestamp,
          assigned_at = CASE 
            WHEN ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE}.is_active = FALSE 
            THEN NOW() 
            ELSE ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE}.assigned_at 
          END,
          is_active = TRUE
      `;
      
      await client.query(upsertQuery, [
        mapping.mentor_id,
        mapping.student_id,
        mapping.similarity_score,
        mapping.batch_timestamp,
      ]);
      
      updatedCount++;
    }
    
    await client.query('COMMIT');
    return updatedCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving mentor-student mappings:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get assigned mentor for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Mapping object or null
 */
const getAssignedMentor = async (studentId) => {
  const query = `
    SELECT 
      m.id,
      m.mentor_id,
      m.student_id,
      m.similarity_score,
      m.assigned_at,
      m.batch_timestamp,
      u.name as mentor_name,
      u.email as mentor_email
    FROM ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE} m
    JOIN users u ON u.id = m.mentor_id
    WHERE m.student_id = $1 AND m.is_active = TRUE
    ORDER BY m.assigned_at DESC
    LIMIT 1
  `;

  try {
    const result = await pool.query(query, [studentId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting assigned mentor:', error);
    throw error;
  }
};

/**
 * Get similarity scores for a student
 * @param {string} studentId - Student ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of similarity scores
 */
const getStudentSimilarityScores = async (studentId, limit = 10) => {
  const query = `
    SELECT 
      s.mentor_id,
      s.student_id,
      s.similarity_score,
      s.batch_timestamp,
      u.name as mentor_name,
      u.email as mentor_email
    FROM ${MatchingResultsModel.NIGHTLY_SIMILARITY_SCORES_TABLE} s
    JOIN users u ON u.id = s.mentor_id
    WHERE s.student_id = $1
    ORDER BY s.similarity_score DESC, s.batch_timestamp DESC
    LIMIT $2
  `;

  try {
    const result = await pool.query(query, [studentId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting student similarity scores:', error);
    throw error;
  }
};

/**
 * Get all active mappings for a mentor
 * @param {number} mentorId - Mentor ID
 * @returns {Promise<Array>} Array of mappings
 */
const getMentorMappings = async (mentorId) => {
  const query = `
    SELECT 
      m.id,
      m.mentor_id,
      m.student_id,
      m.similarity_score,
      m.assigned_at,
      m.batch_timestamp
    FROM ${MatchingResultsModel.MENTOR_STUDENT_MAPPING_TABLE} m
    WHERE m.mentor_id = $1 AND m.is_active = TRUE
    ORDER BY m.assigned_at DESC
  `;

  try {
    const result = await pool.query(query, [mentorId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting mentor mappings:', error);
    throw error;
  }
};

module.exports = {
  saveSimilarityScores,
  saveMentorStudentMappings,
  getAssignedMentor,
  getStudentSimilarityScores,
  getMentorMappings,
};

