const { sequelize } = require('../config/database');
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const Survey = sequelize.define('Survey', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'surveys',
    timestamps: false
  });
  return Survey;
};
