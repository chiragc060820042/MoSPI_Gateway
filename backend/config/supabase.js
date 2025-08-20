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
  // Create table dynamically from JSON configuration
  async createTableFromJson(tableConfig) {
    try {
      console.log('🔧 Creating table with config:', tableConfig);
      
      const response = await supabase.post('/rpc/create_table_from_json', {
        if_not_exists: tableConfig.if_not_exists || true,
        columns: tableConfig.columns || [],
        dest_table: tableConfig.dest_table
      });
      
      console.log('Table creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Table creation error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get filtered survey data using real Supabase queries
  async getFilteredSurveyData(filters) {
    try {
      console.log('🔍 Fetching filtered survey data with filters:', filters);
      
      const { target_table, text_filters, numeric_filters } = filters;
      
      // Build the base query URL
      let queryUrl = `/${target_table}?select=*`;
      const queryParams = [];
      
      // Apply text filters
      if (text_filters && Object.keys(text_filters).length > 0) {
        Object.entries(text_filters).forEach(([field, value]) => {
          if (value && value.trim()) {
            // Use ilike for case-insensitive text search
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
              // Map operators to Supabase format
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
      
      // Add query parameters to URL
      if (queryParams.length > 0) {
        queryUrl += `&${queryParams.join('&')}`;
      }
      
      console.log('🔗 Supabase query URL:', queryUrl);
      
      // Execute the query
      const response = await supabase.get(queryUrl);
      
      const data = response.data || [];
      console.log(`✅ Fetched ${data.length} rows from ${target_table}`);
      
      return data;
    } catch (error) {
      console.error('❌ Survey data fetch error:', error.response?.data || error.message);
      
      // If the table doesn't exist or there's an error, return sample data for development
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('⚠️ Table not found, returning sample data for development');
        return this.getSampleData(filters);
      }
      
      throw error;
    }
  },

  // Fallback sample data for development/testing
  getSampleData(filters) {
    console.log('📊 Using sample data for development');
    
    // Generate more realistic sample data
    const sampleData = [];
    const surveys = ['HCES', 'NSS', 'Census', 'PLFS', 'NFHS'];
    const states = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    
    // Generate 100+ sample records
    for (let i = 1; i <= 150; i++) {
      const survey = surveys[Math.floor(Math.random() * surveys.length)];
      const state = states[Math.floor(Math.random() * states.length)];
      const multiplier = Math.floor(Math.random() * 500000) + 50000;
      const value = Math.random() * 100;
      
      sampleData.push({
        id: i,
        survey_name: survey,
        state: state,
        multiplier: multiplier,
        value: parseFloat(value.toFixed(2)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    let filteredData = [...sampleData];
    
    // Apply text filters
    if (filters.text_filters && Object.keys(filters.text_filters).length > 0) {
      Object.entries(filters.text_filters).forEach(([field, value]) => {
        if (value && value.trim()) {
          filteredData = filteredData.filter(row => 
            row[field] && row[field].toString().toLowerCase().includes(value.toLowerCase())
          );
        }
      });
    }
    
    // Apply numeric filters
    if (filters.numeric_filters && Object.keys(filters.numeric_filters).length > 0) {
      Object.entries(filters.numeric_filters).forEach(([field, filterConfig]) => {
        if (filterConfig && filterConfig.op && filterConfig.values && filterConfig.values.length > 0) {
          const value = parseFloat(filterConfig.values[0]);
          if (!isNaN(value)) {
            filteredData = filteredData.filter(row => {
              const rowValue = parseFloat(row[field]);
              if (isNaN(rowValue)) return false;
              
              switch (filterConfig.op) {
                case '=': return rowValue === value;
                case '>': return rowValue > value;
                case '<': return rowValue < value;
                case '>=': return rowValue >= value;
                case '<=': return rowValue <= value;
                case '!=': return rowValue !== value;
                default: return true;
              }
            });
          }
        }
      });
    }
    
    console.log(`📊 Sample data: ${filteredData.length} rows out of ${sampleData.length} total`);
    return filteredData;
  },

  // Get available survey tables from database
  async getAvailableTables() {
    try {
      console.log('🔍 Fetching available tables from database');
      
      // Try to get tables from information_schema
      const response = await supabase.get('/rpc/get_available_tables');
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} tables in database`);
        return response.data;
      }
      
      // Fallback: return common table names if RPC doesn't exist
      console.log('⚠️ RPC not available, using fallback table names');
      return [
        'survey_data',
        'hces_data',
        'nss_data',
        'census_data',
        'plfs_data',
        'nfhs_data'
      ];
    } catch (error) {
      console.error('❌ Error getting available tables:', error.response?.data || error.message);
      
      // Return fallback table names if there's an error
      console.log('📋 Using fallback table names');
      return [
        'survey_data',
        'hces_data',
        'nss_data',
        'census_data',
        'plfs_data',
        'nfhs_data'
      ];
    }
  },

  // Get survey metadata (columns, data types, etc.) from database
  async getSurveyMetadata(tableName) {
    try {
      console.log(`🔍 Fetching metadata for table: ${tableName}`);
      
      // Try to get metadata from database using RPC
      const response = await supabase.get(`/rpc/get_table_metadata?table_name=${encodeURIComponent(tableName)}`);
      
      if (response.data && response.data.columns) {
        console.log(`✅ Found metadata for ${tableName}: ${response.data.columns.length} columns`);
        return response.data;
      }
      
      // Fallback: return sample metadata if RPC doesn't exist
      console.log('⚠️ RPC not available, using fallback metadata');
      return this.getFallbackMetadata(tableName);
    } catch (error) {
      console.error('❌ Error getting survey metadata:', error.response?.data || error.message);
      
      // Return fallback metadata if there's an error
      console.log('📋 Using fallback metadata');
      return this.getFallbackMetadata(tableName);
    }
  },

  // Fallback metadata for development/testing
  getFallbackMetadata(tableName) {
    const metadata = {
      'survey_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'survey_name', type: 'text', description: 'Name of the survey' },
          { name: 'state', type: 'integer', description: 'State code' },
          { name: 'multiplier', type: 'numeric', description: 'Statistical multiplier' },
          { name: 'value', type: 'numeric', description: 'Survey value' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' },
          { name: 'updated_at', type: 'timestamp', description: 'Record update time' }
        ],
        sample_filters: {
          text_filters: { survey_name: 'HCES' },
          numeric_filters: {
            state: { op: '=', values: [10] },
            multiplier: { op: '>', values: [100000] }
          }
        }
      },
      'hces_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'household_id', type: 'text', description: 'Household identifier' },
          { name: 'income', type: 'numeric', description: 'Household income' },
          { name: 'expenditure', type: 'numeric', description: 'Total expenditure' },
          { name: 'region', type: 'text', description: 'Geographic region' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
        ],
        sample_filters: {
          text_filters: { region: 'Urban' },
          numeric_filters: {
            income: { op: '>', values: [50000] }
          }
        }
      },
      'nss_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'sample_id', type: 'text', description: 'Sample identifier' },
          { name: 'age_group', type: 'text', description: 'Age group category' },
          { name: 'education', type: 'text', description: 'Education level' },
          { name: 'employment', type: 'text', description: 'Employment status' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
        ],
        sample_filters: {
          text_filters: { age_group: '25-34' },
          numeric_filters: {}
        }
      },
      'census_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'district', type: 'text', description: 'District name' },
          { name: 'population', type: 'integer', description: 'Population count' },
          { name: 'area_km2', type: 'numeric', description: 'Area in square kilometers' },
          { name: 'density', type: 'numeric', description: 'Population density' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
        ],
        sample_filters: {
          text_filters: {},
          numeric_filters: {
            population: { op: '>', values: [1000000] }
          }
        }
      },
      'plfs_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'person_id', type: 'text', description: 'Person identifier' },
          { name: 'age', type: 'integer', description: 'Age in years' },
          { name: 'employment_status', type: 'text', description: 'Employment status' },
          { name: 'education_level', type: 'text', description: 'Education level' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
        ],
        sample_filters: {
          text_filters: { employment_status: 'Employed' },
          numeric_filters: {
            age: { op: '>', values: [18] }
          }
        }
      },
      'nfhs_data': {
        columns: [
          { name: 'id', type: 'integer', description: 'Primary key' },
          { name: 'household_id', type: 'text', description: 'Household identifier' },
          { name: 'health_indicator', type: 'text', description: 'Health indicator' },
          { name: 'value', type: 'numeric', description: 'Indicator value' },
          { name: 'region', type: 'text', description: 'Geographic region' },
          { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
        ],
        sample_filters: {
          text_filters: { health_indicator: 'Immunization' },
          numeric_filters: {
            value: { op: '>', values: [50] }
          }
        }
      }
    };
    
    return metadata[tableName] || null;
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
