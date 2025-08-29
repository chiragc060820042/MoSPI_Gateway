module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    last_login: { type: DataTypes.DATE },
    last_logout: { type: DataTypes.DATE }
  }, {
    tableName: 'users',
    timestamps: false
  });
  return User;
};
