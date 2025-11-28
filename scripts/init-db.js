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
    
    // Create admins table
    await pool.query(CREATE_ADMINS_TABLE_QUERY);
    console.log('Admins table created.');
    
    console.log('Database initialized successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();

