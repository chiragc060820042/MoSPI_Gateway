// const { sequelize } = require('../config/database');
// const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const QueryLog = sequelize.define('QueryLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    surveyId: { type: DataTypes.INTEGER, allowNull: false },
    query: { type: DataTypes.TEXT, allowNull: false },
    result_count: { type: DataTypes.INTEGER },
    executed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'query_logs',
    timestamps: false
  });
  return QueryLog;
};
