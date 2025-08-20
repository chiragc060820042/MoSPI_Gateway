const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { userService } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {

    const { username, email, password, role } = req.body;
    console.log('[REGISTER] Received registration with role:', role);

    // Validation
    if (!username || !email || !password || !role) {
      console.error('[REGISTER] Missing required fields:', { username, email, password, role });
      return res.status(400).json({ error: 'All fields are required (username, email, password, role)' });
    }

    // Validate role
    if (typeof role !== 'string' || !['admin', 'user'].includes(role)) {
      console.error('[REGISTER] Invalid role received:', role);
      return res.status(400).json({ error: 'Invalid role. Must be either "admin" or "user"' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUserByEmail = await userService.getUserByEmail(email);
    const existingUserByUsername = await userService.getUserByUsername(username);

    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Determine role_id based on role string (1 for normal user, 2 for admin)
    const roleMap = {
      'admin': 2,
      'user': 1
    };
    const role_id = roleMap[role] || 1; // Default to normal user if role not specified

    // Create new user in Supabase
    const userData = {
      username,
      email,
      password: hashedPassword,
      role_id
    };

    const newUser = await userService.createUser(userData);
    console.log('Supabase createUser response:', newUser);

    // Check if we got a valid user response
    if (!newUser || !newUser.id) {
      console.error('Invalid user response from Supabase:', newUser);
      return res.status(500).json({ error: 'Failed to create user - invalid response from database' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, role: role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return user data (without password) and token
    const userResponse = {
      id: newUser.id,
      username: newUser.user_name || username,
      email: newUser.email || email,
      role: role,
      createdAt: newUser.created_at || new Date().toISOString()
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    console.log('[LOGIN] Incoming request body:', req.body);
    const { username, email, password } = req.body;

    // Validation - accept either username or email
    const loginIdentifier = username || email;
    if (!loginIdentifier || !password) {
      console.error('[LOGIN] Missing loginIdentifier or password:', { loginIdentifier, password });
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by username or email
    console.log('[LOGIN] Looking for user with identifier:', loginIdentifier);
    let user = await userService.getUserByUsername(loginIdentifier);
    console.log('[LOGIN] getUserByUsername result:', user ? 'Found' : 'Not found');

    if (!user) {
      user = await userService.getUserByEmail(loginIdentifier);
      console.log('[LOGIN] getUserByEmail result:', user ? 'Found' : 'Not found');
    }

    // If still no user found, try fallback search
    if (!user) {
      console.log('[LOGIN] Trying fallback search...');
      user = await userService.findUserByAnyIdentifier(loginIdentifier);
      console.log('[LOGIN] Fallback search result:', user ? 'Found' : 'Not found');
    }

    if (!user) {
      console.error('[LOGIN] No user found with identifier:', loginIdentifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] Found user:', { 
      id: user.id, 
      username: user.user_name, 
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      role_id: user.role_id
    });

    // Check password
    if (!user.password) {
      console.error('[LOGIN] User has no password set in DB:', user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('[LOGIN] Comparing password with hash...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] Password check result:', isValidPassword);

    if (!isValidPassword) {
      console.error('[LOGIN] Password comparison failed for user:', user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    try {
      await userService.updateUser(user.id, { last_login: new Date().toISOString() });
    } catch (err) {
      console.error('[LOGIN] Failed to update last_login:', err.message);
    }

    // Determine role string from role_id (1 for normal user, 2 for admin)
    const roleMap = {
      2: 'admin',
      1: 'user'
    };
    const role = roleMap[user.role_id] || 'user';

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role_id }, // role_id should be 2 for admin
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return user data and token
    const userResponse = {
      id: user.id,
      username: user.user_name,
      email: user.email,
      role: role,
      lastLogin: user.last_login
    };

    // After password check
    if (isValidPassword) {
      const token = jwt.sign(
        { userId: user.id, role: role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      res.json({
        token,
        user: {
          id: user.id,
          username: user.user_name,
          email: user.email,
          role: role,
          lastLogin: user.last_login
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('[LOGIN] Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Profile request received for user ID:', req.user.userId);
    console.log('🔍 Full user object from JWT:', req.user);
    
    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine role string from role_id (1 for normal user, 2 for admin)
    const roleMap = {
      2: 'admin',
      1: 'user'
    };
    const role = roleMap[user.role_id] || 'user';

    const userResponse = {
      id: user.id,
      username: user.user_name,
      email: user.email,
      role: role,
      lastLogin: user.last_login,
      createdAt: user.created_at
    };

    res.json({ user: userResponse });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;

    // Check if username or email already exists (excluding current user)
    if (username) {
      const existingUser = await userService.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (email) {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.user_name = username;
    if (email) updateData.email = email;

    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine role string from role_id
    const roleMap = {
      3: 'admin',
      2: 'researcher',
      1: 'public'
    };
    const role = roleMap[updatedUser.role_id] || 'public';

    const userResponse = {
      id: updatedUser.id,
      username: updatedUser.user_name,
      email: updatedUser.email,
      role: role,
      lastLogin: updatedUser.last_login,
      createdAt: updatedUser.created_at
    };

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userService.updateUser(userId, { password: hashedNewPassword });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await userService.updateUser(req.user.userId, { last_logout: new Date().toISOString() });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🔧 Test endpoint hit!');
  res.json({ message: 'Auth routes are working!' });
});

// Query log count example
router.get('/query-log-count', authenticateToken, async (req, res) => {
  try {
    let totalQueries = 0;
    if (QueryLog && QueryLog.count) {
      totalQueries = await QueryLog.count();
    }

    res.json({ totalQueries });
  } catch (error) {
    console.error('Error fetching query log count:', error);
    res.status(500).json({ error: 'Failed to fetch query log count', details: error.message });
  }
});

module.exports = router;
