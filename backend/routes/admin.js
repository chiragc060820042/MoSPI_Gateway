const express = require('express');
const router = express.Router();
const { User, QueryLog } = require('../models').initializeModels(require('../config/database').sequelize);
const { userService } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
// Only allow users with role 'admin' (from JWT) to access admin routes
router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// Get all users with optional filtering
router.get('/users', async (req, res) => {
  try {
    const { role_id, email, user_name, limit = 100 } = req.query;
    
    console.log('🔍 Admin user search with filters:', req.query);
    
    // Build conditions object
    const conditions = {};
    if (role_id !== undefined) conditions.role_id = parseInt(role_id);
    if (email) conditions.email = email;
    if (user_name) conditions.user_name = user_name;
    
    let users;
    if (Object.keys(conditions).length > 0) {
      // Use advanced filtering
      users = await userService.findUserByConditions(conditions);
      console.log('[ADMIN] Advanced user search result:', users);
    } else {
      // Get all users
      users = await userService.getAllUsers();
      console.log('[ADMIN] All users fetched:', users);
    }

    // Apply limit
    if (limit && users.length > limit) {
      users = users.slice(0, parseInt(limit));
    }

    // Remove sensitive information for admin view
    // Mark the currently logged-in user as active
    const currentUserId = req.user && req.user.userId;
    const safeUsers = users.map(user => ({
      id: user.id,
      user_name: user.user_name,
      email: user.email,
      role_id: user.role_id,
      created_at: user.created_at,
      last_login: user.last_login,
      isActive: (user.isActive === true) || (currentUserId && String(user.id) === String(currentUserId))
    }));
    console.log('[ADMIN] Users sent to frontend:', safeUsers);

    res.json({
      success: true,
      users: safeUsers,
      total: safeUsers.length,
      filters: conditions
    });
    
  } catch (error) {
    console.error('❌ Admin user search error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    });
  }
});

// Get users by specific role
router.get('/users/role/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const users = await userService.findUsersByRole(parseInt(roleId));
    
    // Remove sensitive information
    const safeUsers = users.map(user => ({
      id: user.id,
      user_name: user.user_name,
      email: user.email,
      role_id: user.role_id,
      created_at: user.created_at,
      last_login: user.last_login
    }));
    
    res.json({
      success: true,
      users: safeUsers,
      role_id: parseInt(roleId),
      count: safeUsers.length
    });
    
  } catch (error) {
    console.error('❌ Admin role-based user search error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users by role', 
      details: error.message 
    });
  }
});

// Find specific user by multiple criteria
router.post('/users/search', async (req, res) => {
  try {
    const { role_id, email, user_name, password } = req.body;
    
    console.log('🔍 Admin advanced user search:', req.body);
    
    if (!role_id && !email && !user_name) {
      return res.status(400).json({ 
        error: 'At least one search criteria is required' 
      });
    }
    
    const conditions = {};
    if (role_id !== undefined) conditions.role_id = parseInt(role_id);
    if (email) conditions.email = email;
    if (user_name) conditions.user_name = user_name;
    if (password) conditions.password = password;
    
    const users = await userService.findUserByConditions(conditions);
    
    // Remove sensitive information
    const safeUsers = users.map(user => ({
      id: user.id,
      user_name: user.user_name,
      email: user.email,
      role_id: user.role_id,
      created_at: user.created_at,
      last_login: user.last_login
    }));
    
    res.json({
      success: true,
      users: safeUsers,
      searchCriteria: conditions,
      count: safeUsers.length
    });
    
  } catch (error) {
    console.error('❌ Admin advanced user search error:', error);
    res.status(500).json({ 
      error: 'Failed to search users', 
      details: error.message 
    });
  }
});

// Example stats endpoint
router.get('/users/stats', async (req, res) => {
  try {
    // Replace with your actual stats logic
    const userCount = await User.count();
    const queryCount = await QueryLog.count();
    res.json({ userCount, queryCount });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example usage in a route
router.get('/user-stats', async (req, res) => {
  try {
    const totalUsers = await User.count();
    // ...other stats...
    res.json({ totalUsers });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Update user role
router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id } = req.body;
    
    if (!role_id || ![1, 2, 3].includes(parseInt(role_id))) {
      return res.status(400).json({ 
        error: 'Valid role_id (1, 2, or 3) is required' 
      });
    }
    
    const updatedUser = await userService.updateUser(userId, { role_id: parseInt(role_id) });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        user_name: updatedUser.user_name,
        email: updatedUser.email,
        role_id: updatedUser.role_id
      }
    });
    
  } catch (error) {
    console.error('❌ Admin user role update error:', error);
    res.status(500).json({ 
      error: 'Failed to update user role', 
      details: error.message 
    });
  }
});

// Deactivate/Activate user
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        error: 'isActive boolean value is required' 
      });
    }
    
    const updatedUser = await userService.updateUser(userId, { isActive });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: updatedUser.id,
        user_name: updatedUser.user_name,
        email: updatedUser.email,
        isActive: updatedUser.isActive
      }
    });
    
  } catch (error) {
    console.error('❌ Admin user status update error:', error);
    res.status(500).json({ 
      error: 'Failed to update user status', 
      details: error.message 
    });
  }
});

module.exports = router;
