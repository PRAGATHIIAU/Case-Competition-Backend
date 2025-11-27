const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');

// Routes
router.get('/', helloController.getHello);

// Auth routes
router.use('/api/auth', authRoutes);

// Event routes
router.use('/api/events', eventRoutes);

module.exports = router;


