/**
 * Admin model structure
 * Defines the schema for the admins table in PostgreSQL
 */

/**
 * SQL query to create admins table
 * Run this query in your PostgreSQL database to create the table
 */
const CREATE_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
`;

/**
 * Admin data structure
 */
const AdminModel = {
  // Table name
  TABLE_NAME: 'admins',

  // Column names
  COLUMNS: {
    ID: 'id',
    EMAIL: 'email',
    PASSWORD_HASH: 'password_hash',
    FIRST_NAME: 'first_name',
    LAST_NAME: 'last_name',
    ROLE: 'role',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },
};

module.exports = {
  AdminModel,
  CREATE_TABLE_QUERY,
};

