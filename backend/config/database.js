require('dotenv').config();
const { Sequelize } = require('sequelize');

// Remove any require('../routes/tablebuilder') or similar import
// If there is an import for TableBuilder, it should be removed here.

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
});

module.exports = { sequelize };
