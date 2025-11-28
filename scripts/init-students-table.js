/**
 * Initialize Students Table Script
 * 
 * This script creates the students table in PostgreSQL RDS.
 * Run this script after setting up your database connection.
 * 
 * Usage:
 *   node scripts/init-students-table.js
 */

require('dotenv').config();
const pool = require('../config/db');
const { CREATE_TABLE_QUERY } = require('../models/student.model');

async function initStudentsTable() {
  try {
    console.log('Creating students table...');
    
    // Execute the CREATE TABLE query
    await pool.query(CREATE_TABLE_QUERY);
    
    console.log('✅ Students table created successfully!');
    console.log('\nTable structure:');
    console.log('- student_id (UUID, PRIMARY KEY)');
    console.log('- name (VARCHAR)');
    console.log('- email (VARCHAR, UNIQUE)');
    console.log('- password (VARCHAR)');
    console.log('- contact (VARCHAR, optional)');
    console.log('- linkedin_url (TEXT, optional)');
    console.log('- major (VARCHAR, optional)');
    console.log('- grad_year (INTEGER, optional)');
    console.log('- created_at (TIMESTAMP)');
    console.log('- updated_at (TIMESTAMP)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating students table:', error);
    process.exit(1);
  }
}

// Run the initialization
initStudentsTable();

