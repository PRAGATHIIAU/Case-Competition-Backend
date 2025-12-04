const pool = require('../config/db');
const { AdminModel } = require('../models/admin.model');

/**
 * Admin Repository
 * Handles database operations for admin authentication and profile
 */

/**
 * Get admin by email
 * @param {string} email - Admin email
 * @returns {Promise<Object|null>} Admin object or null if not found
 */
const getAdminByEmail = async (email) => {
  const query = `
    SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
    FROM ${AdminModel.TABLE_NAME}
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
 * Get admin by ID
 * @param {number} id - Admin ID
 * @returns {Promise<Object|null>} Admin object or null if not found
 */
const getAdminById = async (id) => {
  const query = `
    SELECT id, email, first_name, last_name, role, created_at, updated_at
    FROM ${AdminModel.TABLE_NAME}
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAdminByEmail,
  getAdminById,
  /**
   * Update admin role
   * @param {number} id
   * @param {'admin'|'faculty'} role
   * @returns {Promise<Object|null>}
   */
  updateAdminRole: async (id, role) => {
    const query = `
      UPDATE ${AdminModel.TABLE_NAME}
      SET role = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, role, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [role, id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Create a new admin/faculty account
   * @param {Object} adminData
   * @param {string} adminData.email
   * @param {string} adminData.passwordHash
   * @param {string} adminData.firstName
   * @param {string} adminData.lastName
   * @param {'admin'|'faculty'} adminData.role
   * @returns {Promise<Object>}
   */
  createAdmin: async ({ email, passwordHash, firstName, lastName, role }) => {
    const query = `
      INSERT INTO ${AdminModel.TABLE_NAME} (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [email, passwordHash, firstName, lastName, role]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },
};

