const { sequelize } = require('../config/database');

// Privacy middleware for data protection
const privacyProtection = (req, res, next) => {
  req.privacySettings = {
    minCellCount: parseInt(process.env.MIN_CELL_COUNT) || 5,
    aggregationThreshold: parseInt(process.env.AGGREGATION_THRESHOLD) || 10,
    enableCellSuppression: true,
    enableAggregation: true,
    enableSensitiveDataBlocking: true
  };
  next();
};

// Apply privacy protection to query results
const applyPrivacyProtection = async (results, survey, privacySettings) => {
  try {
    if (!results || results.length === 0) {
      return results;
    }

    const protectedResults = [...results];
    const privacyFlags = {
      cellSuppression: false,
      aggregationApplied: false,
      sensitiveDataBlocked: false
    };

    // Check if results need cell suppression
    if (results.length < privacySettings.minCellCount) {
      privacyFlags.cellSuppression = true;
      
      // Apply cell suppression by aggregating or masking small counts
      if (privacySettings.enableCellSuppression) {
        // For demonstration, we'll mask the results
        protectedResults.forEach((result, index) => {
          if (index < privacySettings.minCellCount) {
            Object.keys(result).forEach(key => {
              if (typeof result[key] === 'number' && result[key] < privacySettings.minCellCount) {
                result[key] = '<5'; // Standard privacy practice
              }
            });
          }
        });
      }
    }

    // Check if aggregation is needed
    if (results.length > privacySettings.aggregationThreshold && privacySettings.enableAggregation) {
      privacyFlags.aggregationApplied = true;
      
      // Apply aggregation for large result sets
      // This is a simplified version - in production, you'd implement proper aggregation logic
      if (results.length > 1000) {
        // Limit results and add aggregation note
        protectedResults.splice(1000);
        protectedResults.push({
          note: `Results limited to 1000 records for privacy. Total records: ${results.length}`,
          aggregated: true
        });
      }
    }

    // Check for sensitive variables
    if (survey && survey.privacySettings && survey.privacySettings.sensitiveVariables) {
      const sensitiveVars = survey.privacySettings.sensitiveVariables;
      
      protectedResults.forEach(result => {
        sensitiveVars.forEach(sensitiveVar => {
          if (result[sensitiveVar] !== undefined) {
            privacyFlags.sensitiveDataBlocked = true;
            result[sensitiveVar] = '[REDACTED]';
          }
        });
      });
    }

    return {
      data: protectedResults,
      privacyFlags,
      originalCount: results.length,
      protectedCount: protectedResults.length
    };
  } catch (error) {
    console.error('Privacy protection error:', error);
    return {
      data: results,
      privacyFlags: { error: 'Privacy protection failed' },
      originalCount: results.length,
      protectedCount: results.length
    };
  }
};

// Validate query for privacy compliance
const validateQueryPrivacy = (query, survey, user) => {
  const privacyIssues = [];
  
  try {
    // Check if user has access to this survey
    if (survey && user) {
      if (!survey.isAccessible(user.role, user.accessLevel)) {
        privacyIssues.push('Access denied to this survey');
      }
    }

    // Check for potentially identifying queries
    if (query.filters) {
      const filters = query.filters;
      
      // Check for very specific filters that might identify individuals
      if (filters.state && filters.district && filters.age && filters.gender) {
        privacyIssues.push('Query may be too specific - consider broader filters');
      }
      
      // Check for sensitive variable queries
      if (survey && survey.privacySettings && survey.privacySettings.sensitiveVariables) {
        const sensitiveVars = survey.privacySettings.sensitiveVariables;
        const requestedVars = query.select || [];
        
        sensitiveVars.forEach(sensitiveVar => {
          if (requestedVars.includes(sensitiveVar)) {
            privacyIssues.push(`Access to sensitive variable '${sensitiveVar}' is restricted`);
          }
        });
      }
    }

    return {
      isValid: privacyIssues.length === 0,
      issues: privacyIssues,
      recommendations: privacyIssues.length > 0 ? [
        'Use broader geographic filters',
        'Avoid combining too many specific filters',
        'Consider using aggregated data instead of unit-level data'
      ] : []
    };
  } catch (error) {
    console.error('Query privacy validation error:', error);
    return {
      isValid: false,
      issues: ['Privacy validation failed'],
      recommendations: ['Contact support for assistance']
    };
  }
};

// Rate limiting based on user role and data sensitivity
const getRateLimitForQuery = (user, survey, query) => {
  let baseLimit = 100; // requests per 15 minutes
  
  if (user) {
    baseLimit = user.rateLimit || 100;
  }
  
  // Reduce limits for sensitive queries
  if (survey && survey.accessLevel === 'premium') {
    baseLimit = Math.floor(baseLimit * 0.5);
  }
  
  // Reduce limits for large result sets
  if (query.limit && query.limit > 1000) {
    baseLimit = Math.floor(baseLimit * 0.7);
  }
  
  return baseLimit;
};

module.exports = {
  privacyProtection,
  applyPrivacyProtection,
  validateQueryPrivacy,
  getRateLimitForQuery
};
