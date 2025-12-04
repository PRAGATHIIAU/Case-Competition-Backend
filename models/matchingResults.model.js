/**
 * Matching Results Models
 * Stores similarity scores and mentor-student mappings
 */

const CREATE_NIGHTLY_SIMILARITY_SCORES_TABLE = `
  CREATE TABLE IF NOT EXISTS nightly_similarity_scores (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    similarity_score DECIMAL(5, 4) NOT NULL,
    batch_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(mentor_id, student_id, batch_timestamp)
  );

  CREATE INDEX IF NOT EXISTS idx_nightly_similarity_mentor ON nightly_similarity_scores(mentor_id);
  CREATE INDEX IF NOT EXISTS idx_nightly_similarity_student ON nightly_similarity_scores(student_id);
  CREATE INDEX IF NOT EXISTS idx_nightly_similarity_timestamp ON nightly_similarity_scores(batch_timestamp);
  CREATE INDEX IF NOT EXISTS idx_nightly_similarity_score ON nightly_similarity_scores(similarity_score DESC);
`;

const CREATE_MENTOR_STUDENT_MAPPING_TABLE = `
  CREATE TABLE IF NOT EXISTS mentor_student_mapping (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    similarity_score DECIMAL(5, 4) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    batch_timestamp TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(mentor_id, student_id)
  );

  CREATE INDEX IF NOT EXISTS idx_mentor_student_mapping_mentor ON mentor_student_mapping(mentor_id);
  CREATE INDEX IF NOT EXISTS idx_mentor_student_mapping_student ON mentor_student_mapping(student_id);
  CREATE INDEX IF NOT EXISTS idx_mentor_student_mapping_active ON mentor_student_mapping(is_active);
  CREATE INDEX IF NOT EXISTS idx_mentor_student_mapping_timestamp ON mentor_student_mapping(batch_timestamp);
`;

const MatchingResultsModel = {
  NIGHTLY_SIMILARITY_SCORES_TABLE: 'nightly_similarity_scores',
  MENTOR_STUDENT_MAPPING_TABLE: 'mentor_student_mapping',
  
  COLUMNS: {
    ID: 'id',
    MENTOR_ID: 'mentor_id',
    STUDENT_ID: 'student_id',
    SIMILARITY_SCORE: 'similarity_score',
    BATCH_TIMESTAMP: 'batch_timestamp',
    CREATED_AT: 'created_at',
    ASSIGNED_AT: 'assigned_at',
    IS_ACTIVE: 'is_active',
  },
};

module.exports = {
  MatchingResultsModel,
  CREATE_NIGHTLY_SIMILARITY_SCORES_TABLE,
  CREATE_MENTOR_STUDENT_MAPPING_TABLE,
};

