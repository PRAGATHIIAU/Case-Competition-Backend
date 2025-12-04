const pool = require('../config/db');
const { StudentModel } = require('../models/student.model');

/**
 * Student Repository
 * Handles all database operations for students (RDS PostgreSQL)
 */

/**
 * Create a new student in the database
 * @param {Object} studentData - Student data object
 * @returns {Promise<Object>} Created student object (without password)
 */
const createStudent = async (studentData) => {
  const {
    name,
    email,
    password,
    contact,
    linkedin_url,
    major,
    grad_year,
  } = studentData;

  const query = `
    INSERT INTO ${StudentModel.TABLE_NAME} (
      name, email, password, contact, linkedin_url, major, grad_year
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING student_id, name, email, contact, linkedin_url, 
              major, grad_year, created_at, updated_at
  `;

  const values = [
    name?.trim(),
    email?.trim(),
    password, // Already hashed in service layer
    contact?.trim() || null,
    linkedin_url?.trim() || null,
    major?.trim() || null,
    grad_year !== undefined && grad_year !== null ? (typeof grad_year === 'number' ? grad_year : parseInt(grad_year)) : null,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (duplicate email)
    if (error.code === '23505') {
      const customError = new Error('Email already exists');
      customError.code = 'DUPLICATE_EMAIL';
      throw customError;
    }
    throw error;
  }
};

/**
 * Get student by email
 * @param {string} email - Student email
 * @returns {Promise<Object|null>} Student object or null if not found
 */
const getStudentByEmail = async (email) => {
  const query = `
    SELECT student_id, name, email, password, contact, linkedin_url,
           major, grad_year, created_at, updated_at
    FROM ${StudentModel.TABLE_NAME}
    WHERE email = $1
  `;

  try {
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get student by ID
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object|null>} Student object or null if not found
 */
const getStudentById = async (studentId) => {
  const query = `
    SELECT student_id, name, email, contact, linkedin_url,
           major, grad_year, created_at, updated_at
    FROM ${StudentModel.TABLE_NAME}
    WHERE student_id = $1
  `;

  try {
    const result = await pool.query(query, [studentId]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all students
 * @returns {Promise<Array>} Array of student objects (without passwords)
 */
const getAllStudents = async () => {
  const query = `
    SELECT student_id, name, email, contact, linkedin_url,
           major, grad_year, created_at, updated_at
    FROM ${StudentModel.TABLE_NAME}
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Update student information
 * @param {string} studentId - Student UUID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated student object (without password)
 */
const updateStudent = async (studentId, updateData) => {
  const {
    name,
    contact,
    linkedin_url,
    major,
    grad_year,
  } = updateData;

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name.trim());
  }

  if (contact !== undefined) {
    updates.push(`contact = $${paramIndex++}`);
    values.push(contact ? contact.trim() : null);
  }

  if (linkedin_url !== undefined) {
    updates.push(`linkedin_url = $${paramIndex++}`);
    values.push(linkedin_url ? linkedin_url.trim() : null);
  }

  if (major !== undefined) {
    updates.push(`major = $${paramIndex++}`);
    values.push(major ? major.trim() : null);
  }

  if (grad_year !== undefined) {
    updates.push(`grad_year = $${paramIndex++}`);
    values.push(grad_year ? parseInt(grad_year) : null);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  // Add updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add student ID to values
  values.push(studentId);

  const query = `
    UPDATE ${StudentModel.TABLE_NAME}
    SET ${updates.join(', ')}
    WHERE student_id = $${paramIndex}
    RETURNING student_id, name, email, contact, linkedin_url,
              major, grad_year, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null; // Student not found
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Update student password
 * @param {string} studentId - Student UUID
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<Object>} Updated student object (without password)
 */
const updateStudentPassword = async (studentId, hashedPassword) => {
  const query = `
    UPDATE ${StudentModel.TABLE_NAME}
    SET password = $1, updated_at = CURRENT_TIMESTAMP
    WHERE student_id = $2
    RETURNING student_id, name, email, contact, linkedin_url,
              major, grad_year, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [hashedPassword, studentId]);
    if (result.rows.length === 0) {
      return null; // Student not found
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Delete student by ID (soft delete - sets deleted_at timestamp)
 * For hard delete, use deleteStudentHard
 * @param {string} studentId - Student UUID
 * @returns {Promise<boolean>} True if student was deleted, false if not found
 */
const deleteStudent = async (studentId) => {
  // For now, we'll do a hard delete. If you want soft delete, add a deleted_at column
  const query = `
    DELETE FROM ${StudentModel.TABLE_NAME}
    WHERE student_id = $1
    RETURNING student_id
  `;

  try {
    const result = await pool.query(query, [studentId]);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createStudent,
  getStudentByEmail,
  getStudentById,
  getAllStudents,
  updateStudent,
  updateStudentPassword,
  deleteStudent,
};

