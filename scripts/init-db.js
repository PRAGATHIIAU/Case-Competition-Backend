/**
 * Database Initialization Script
 * Run this script once to create the users table in your PostgreSQL database
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config();
const pool = require('../config/db');
const { CREATE_TABLE_QUERY } = require('../models/user.model');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create users table
    await pool.query(CREATE_TABLE_QUERY);
    
    console.log('Database initialized successfully!');
    console.log('Users table created.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();

