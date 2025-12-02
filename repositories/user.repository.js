const pool = require('../config/db');
const { UserModel } = require('../models/user.model');

/**
 * User Repository
 * Handles all database operations for users
 */

/**
 * Create a new user in the database
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Created user object (without password)
 */
const createUser = async (userData) => {
  const {
    email,
    name,
    password,
    contact,
    willing_to_be_mentor,
    mentor_capacity,
    willing_to_be_judge,
    willing_to_be_sponsor,
  } = userData;

  const query = `
    INSERT INTO ${UserModel.TABLE_NAME} (
      email, name, password, contact,
      willing_to_be_mentor, mentor_capacity,
      willing_to_be_judge, willing_to_be_sponsor
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, email, name, contact, willing_to_be_mentor,
              mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
              created_at, updated_at
  `;

  // Convert willingness flags to boolean
  const willingMentor = willing_to_be_mentor === 'yes' || willing_to_be_mentor === true;
  const willingJudge = willing_to_be_judge === 'yes' || willing_to_be_judge === true;
  const willingSponsor = willing_to_be_sponsor === 'yes' || willing_to_be_sponsor === true;
  
  // Debug logging
  console.log('[Repository] Converting willingness flags:', {
    willing_to_be_mentor_input: willing_to_be_mentor,
    willing_to_be_mentor_type: typeof willing_to_be_mentor,
    willing_to_be_mentor_boolean: willingMentor,
  });

  const values = [
    email,
    name,
    password, // Already hashed in service layer
    contact || null,
    willingMentor,
    mentor_capacity || null,
    willingJudge,
    willingSponsor,
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
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
const getUserByEmail = async (email) => {
  const query = `
    SELECT id, email, name, password, contact, willing_to_be_mentor,
           mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
           created_at, updated_at, last_login
    FROM ${UserModel.TABLE_NAME}
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
 * Get user by ID (for future use)
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
const getUserById = async (id) => {
  const query = `
    SELECT id, email, name, contact, willing_to_be_mentor,
           mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
           created_at, updated_at
    FROM ${UserModel.TABLE_NAME}
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user information
 * @param {number} id - User ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated user object (without password)
 */
const updateUser = async (id, updateData) => {
  const {
    name,
    contact,
    willing_to_be_mentor,
    mentor_capacity,
    willing_to_be_judge,
    willing_to_be_sponsor,
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

  if (willing_to_be_mentor !== undefined) {
    updates.push(`willing_to_be_mentor = $${paramIndex++}`);
    values.push(willing_to_be_mentor === 'yes' || willing_to_be_mentor === true);
  }

  if (mentor_capacity !== undefined) {
    updates.push(`mentor_capacity = $${paramIndex++}`);
    values.push(mentor_capacity ? parseInt(mentor_capacity) : null);
  }

  if (willing_to_be_judge !== undefined) {
    updates.push(`willing_to_be_judge = $${paramIndex++}`);
    values.push(willing_to_be_judge === 'yes' || willing_to_be_judge === true);
  }

  if (willing_to_be_sponsor !== undefined) {
    updates.push(`willing_to_be_sponsor = $${paramIndex++}`);
    values.push(willing_to_be_sponsor === 'yes' || willing_to_be_sponsor === true);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  // Add updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add user ID to values
  values.push(id);

  const query = `
    UPDATE ${UserModel.TABLE_NAME}
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, email, name, contact, willing_to_be_mentor,
              mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
              created_at, updated_at
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null; // User not found
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Update user password
 * @param {number} id - User ID
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<Object>} Updated user object (without password)
 */
const updateUserPassword = async (id, hashedPassword) => {
  const query = `
    UPDATE ${UserModel.TABLE_NAME}
    SET password = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, email, name, contact, willing_to_be_mentor,
              mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
              created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [hashedPassword, id]);
    if (result.rows.length === 0) {
      return null; // User not found
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Get all users
 * @returns {Promise<Array>} Array of user objects (without passwords)
 */
const getAllUsers = async () => {
  const query = `
    SELECT id, email, name, contact, willing_to_be_mentor,
           mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
           created_at, updated_at
    FROM ${UserModel.TABLE_NAME}
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
 * Get all users willing to be mentors
 * @returns {Promise<Array>} Array of mentor user objects (without passwords)
 */
const getMentorUsers = async () => {
  const query = `
    SELECT id, email, name, contact, willing_to_be_mentor,
           mentor_capacity, willing_to_be_judge, willing_to_be_sponsor,
           created_at, updated_at
    FROM ${UserModel.TABLE_NAME}
    WHERE willing_to_be_mentor = TRUE
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
 * Delete user by ID
 * @param {number} id - User ID
 * @returns {Promise<boolean>} True if user was deleted, false if not found
 */
const deleteUser = async (id) => {
  const query = `
    DELETE FROM ${UserModel.TABLE_NAME}
    WHERE id = $1
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user's last_login timestamp to current time.
 * @param {number} id - User ID
 * @returns {Promise<void>}
 */
const updateLastLogin = async (id) => {
  const query = `
    UPDATE ${UserModel.TABLE_NAME}
    SET last_login = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  try {
    await pool.query(query, [id]);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  getMentorUsers,
  updateUser,
  updateUserPassword,
  deleteUser,
   updateLastLogin,
};

