const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool configuration
 * Uses environment variables for connection details
 */
// Determine if SSL should be enabled
// Enable SSL for remote databases (not localhost) or when explicitly set via env
const isLocalhost = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
const shouldUseSSL = process.env.DB_SSL === 'true' || (!isLocalhost && process.env.DB_SSL !== 'false');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;

