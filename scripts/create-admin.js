/**
 * Create Admin User Script
 * Run this script once to create an initial admin user
 * 
 * Usage: node scripts/create-admin.js
 * 
 * Note: You can modify the email, password, first_name, and last_name below
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function createAdmin() {
  try {
    // First, check if admins table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      );
    `;
    const tableExists = await pool.query(tableCheckQuery);
    
    if (!tableExists.rows[0].exists) {
      console.error('❌ Error: admins table does not exist!');
      console.error('Please run: node scripts/init-db.js');
      process.exit(1);
    }
    
    // Modify these values as needed
    const email = 'admin@test.com';
    const password = 'admin123';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 'admin';
    
    // Check if admin already exists
    const checkQuery = 'SELECT id FROM admins WHERE email = $1';
    const existing = await pool.query(checkQuery, [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin with this email already exists!');
      process.exit(0);
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert admin
    const query = `
      INSERT INTO admins (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, created_at
    `;
    
    const result = await pool.query(query, [email, passwordHash, firstName, lastName, role]);
    
    console.log('✅ Admin created successfully!');
    console.log('Admin details:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Email:', result.rows[0].email);
    console.log('  Name:', `${result.rows[0].first_name} ${result.rows[0].last_name}`);
    console.log('  Role:', result.rows[0].role);
    console.log('\nYou can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:');
    console.error('  Message:', error.message || 'Unknown error');
    console.error('  Stack:', error.stack);
    if (error.code) {
      console.error('  Code:', error.code);
    }
    process.exit(1);
  }
}

// Run the script
createAdmin();

