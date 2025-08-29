const express = require('express');
const router = express.Router();
const { User, QueryLog } = require('../models'); // Adjust path if needed

router.get('/stats', async (req, res) => {
  try {
    const users = await User.findAll();

    const total = users.length;
    const active = users.filter(u =>
      u.last_login && (!u.last_logout || new Date(u.last_login) > new Date(u.last_logout))
    ).length;
    const recent = users.filter(u =>
      u.created_at && (new Date() - new Date(u.created_at)) < 7 * 24 * 60 * 60 * 1000
    ).length;
    const adminUsers = users.filter(u => u.role_id === 2).length;

    let totalQueries = 0;
    if (QueryLog && QueryLog.count) {
      totalQueries = await QueryLog.count();
    }

    res.json({
      total,
      byStatus: { active },
      byRole: { 2: adminUsers },
      recent,
      totalQueries
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Failed to get user stats', details: err.message });
  }
});

module.exports = router;