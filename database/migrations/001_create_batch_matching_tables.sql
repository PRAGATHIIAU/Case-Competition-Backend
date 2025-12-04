-- Migration: Create tables for batch matching system
-- Run this SQL script in your PostgreSQL database

-- 1. Create user_profile_change_log table
CREATE TABLE IF NOT EXISTS user_profile_change_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  change_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_user_id ON user_profile_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_timestamp ON user_profile_change_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_change_type ON user_profile_change_log(change_type);

-- 2. Create nightly_similarity_scores table
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

-- 3. Create mentor_student_mapping table
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

-- Add foreign key constraints (optional, for data integrity)
-- ALTER TABLE nightly_similarity_scores ADD CONSTRAINT fk_mentor_scores 
--   FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE mentor_student_mapping ADD CONSTRAINT fk_mentor_mapping 
--   FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;

