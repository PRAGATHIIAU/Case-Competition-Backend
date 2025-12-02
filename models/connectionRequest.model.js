/**
 * Connection Request Model
 * Defines the schema for the connection_requests table in PostgreSQL
 */

/**
 * SQL query to create connection_requests table
 * Run this query in your PostgreSQL database to create the table
 */
const CREATE_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS connection_requests (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    mentor_id INTEGER NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined'))
  );

  CREATE INDEX IF NOT EXISTS idx_connection_requests_student_id ON connection_requests(student_id);
  CREATE INDEX IF NOT EXISTS idx_connection_requests_mentor_id ON connection_requests(mentor_id);
  CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
`;

const ConnectionRequestModel = {
  TABLE_NAME: 'connection_requests',
  
  FIELDS: {
    ID: 'id',
    STUDENT_ID: 'student_id',
    MENTOR_ID: 'mentor_id',
    MESSAGE: 'message',
    STATUS: 'status',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },

  STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
  },
};

module.exports = {
  ConnectionRequestModel,
  CREATE_TABLE_QUERY,
};

