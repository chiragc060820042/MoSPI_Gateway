import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  async register(credentials) {
    return api.post('/auth/register', credentials).then(res => res.data);
  },

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data.user;
    } catch (error) {
      console.error('Get profile error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch profile');
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data.user;
    } catch (error) {
      console.error('Update profile error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Profile update failed');
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password change failed');
    }
  },

  async generateApiKey() {
    try {
      const response = await api.post('/auth/generate-api-key');
      return response.data;
    } catch (error) {
      console.error('Generate API key error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'API key generation failed');
    }
  },
};

export function getAuthHeaders() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default api;

const handleCreateTable = async () => {
  setLoading(true);
  try {
    await createTable(tableConfig); // tableConfig is your JSON config
    // Show success message, etc.
  } catch (error) {
    setError(error.message || 'Failed to create table');
  } finally {
    setLoading(false);
  }
};
