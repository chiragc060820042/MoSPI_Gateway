import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/authService';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  TableCellsIcon,
  ChartBarIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

function QueryBuilder() {
  const { surveyId } = useParams();
  const { user, isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('survey_data');
  const [tableMetadata, setTableMetadata] = useState(null);
  
  // Filter states
  const [textFilters, setTextFilters] = useState({});
  const [numericFilters, setNumericFilters] = useState({});
  
  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  
  // Chart states
  const [chartType, setChartType] = useState('bar');
  const [chartConfig, setChartConfig] = useState({});
  const [xAxisField, setXAxisField] = useState('');
  const [yAxisField, setYAxisField] = useState('');
  const [aggregationType, setAggregationType] = useState('count'); // count, sum, avg, min, max
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15); // Start with 15 rows
  const [showAllRows, setShowAllRows] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the Query Builder.</p>
          <a 
            href="/login" 
            className="btn-primary inline-block"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Fetch available tables on component mount
  useEffect(() => {
    fetchAvailableTables();
  }, []);

  // Fetch table metadata when table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableMetadata(selectedTable);
    }
  }, [selectedTable]);

  const fetchAvailableTables = async () => {
    try {
      const response = await api.get('/query/tables');
      if (response.data.tables) {
        setAvailableTables(response.data.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch available tables. Please try again.');
      }
    }
  };

  const fetchTableMetadata = async (tableName) => {
    try {
      const response = await api.get(`/query/metadata/${tableName}`);
      if (response.data.metadata) {
        setTableMetadata(response.data.metadata);
        // Pre-populate with sample filters if available
        if (response.data.metadata.sample_filters) {
          setTextFilters(response.data.metadata.sample_filters.text_filters || {});
          setNumericFilters(response.data.metadata.sample_filters.numeric_filters || {});
        }
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch table metadata. Please try again.');
      }
    }
  };

  const handleTextFilterChange = (field, value) => {
    if (value.trim()) {
      setTextFilters(prev => ({ ...prev, [field]: value }));
    } else {
      const newFilters = { ...textFilters };
      delete newFilters[field];
      setTextFilters(newFilters);
    }
  };

  const handleNumericFilterChange = (field, op, values) => {
    console.log('handleNumericFilterChange called:', { field, op, values });
    
    if (values && values.length > 0 && values[0] !== '') {
      setNumericFilters(prev => ({ 
        ...prev, 
        [field]: { op, values: values.map(v => parseFloat(v)).filter(v => !isNaN(v)) }
      }));
    } else {
      const newFilters = { ...numericFilters };
      delete newFilters[field];
      setNumericFilters(newFilters);
    }
  };

  const executeQuery = async () => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }

    setLoading(true);
    setError(null);
    setQueryResult(null);
    
    // Reset pagination when executing new query
    setCurrentPage(1);
    setShowAllRows(false);
    setRowsPerPage(15);

    // Debug: Log the filters being sent
    console.log('Executing query with filters:', {
      target_table: selectedTable,
      text_filters: textFilters,
      numeric_filters: numericFilters
    });

    try {
      const response = await api.post(`/query/${surveyId || 'default'}`, {
        target_table: selectedTable,
        text_filters: textFilters,
        numeric_filters: numericFilters
      });
      
      if (response.data.success) {
        setQueryResult(response.data);
        setTotalRows(response.data.data?.length || 0);
        setViewMode('table'); // Switch to table view after query
      } else {
        setError(response.data.error || 'Query failed');
      }
    } catch (error) {
      console.error('Query execution error:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to execute query');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pagination functions
  const handleShowMore = () => {
    setShowAllRows(true);
    setRowsPerPage(100);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
    setShowAllRows(newRowsPerPage > 15);
  };

  // Calculate paginated data
  const getPaginatedData = () => {
    if (!queryResult?.data) return [];
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return queryResult.data.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const clearFilters = () => {
    setTextFilters({});
    setNumericFilters({});
    setQueryResult(null);
  };

  const exportData = () => {
    if (!queryResult?.data) return;
    
    const csvContent = [
      Object.keys(queryResult.data[0]).join(','),
      ...queryResult.data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_query_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportChart = () => {
    if (!queryResult?.data || !xAxisField || !yAxisField) return;
    
    // Create a canvas element to capture the chart
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Create a temporary chart instance for export
    const chartData = generateChartData();
    const options = getChartOptions();
    
    // For now, we'll export the chart data as JSON since direct canvas export is complex
    const chartExportData = {
      chartType,
      xAxisField,
      yAxisField,
      aggregationType,
      data: chartData,
      timestamp: new Date().toISOString(),
      table: selectedTable
    };
    
    const blob = new Blob([JSON.stringify(chartExportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_chart_${chartType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Chart configuration functions
  const generateChartData = () => {
    if (!queryResult?.data || !xAxisField || !yAxisField) return null;

    const data = queryResult.data;
    let chartData = {};

         if (chartType === 'pie') {
       // For pie charts, group by x-axis field and count
       chartData = data.reduce((acc, row) => {
         const key = String(row[xAxisField] || 'Unknown');
         acc[key] = (acc[key] || 0) + 1;
         return acc;
       }, {});

       const values = Object.values(chartData);
       const total = values.reduce((sum, val) => sum + val, 0);

       return {
         labels: Object.keys(chartData),
         datasets: [{
           data: values,
           backgroundColor: [
             '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
             '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
           ],
           borderWidth: 2,
           borderColor: '#fff',
           datalabels: {
             color: '#fff',
             font: {
               weight: 'bold',
               size: 12
             },
             formatter: function(value) {
               const percentage = ((value / total) * 100).toFixed(1);
               return percentage > 5 ? `${percentage}%` : '';
             }
           }
         }]
       };
    } else {
      // For other charts, group by x-axis and aggregate y-axis
      chartData = data.reduce((acc, row) => {
        const key = String(row[xAxisField] || 'Unknown');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(row[yAxisField]);
        return acc;
      }, {});

      const labels = Object.keys(chartData);
      const values = Object.values(chartData).map(group => {
        switch (aggregationType) {
          case 'sum':
            return group.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
          case 'avg':
            const sum = group.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            return group.length > 0 ? sum / group.length : 0;
          case 'min':
            return Math.min(...group.map(val => parseFloat(val) || 0));
          case 'max':
            return Math.max(...group.map(val => parseFloat(val) || 0));
          default: // count
            return group.length;
        }
      });

      return {
        labels,
        datasets: [{
          label: `${aggregationType} of ${yAxisField}`,
          data: values,
          backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.4
        }]
      };
    }
  };

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${chartType.toUpperCase()} Chart: ${xAxisField} vs ${yAxisField}`,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: chartType === 'pie' ? {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          } : undefined
        },
        datalabels: chartType === 'pie' ? {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value, context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return percentage > 5 ? `${percentage}%` : '';
          }
        } : undefined
      },
      scales: chartType !== 'pie' ? {
        x: {
          display: true,
          title: {
            display: true,
            text: xAxisField
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: `${aggregationType} of ${yAxisField}`
          }
        }
      } : undefined
    };

    return baseOptions;
  };

  const renderChart = () => {
    const chartData = generateChartData();
    if (!chartData) return null;

    const options = getChartOptions();

    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} height={400} />;
      case 'line':
        return <Line data={chartData} options={options} height={400} />;
      case 'pie':
        return <Pie data={chartData} options={options} height={400} />;
      case 'scatter':
        return <Scatter data={chartData} options={options} height={400} />;
      default:
        return <Bar data={chartData} options={options} height={400} />;
    }
  };

  // Auto-set chart fields when data changes
  useEffect(() => {
    if (queryResult?.data && queryResult.data.length > 0) {
      const columns = Object.keys(queryResult.data[0]);
      if (columns.length >= 2) {
        setXAxisField(columns[0]);
        setYAxisField(columns[1]);
      }
    }
  }, [queryResult]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Query Builder</h1>
        <p className="text-gray-600 mt-1">
          Build and execute queries on survey datasets with custom filters
        </p>
      </div>

      {/* Table Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Dataset</h2>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableTables.map(table => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Query Filters</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-6 space-y-6">
            {/* Text Filters */}
            {tableMetadata?.columns?.filter(col => col.type === 'text').length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Text Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tableMetadata.columns
                    .filter(col => col.type === 'text')
                    .map(col => (
                      <div key={col.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {col.name}
                        </label>
                        <input
                          type="text"
                          placeholder={`Filter by ${col.name}`}
                          value={textFilters[col.name] || ''}
                          onChange={(e) => handleTextFilterChange(col.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Numeric Filters */}
            {tableMetadata?.columns?.filter(col => col.type === 'integer' || col.type === 'numeric').length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Numeric Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tableMetadata.columns
                    .filter(col => col.type === 'integer' || col.type === 'numeric')
                    .map(col => (
                      <div key={col.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {col.name}
                        </label>
                        <div className="flex space-x-2">
                          <select
                            value={numericFilters[col.name]?.op || '='}
                            onChange={(e) => {
                              const newOp = e.target.value;
                              const currentValues = numericFilters[col.name]?.values || [];
                              handleNumericFilterChange(col.name, newOp, currentValues);
                            }}
                            className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="=">=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="!=">!=</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Value"
                            value={numericFilters[col.name]?.values?.[0] || ''}
                            onChange={(e) => handleNumericFilterChange(col.name, numericFilters[col.name]?.op || '=', [e.target.value])}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={executeQuery}
                disabled={loading}
                className="btn-primary flex items-center px-4 py-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Execute Query
                  </>
                )}
              </button>
              <button
                onClick={clearFilters}
                className="btn-secondary px-4 py-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {queryResult && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Query Results ({queryResult.count} rows)
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    viewMode === 'table' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TableCellsIcon className="h-4 w-4 mr-1" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    viewMode === 'chart' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  Chart
                </button>
                <button
                  onClick={exportData}
                  className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {queryResult.data[0] && Object.keys(queryResult.data[0]).map(key => (
                        <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getPaginatedData().map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  {/* Show More Button (only when showing initial 15 rows) */}
                  {!showAllRows && totalRows > 15 && (
                    <button
                      onClick={handleShowMore}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Show More (100 rows per page)
                    </button>
                  )}
                  
                  {/* Pagination Info and Controls */}
                  {showAllRows && (
                    <div className="flex items-center space-x-4">
                      {/* Rows per page selector */}
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700">Rows per page:</label>
                        <select
                          value={rowsPerPage}
                          onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={15}>15</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                        </select>
                      </div>
                      
                      {/* Page info */}
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages} ({totalRows.toLocaleString()} records)
                      </span>
                    </div>
                  )}
                  
                  {/* Navigation buttons */}
                  {showAllRows && totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === 1
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Previous
                      </button>
                      
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === totalPages
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Initial view info */}
                {!showAllRows && totalRows > 15 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing first {Math.min(rowsPerPage, totalRows)} rows of {totalRows.toLocaleString()} total rows
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Chart Controls */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Chart Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Chart Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chart Type
                      </label>
                      <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="scatter">Scatter Plot</option>
                      </select>
                    </div>

                    {/* X-Axis Field Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        X-Axis Field
                      </label>
                      <select
                        value={xAxisField}
                        onChange={(e) => setXAxisField(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Field</option>
                        {queryResult?.data?.[0] && Object.keys(queryResult.data[0]).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>

                    {/* Y-Axis Field Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Y-Axis Field
                      </label>
                      <select
                        value={yAxisField}
                        onChange={(e) => setYAxisField(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Field</option>
                        {queryResult?.data?.[0] && Object.keys(queryResult.data[0]).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>

                    {/* Aggregation Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aggregation
                      </label>
                      <select
                        value={aggregationType}
                        onChange={(e) => setAggregationType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </div>
                  </div>
                </div>

                                 {/* Chart Display */}
                 <div className="bg-white border border-gray-200 rounded-lg p-6">
                   {xAxisField && yAxisField ? (
                     <div>
                       <div className="flex justify-between items-center mb-4">
                         <h4 className="text-lg font-medium text-gray-900">Chart Visualization</h4>
                         <button
                           onClick={exportChart}
                           className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                         >
                           <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                           Export Chart
                         </button>
                       </div>
                                               <div className="h-96">
                          {renderChart()}
                        </div>
                        {chartType === 'pie' && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Detailed Breakdown</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {(() => {
                                const chartData = generateChartData();
                                if (!chartData) return null;
                                
                                const values = chartData.datasets[0].data;
                                const total = values.reduce((sum, val) => sum + val, 0);
                                
                                return chartData.labels.map((label, index) => {
                                  const value = values[index];
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return (
                                    <div key={label} className="flex justify-between items-center">
                                      <span className="text-gray-600">{label}:</span>
                                      <span className="font-medium">
                                        {value} ({percentage}%)
                                      </span>
                                    </div>
                                  );
                                });
                              })()}
                              <div className="col-span-full border-t pt-2 mt-2">
                                <div className="flex justify-between items-center font-semibold">
                                  <span>Total:</span>
                                  <span>{(() => {
                                    const chartData = generateChartData();
                                    return chartData ? chartData.datasets[0].data.reduce((sum, val) => sum + val, 0) : 0;
                                  })()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="text-center py-12 text-gray-500">
                       <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                       <p>Please select X and Y axis fields to display the chart</p>
                     </div>
                   )}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Query Error
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueryBuilder;
