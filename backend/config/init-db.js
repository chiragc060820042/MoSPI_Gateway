const { sequelize } = require('./database');
const models = require('../models');

(async () => {
  try {
    console.log('🚀 Initializing MoSPI API Gateway Database...');
    await sequelize.sync({ alter: true }); // or { force: true } for a fresh start
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
})();
