/**
 * Database Initialization Script
 * Run this script once to create the users and admins tables in your PostgreSQL database
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config();
const pool = require('../config/db');
const { CREATE_TABLE_QUERY: CREATE_USERS_TABLE_QUERY } = require('../models/user.model');
const { CREATE_TABLE_QUERY: CREATE_ADMINS_TABLE_QUERY } = require('../models/admin.model');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create users table
    await pool.query(CREATE_USERS_TABLE_QUERY);
    console.log('Users table created.');

    // Ensure last_login column exists on users table (for analytics and tracking)
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL
      `);
      console.log('Ensured users.last_login column exists.');
    } catch (alterError) {
      console.warn('Warning: could not ensure users.last_login column exists:', alterError.message);
    }
    
    // Create admins table
    await pool.query(CREATE_ADMINS_TABLE_QUERY);
    console.log('Admins table created.');

    // Ensure last_login column exists on students table (for student engagement analytics)
    try {
      await pool.query(`
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL
      `);
      console.log('Ensured students.last_login column exists.');
    } catch (alterStudentErr) {
      console.warn('Warning: could not ensure students.last_login column exists:', alterStudentErr.message);
    }
    
    console.log('Database initialized successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();

