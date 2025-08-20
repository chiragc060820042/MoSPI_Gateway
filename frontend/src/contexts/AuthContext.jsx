import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run once on mount
    const sessionToken = sessionStorage.getItem('authToken');
    const localToken = localStorage.getItem('authToken');
    const token = sessionToken || localToken;

    if (token) {
      authService.getProfile()
        .then(userData => setUser(userData))
        .catch(() => {
          sessionStorage.removeItem('authToken');
          localStorage.removeItem('authToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      setError(null);
      
      const response = await authService.login(credentials);
      
      // Store token based on remember me preference
      if (credentials.rememberMe) {
        localStorage.setItem('authToken', response.data.token);
      } else {
        sessionStorage.setItem('authToken', response.data.token);
      }
      
      setUser(response.user);
      return { success: true };
    } catch (err) {
      console.error('AuthContext: Login failed:', err);
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);
      
      // Store token based on remember me preference (default to true for registration)
      if (userData.rememberMe !== false) {
        localStorage.setItem('authToken', response.data.token);
      } else {
        sessionStorage.setItem('authToken', response.data.token);
      }
      setUser(response.user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
        },
      });
    } catch (e) {
      // handle error if needed
    }
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const generateApiKey = async () => {
    try {
      setError(null);
      const { apiKey } = await authService.generateApiKey();
      setUser(prev => ({ ...prev, apiKey }));
      return { success: true, apiKey };
    } catch (err) {
      const errorMessage = err.message || 'API key generation failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Example of making an admin API call
  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/admin/users/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    generateApiKey,
    fetchAdminStats, // Expose the admin stats function if needed
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
