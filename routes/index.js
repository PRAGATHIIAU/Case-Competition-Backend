const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const studentRoutes = require('./student.routes');
const matchingRoutes = require('./matching.routes');
const adminRoutes = require('./admin.routes');

// Routes
router.get('/', helloController.getHello);

// Auth routes
router.use('/api/auth', authRoutes);

// Event routes
router.use('/api/events', eventRoutes);

router.use('/api/students', studentRoutes);
router.use('/admin', adminRoutes);

// Matching routes
router.use('/api/matching', matchingRoutes);

module.exports = router;


