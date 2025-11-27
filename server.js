// Load environment variables
require('dotenv').config();

const express = require('express');
const app = express();
const config = require('./config/server');
const routes = require('./routes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port} in ${config.env} mode`);
});

