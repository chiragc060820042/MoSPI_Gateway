const axios = require('axios');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://odaheneiylpxohcnoptl.supabase.co';
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYWhlbmVpeWxweG9oY25vcHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjMyNjYsImV4cCI6MjA3MDMzOTI2Nn0.1msltYNGpw-tBS8dScTT3b_eiQOHd-CeFsKiVyk4cYw';

// Create axios instance for Supabase
const supabase = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_API_KEY,
    'Authorization': `Bearer ${SUPABASE_API_KEY}`
  }
});

// User service functions
const userService = {
  // Create a new user
  async createUser(userData) {
    try {
      console.log('Creating user with data:', userData);
      
      // Create the user
      const response = await supabase.post('/users', {
        user_name: userData.username,
        email: userData.email,
        password: userData.password, // Already hashed from auth.js
        role_id: userData.role_id
      });
      
      console.log('Supabase POST response:', response.data);
      
      // Supabase POST might not return the created user, so fetch it
      if (response.data && response.data.id) {
        return response.data;
      } else {
        // Fetch the newly created user by email
        const createdUser = await this.getUserByEmail(userData.email);
        if (createdUser) {
          console.log('Fetched created user:', createdUser);
          return createdUser;
        } else {
          throw new Error('User created but could not be retrieved');
        }
      }
    } catch (error) {
      console.error('Supabase createUser error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      console.log('🔍 Searching for user by email:', email);
      
      // Use the correct Supabase query format with proper encoding
      const encodedEmail = encodeURIComponent(email);
      const response = await supabase.get(`/users?email=eq.${encodedEmail}&select=*`);
      
      console.log('Supabase getUserByEmail response:', response.data);
      const user = response.data[0] || null;
      console.log('Found user by email:', user ? 'Yes' : 'No');
      
      return user;
    } catch (error) {
      console.error('Supabase getUserByEmail error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get user by username
  async getUserByUsername(username) {
    try {
      console.log('🔍 Searching for user by username:', username);
      
      // Use the correct Supabase query format with proper encoding
      const encodedUsername = encodeURIComponent(username);
      const response = await supabase.get(`/users?user_name=eq.${encodedUsername}&select=*`);
      
      console.log('Supabase getUserByUsername response:', response.data);
      const user = response.data[0] || null;
      console.log('Found user by username:', user ? 'Yes' : 'No');
      
      return user;
    } catch (error) {
      console.error('Supabase getUserByUsername error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get user by ID
  async getUserById(id) {
    try {
      console.log('🔍 getUserById called with ID:', id);
      const response = await supabase.get(`/users?id=eq.${id}&select=*`);
      console.log('🔍 Supabase response:', response.data);
      const user = response.data[0] || null;
      console.log('🔍 Found user:', user ? 'Yes' : 'No');
      return user;
    } catch (error) {
      console.error('Supabase getUserById error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update user
  async updateUser(id, updateData) {
    try {
      const response = await supabase.patch(`/users?id=eq.${id}`, updateData);
      return response.data[0] || null;
    } catch (error) {
      console.error('Supabase updateUser error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all users (for admin)
  async getAllUsers() {
    try {
      const response = await supabase.get('/users?select=*');
      return response.data;
    } catch (error) {
      console.error('Supabase getAllUsers error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Fallback method to find user by any identifier
  async findUserByAnyIdentifier(identifier) {
    try {
      console.log('🔍 Fallback search for user by identifier:', identifier);
      
      // First try to get all users and search locally
      const allUsers = await this.getAllUsers();
      console.log('Total users in database:', allUsers.length);
      
      // Search by email
      let user = allUsers.find(u => u.email === identifier);
      if (user) {
        console.log('Found user by email in fallback search');
        return user;
      }
      
      // Search by username
      user = allUsers.find(u => u.user_name === identifier);
      if (user) {
        console.log('Found user by username in fallback search');
        return user;
      }
      
      console.log('No user found in fallback search');
      return null;
    } catch (error) {
      console.error('Fallback search error:', error.message);
      return null;
    }
  },

  // Advanced user lookup with multiple conditions
  async findUserByConditions(conditions) {
    try {
      console.log('🔍 Advanced user search with conditions:', conditions);
      
      // Build query parameters
      const queryParams = [];
      
      if (conditions.role_id !== undefined) {
        queryParams.push(`role_id=eq.${conditions.role_id}`);
      }
      
      if (conditions.email) {
        queryParams.push(`email=eq.${encodeURIComponent(conditions.email)}`);
      }
      
      if (conditions.password) {
        queryParams.push(`password=eq.${encodeURIComponent(conditions.password)}`);
      }
      
      if (conditions.user_name) {
        queryParams.push(`user_name=eq.${encodeURIComponent(conditions.user_name)}`);
      }
      
      if (conditions.id) {
        queryParams.push(`id=eq.${conditions.id}`);
      }
      
      // Build the query URL
      let queryUrl = '/users?select=*';
      if (queryParams.length > 0) {
        queryUrl += `&${queryParams.join('&')}`;
      }
      
      console.log('🔗 Query URL:', queryUrl);
      
      const response = await supabase.get(queryUrl);
      console.log('Supabase advanced query response:', response.data);
      
      const users = response.data || [];
      console.log(`Found ${users.length} users matching conditions`);
      
      return users;
    } catch (error) {
      console.error('Supabase advanced user query error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Find user by role and email combination
  async findUserByRoleAndEmail(roleId, email) {
    try {
      console.log(`🔍 Searching for user with role_id=${roleId} and email=${email}`);
      
      const users = await this.findUserByConditions({
        role_id: roleId,
        email: email
      });
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by role and email:', error.message);
      throw error;
    }
  },

  // Find users by role only
  async findUsersByRole(roleId) {
    try {
      console.log(`🔍 Searching for users with role_id=${roleId}`);
      
      const users = await this.findUserByConditions({
        role_id: roleId
      });
      
      return users;
    } catch (error) {
      console.error('Error finding users by role:', error.message);
      throw error;
    }
  }
};

// Survey data service functions
const surveyDataService = {
  // Get available survey tables from database
  async getAvailableTables() {
    try {
      // Use the correct RPC function
      const response = await supabase.post('/rpc/get_distinct_survey_names', {});
      // Returns: [{ survey_name: "HCES" }, ...]
      if (response.data && Array.isArray(response.data)) {
        // Map to array of survey names
        return response.data.map(row => row.survey_name);
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting available tables:', error.response?.data || error.message);
      return [];
    }
  },

  // Get survey metadata (columns, data types, etc.) from database
  async getSurveyMetadata(survey_name, survey_year, survey_subset) {
    try {
      // Use the correct RPC function and pass all required params
      const response = await supabase.post('/rpc/get_survey_metadata', {
        p_survey_name: survey_name,
        p_survey_year: survey_year,
        p_survey_subset: survey_subset
      });
      // Returns: [{ survey_column_names, data_types, data_info }]
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return {};
    } catch (error) {
      console.error('❌ Error getting survey metadata:', error.response?.data || error.message);
      return {};
    }
  },

  // Get filtered survey data using real Supabase queries
  async getFilteredSurveyData({ survey_name, survey_year, survey_subset, text_filters, numeric_filters }) {
    try {
      // Compose the table name from metadata
      const tableName = `${survey_name}${survey_year}${survey_subset}`;
      let queryUrl = `/${encodeURIComponent(tableName)}?select=*`;
      const queryParams = [];

      // Apply text filters
      if (text_filters && Object.keys(text_filters).length > 0) {
        Object.entries(text_filters).forEach(([field, value]) => {
          if (value && value.trim()) {
            queryParams.push(`${field}=ilike.*${encodeURIComponent(value)}*`);
          }
        });
      }

      // Apply numeric filters
      if (numeric_filters && Object.keys(numeric_filters).length > 0) {
        Object.entries(numeric_filters).forEach(([field, filterConfig]) => {
          if (filterConfig && filterConfig.op && filterConfig.values && filterConfig.values.length > 0) {
            const value = parseFloat(filterConfig.values[0]);
            if (!isNaN(value)) {
              let operator = filterConfig.op;
              switch (filterConfig.op) {
                case '=': operator = 'eq'; break;
                case '>': operator = 'gt'; break;
                case '<': operator = 'lt'; break;
                case '>=': operator = 'gte'; break;
                case '<=': operator = 'lte'; break;
                case '!=': operator = 'neq'; break;
              }
              queryParams.push(`${field}=${operator}.${value}`);
            }
          }
        });
      }

      if (queryParams.length > 0) {
        queryUrl += `&${queryParams.join('&')}`;
      }

      const response = await supabase.get(queryUrl);
      return response.data || [];
    } catch (error) {
      console.error('❌ Survey data fetch error:', error.response?.data || error.message);
      return [];
    }
  }
};

// Query logging and metrics
async function getTotalQueries() {
  // If using Sequelize:
  return await QueryLog.count();
}

module.exports = {
  supabase,
  userService,
  surveyDataService,
  getTotalQueries
};
