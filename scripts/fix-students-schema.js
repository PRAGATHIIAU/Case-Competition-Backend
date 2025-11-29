/**
 * Fix Students Table Schema Script
 *
 * Adds any missing columns expected by the current code:
 * - name
 * - contact
 * - linkedin_url
 * - major
 * - grad_year
 * - last_login
 *
 * Usage:
 *   node scripts/fix-students-schema.js
 */

require('dotenv').config();
const pool = require('../config/db');

async function fixStudentsSchema() {
  try {
    console.log('Fixing students table schema if needed...');

    const addColumnsQuery = `
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Student',
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'changeme',
        ADD COLUMN IF NOT EXISTS contact VARCHAR(255),
        ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
        ADD COLUMN IF NOT EXISTS major VARCHAR(255),
        ADD COLUMN IF NOT EXISTS grad_year INTEGER,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;
    `;

    await pool.query(addColumnsQuery);

    // If an old password_hash column exists and is NOT NULL, relax it so inserts don't fail.
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'students'
              AND column_name = 'password_hash'
          ) THEN
            ALTER TABLE students
              ALTER COLUMN password_hash DROP NOT NULL;
          END IF;
        END
        $$;
      `);
      console.log('Ensured students.password_hash (if exists) is nullable.');
    } catch (innerErr) {
      console.warn('Warning: could not relax students.password_hash constraint:', innerErr.message);
    }

    console.log('✅ Students table schema fixed (missing columns added / constraints adjusted if needed).');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing students table schema:');
    console.error(error.message || error);
    process.exit(1);
  }
}

fixStudentsSchema();


