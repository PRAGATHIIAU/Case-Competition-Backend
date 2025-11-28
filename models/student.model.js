/**
 * Student model structure
 * Defines the schema for the students table in PostgreSQL
 */

/**
 * SQL query to create students table
 * Run this query in your PostgreSQL database to create the table
 */
const CREATE_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    linkedin_url TEXT,
    major VARCHAR(255),
    grad_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
  CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
`;

/**
 * Student data structure
 */
const StudentModel = {
  // Table name
  TABLE_NAME: 'students',

  // Column names
  COLUMNS: {
    STUDENT_ID: 'student_id',
    NAME: 'name',
    EMAIL: 'email',
    PASSWORD: 'password',
    CONTACT: 'contact',
    LINKEDIN_URL: 'linkedin_url',
    MAJOR: 'major',
    GRAD_YEAR: 'grad_year',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },
};

module.exports = {
  StudentModel,
  CREATE_TABLE_QUERY,
};

