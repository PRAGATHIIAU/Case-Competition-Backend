const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const studentRoutes = require('./student.routes');
const matchingRoutes = require('./matching.routes');

// Routes
router.get('/', helloController.getHello);

// Auth routes
router.use('/api/auth', authRoutes);

// Event routes
router.use('/api/events', eventRoutes);

// Student routes
router.use('/api/students', studentRoutes);

// Matching routes
router.use('/api/matching', matchingRoutes);

module.exports = router;


