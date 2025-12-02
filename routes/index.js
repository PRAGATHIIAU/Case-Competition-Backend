const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const studentRoutes = require('./student.routes');
const matchingRoutes = require('./matching.routes');
const adminRoutes = require('./admin.routes');
const connectionRequestRoutes = require('./connectionRequest.routes');
const facultyRoutes = require('./faculty.routes');

// Routes
router.get('/', helloController.getHello);

// Auth routes
router.use('/api/auth', authRoutes);

// Event routes
router.use('/api/events', eventRoutes);

router.use('/api/students', studentRoutes);
router.use('/admin', adminRoutes);
router.use('/faculty', facultyRoutes);

// Matching routes
router.use('/api/matching', matchingRoutes);

// Connection Request routes
router.use('/api/connection-requests', connectionRequestRoutes);

module.exports = router;


