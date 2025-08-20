import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentPlusIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../services/authService'; // adjust path as needed

function TableBuilder() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [tableName, setTableName] = useState('');
  const [ifNotExists, setIfNotExists] = useState(true);
  const [columns, setColumns] = useState([
    { name: '', type: 'TEXT' }
  ]);
  
  // Column type options
  const columnTypes = [
    'BIGINT', 'INTEGER', 'SMALLINT', 'DECIMAL', 'NUMERIC',
    'REAL', 'DOUBLE PRECISION', 'SERIAL', 'BIGSERIAL',
    'TEXT', 'VARCHAR', 'CHAR', 'UUID',
    'BOOLEAN', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ',
    'JSON', 'JSONB', 'ARRAY'
  ];

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'TEXT' }]);
  };

  const removeColumn = (index) => {
    if (columns.length > 1) {
      const newColumns = columns.filter((_, i) => i !== index);
      setColumns(newColumns);
    }
  };

  const updateColumn = (index, field, value) => {
    const newColumns = [...columns];
    newColumns[index][field] = value;
    setColumns(newColumns);
  };

  const validateForm = () => {
    if (!tableName.trim()) {
      setError('Table name is required');
      return false;
    }
    
    if (!tableName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      setError('Table name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return false;
    }
    
    for (const column of columns) {
      console.log('Validating column name:', `"${column.name}"`);
      if (!column.name.trim()) {
        setError('All columns must have a name');
        return false;
      }
      
      if (!column.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        setError('Column names must start with a letter or underscore and contain only letters, numbers, and underscores');
        return false;
      }
    }
    
    // Check for duplicate column names
    const columnNames = columns.map(col => col.name.toLowerCase());
    const uniqueNames = new Set(columnNames);
    if (uniqueNames.size !== columnNames.length) {
      setError('Column names must be unique');
      return false;
    }
    
    return true;
  };

  const createTable = async (config) => {
    try {
      const response = await api.post('/query/create-table', config);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const tableConfig = {
        if_not_exists: ifNotExists,
        columns: columns.map(col => ({
          name: col.name.trim(),
          type: col.type
        })),
        target_table: `public.${tableName.trim()}` // <-- FIXED KEY
      };

      console.log('Creating table with config:', tableConfig);

      // Use Axios instance (api) for the request
      await createTable(tableConfig);

      setSuccess(`Table "${tableName}" created successfully!`);
      setTableName('');
      setColumns([{ name: '', type: 'TEXT' }]);
    } catch (error) {
      console.error('Backend error:', error.response?.data);
      setError(error.response?.data?.error || error.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const generateJSON = () => {
    const config = {
      if_not_exists: ifNotExists,
      columns: columns.map(col => ({
        name: col.name.trim(),
        type: col.type
      })),
      dest_table: `public.${tableName.trim()}`
    };
    
    return JSON.stringify(config, null, 2);
  };

  const loadSampleConfig = () => {
    setTableName('sample_survey_data');
    setIfNotExists(true);
    setColumns([
      { name: 'id', type: 'BIGSERIAL' },
      { name: 'survey_name', type: 'TEXT' },
      { name: 'state_code', type: 'INTEGER' },
      { name: 'district_code', type: 'INTEGER' },
      { name: 'value', type: 'NUMERIC' },
      { name: 'multiplier', type: 'NUMERIC' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ]);
  };

  if (user?.role === 'public') {
    return (
      <div className="text-center py-12">
        <CogIcon className="h-16 w-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You need researcher or admin privileges to create tables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Table Builder</h1>
        <p className="text-gray-600 mt-1">
          Create survey tables dynamically using JSON configuration
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Success!
              </h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XMarkIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table Builder Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Table Configuration</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Name *
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g., survey_data_2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use only letters, numbers, and underscores. Must start with a letter or underscore.
                </p>
              </div>

              {/* If Not Exists Option */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ifNotExists"
                  checked={ifNotExists}
                  onChange={(e) => setIfNotExists(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ifNotExists" className="ml-2 block text-sm text-gray-900">
                  Create table only if it doesn't exist (IF NOT EXISTS)
                </label>
              </div>

              {/* Columns */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Columns *
                  </label>
                  <button
                    type="button"
                    onClick={addColumn}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Column
                  </button>
                </div>

                <div className="space-y-3">
                  {columns.map((column, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => updateColumn(index, 'name', e.target.value)}
                          placeholder="Column name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <select
                          value={column.type}
                          onChange={(e) => updateColumn(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {columnTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Table...
                    </>
                  ) : (
                    <>
                      <DocumentPlusIcon className="h-4 w-4 mr-2" />
                      Create Table
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={loadSampleConfig}
                  className="btn-secondary"
                >
                  Load Sample
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* JSON Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">JSON Configuration Preview</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-sm text-gray-800 overflow-x-auto">
                {generateJSON()}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This is the JSON configuration that will be sent to Supabase RPC function.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-3">How to Use</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>1. <strong>Table Name</strong>: Choose a descriptive name for your survey table</p>
              <p>2. <strong>Columns</strong>: Define the structure with appropriate data types</p>
              <p>3. <strong>IF NOT EXISTS</strong>: Prevents errors if table already exists</p>
              <p>4. <strong>Review JSON</strong>: Check the generated configuration</p>
              <p>5. <strong>Create Table</strong>: Execute the table creation</p>
            </div>
          </div>

          {/* Common Data Types */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Common Data Types</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>BIGINT</strong> - Large integers</div>
              <div><strong>INTEGER</strong> - Regular integers</div>
              <div><strong>TEXT</strong> - Variable-length text</div>
              <div><strong>VARCHAR</strong> - Limited text</div>
              <div><strong>NUMERIC</strong> - Decimal numbers</div>
              <div><strong>BOOLEAN</strong> - True/false values</div>
              <div><strong>DATE</strong> - Date only</div>
              <div><strong>TIMESTAMP</strong> - Date and time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableBuilder;
