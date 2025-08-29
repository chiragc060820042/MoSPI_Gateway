const express = require('express');
const Survey = require('../models/Survey');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
// const { privacyProtection } = require('../middleware/privacy');

const router = express.Router();

// Temporarily disable privacy protection to isolate the issue
// router.use(privacyProtection);

// Get all available surveys (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    res.json({ message: 'Surveys endpoint working' });
  } catch (error) {
    console.error('Surveys fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Get survey by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    res.json({ message: 'Survey by ID endpoint working', id: req.params.id });
  } catch (error) {
    console.error('Survey fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

module.exports = router;
