const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection and models
const { testConnection } = require('./config/database');
const { sequelize } = require('./config/database');
const { initializeModels } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware (move these to the top, before routes)
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize models after database connection is established
const models = initializeModels(sequelize);

console.log('🔧 Loading auth routes...');
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded successfully');

console.log('🔧 Loading admin routes...');
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes loaded successfully');

// app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/query', require('./routes/query'));

// New user routes
console.log('🔧 Loading user routes...');
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
console.log('✅ User routes loaded successfully');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MoSPI API Gateway is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server after database connection test
const startServer = async () => {
  try {
    // Temporarily disable database connection test to isolate the issue
    // await testConnection();
    
    console.log('✅ Models initialized successfully.');
    
    // Synchronize database models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 MoSPI API Gateway running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Stats route for users
app.get('/api/users/stats', async (req, res) => {
  try {
    // Sample implementation - replace with actual logic
    const stats = {
      totalUsers: 1000,
      activeUsers: 800,
      inactiveUsers: 200,
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});