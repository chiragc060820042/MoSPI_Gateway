import React, { useEffect, useState } from "react";
import axios from "axios";
import { UsersIcon, MagnifyingGlassIcon, FunnelIcon, ChartBarIcon, CogIcon, EyeIcon, EyeSlashIcon, UserPlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import LastLoginFormatter from '../components/LastLoginFormatter';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../services/authService';

// Helper to get the latest token from localStorage or sessionStorage
function getAuthToken() {
  return (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken')
  );
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  // Search states
  const [searchCriteria, setSearchCriteria] = useState({
    role_id: '',
    email: '',
    user_name: '',
    password: ''
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState('overview');
  const [showPassword, setShowPassword] = useState(false);

  // Move fetchUsers here so it's accessible everywhere
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      setUsers([]); // fallback to empty array on error
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUserStats() {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/admin/users/stats`,
        { headers: getAuthHeaders() }
      );
      setStats(res.data);
    } catch (err) {
      setStats(null);
    }
  }

  const handleAdvancedSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const criteria = {};
      Object.keys(searchCriteria).forEach(key => {
        if (searchCriteria[key] !== '') {
          criteria[key] = searchCriteria[key];
        }
      });

      if (Object.keys(criteria).length === 0) {
        setError('Please provide at least one search criteria');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(criteria)
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setError(null);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (error) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchCriteria({
      role_id: '',
      email: '',
      user_name: '',
      password: ''
    });
    fetchUsers();
  };

  const getRoleLabel = (roleId) => {
    const roles = {
      1: 'Public',
      2: 'Admin'
    };
    return roles[roleId] || 'Unknown';
  };

  const getRoleColor = (roleId) => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-red-100 text-red-800'
    };
    return colors[roleId] || 'bg-gray-100 text-gray-800';
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="h-16 w-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage users and monitor system activity
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="h-8 w-8 text-blue-600">👥</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total ?? '-'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="h-8 w-8 text-green-600">📈</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.byStatus?.active ?? '-'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="h-8 w-8 text-purple-600">🆕</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.recent ?? '-'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="h-8 w-8 text-orange-600">🛡️</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.byRole?.[2] ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Overview
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Advanced Search
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setActiveTab('search')}
                className="btn-primary flex items-center"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Advanced Search
              </button>
              <button
                onClick={fetchUsers}
                className="btn-secondary flex items-center"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Refresh Users
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                All Users ({users.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(users || []).map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.user_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role_id)}`}>
                          {getRoleLabel(user.role_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.id === currentUser?.id
                          ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded">Active</span>
                          : user.last_logout
                            ? <span>Last login <LastLoginFormatter lastLogin={user.last_logout} /></span>
                            : user.last_login
                              ? <span>Last login <LastLoginFormatter lastLogin={user.last_login} /></span>
                              : <span>Never</span>
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Advanced Search Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Advanced User Search</h2>
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                {showAdvancedSearch ? 'Hide' : 'Show'} Search
              </button>
            </div>

            {showAdvancedSearch && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role ID
                    </label>
                    <select
                      value={searchCriteria.role_id}
                      onChange={(e) => setSearchCriteria(prev => ({ ...prev, role_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Any Role</option>
                      <option value="1">Public (1)</option>
                      <option value="2">Admin (2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={searchCriteria.email}
                      onChange={(e) => setSearchCriteria(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={searchCriteria.user_name}
                      onChange={(e) => setSearchCriteria(prev => ({ ...prev, user_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (Hashed)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter hashed password"
                        value={searchCriteria.password}
                        onChange={(e) => setSearchCriteria(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleAdvancedSearch}
                    disabled={loading}
                    className="btn-primary flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                        Search Users
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearSearch}
                    className="btn-secondary"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Search Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {users.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Search Results ({users.length} users found)
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.user_name}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role_id)}`}>
                            {getRoleLabel(user.role_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <LastLoginFormatter lastLogin={user.last_login} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
