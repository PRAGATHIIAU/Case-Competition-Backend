/**
 * Script to create the connection_requests table in PostgreSQL
 * Run this script to set up the connection_requests table
 * 
 * Usage: node scripts/create-connection-requests-table.js
 */

require('dotenv').config();
const pool = require('../config/db');
const { CREATE_TABLE_QUERY } = require('../models/connectionRequest.model');

async function createConnectionRequestsTable() {
  try {
    console.log('Creating connection_requests table...');
    
    await pool.query(CREATE_TABLE_QUERY);
    
    console.log('✅ connection_requests table created successfully!');
    console.log('\nTable structure:');
    console.log('- id (SERIAL PRIMARY KEY)');
    console.log('- student_id (VARCHAR(255) NOT NULL)');
    console.log('- mentor_id (INTEGER NOT NULL, FOREIGN KEY to users.id)');
    console.log('- message (TEXT)');
    console.log('- status (VARCHAR(50) DEFAULT "pending", CHECK: pending|accepted|declined)');
    console.log('- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    console.log('- updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    console.log('\nIndexes created:');
    console.log('- idx_connection_requests_student_id');
    console.log('- idx_connection_requests_mentor_id');
    console.log('- idx_connection_requests_status');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating connection_requests table:', error.message);
    if (error.code === '42P07') {
      console.log('Table already exists. Skipping creation.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

createConnectionRequestsTable();

