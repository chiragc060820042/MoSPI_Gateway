const { sequelize } = require('../config/database');

function initializeModels(sequelizeInstance) {
  const User = require('./User')(sequelizeInstance);
  const QueryLog = require('./QueryLog')(sequelizeInstance);
  const Survey = require('./Survey')(sequelizeInstance);

  User.hasMany(QueryLog, { foreignKey: 'userId', as: 'queryLogs' });
  QueryLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Survey.hasMany(QueryLog, { foreignKey: 'surveyId', as: 'queryLogs' });
  QueryLog.belongsTo(Survey, { foreignKey: 'surveyId', as: 'survey' });

  return { User, QueryLog, Survey };
}

module.exports = { initializeModels };
