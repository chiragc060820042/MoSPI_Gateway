const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check API key
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // For now, we'll use a simple check. In production, you'd validate against the database
    req.user = { id: 'api-user', role: 'researcher' };
    next();
  } catch (error) {
    return res.status(500).json({ error: 'API key authentication error' });
  }
};

// Optional authentication - sets user if token exists, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    }
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 2) { // or 'admin' if you use strings
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  authenticateApiKey,
  optionalAuth,
  requireAdmin
};
