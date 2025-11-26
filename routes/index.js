const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');

// Routes
router.get('/', helloController.getHello);

module.exports = router;

