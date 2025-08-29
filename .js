import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getDistinctSurveyNames,
  getSurveySubsets,
  getSurveyMetadata,
  getFilteredSurveyData
} from '../services/surveyService';


function QueryBuilder() {
  // Survey selection states
  const [surveyNames, setSurveyNames] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [surveyYears, setSurveyYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [surveySubsets, setSurveySubsets] = useState([]);
  const [selectedSubset, setSelectedSubset] = useState('');

  // Metadata and query states
  const [metadata, setMetadata] = useState({});
  const [queryResult, setQueryResult] = useState([]);

  // Dynamic filter states
  const [selectedColumns, setSelectedColumns] = useState([]); // [{col, type}]
  const [columnFilters, setColumnFilters] = useState({}); // {col: {op, value}}
  const [availableColumns, setAvailableColumns] = useState([]); // [{name, type, values}]

  // Load survey names
  useEffect(() => {
    async function fetchSurveys() {
      const result = await getDistinctSurveyNames();
      setSurveyNames(result.map(row => row.survey_name));
    }
    fetchSurveys();
  }, []);

  // Load years when survey changes
  useEffect(() => {
    if (selectedSurvey) {
      getSurveySubsets(selectedSurvey).then(data => {
        setSurveyYears([...new Set(data.map(d => d.survey_year))]);
        setSurveySubsets([]);
        setSelectedYear('');
        setSelectedSubset('');
        setSelectedColumns([]);
        setColumnFilters({});
        setAvailableColumns([]);
      });
    }
  }, [selectedSurvey]);

  // Load subsets when year changes
  useEffect(() => {
    if (selectedSurvey && selectedYear) {
      getSurveySubsets(selectedSurvey).then(data => {
        const subsets = data
          .filter(d => d.survey_year == selectedYear)
          .map(d => d.survey_subset);
        setSurveySubsets(subsets);
        setSelectedSubset('');
        setSelectedColumns([]);
        setColumnFilters({});
        setAvailableColumns([]);
      });
    }
  }, [selectedSurvey, selectedYear]);

  // Load metadata when subset changes
  useEffect(() => {
    if (selectedSurvey && selectedYear && selectedSubset) {
      getSurveyMetadata(selectedSurvey, selectedYear, selectedSubset).then(meta => {
        setMetadata(meta);
        if (meta && meta[0]) {
          // Build available columns list
          const cols = meta[0].survey_column_names.map((col, idx) => ({
            name: col,
            type: meta[0].data_types[idx],
            values: meta[0].data_info[col]
          }));
          setAvailableColumns(cols);
        } else {
          setAvailableColumns([]);
        }
        setSelectedColumns([]);
        setColumnFilters({});
      });
    }
  }, [selectedSurvey, selectedYear, selectedSubset]);

  // Add a column to filter
  const handleAddColumn = (colName) => {
    if (!colName || selectedColumns.find(c => c.name === colName)) return;
    const col = availableColumns.find(c => c.name === colName);
    setSelectedColumns([...selectedColumns, col]);
    setColumnFilters({ ...columnFilters, [colName]: { op: '', value: '' } });
  };

  // Remove a column filter
  const handleRemoveColumn = (colName) => {
    setSelectedColumns(selectedColumns.filter(c => c.name !== colName));
    const newFilters = { ...columnFilters };
    delete newFilters[colName];
    setColumnFilters(newFilters);
  };

  // Update filter value/operator
  const handleFilterChange = (colName, key, val) => {
    setColumnFilters({
      ...columnFilters,
      [colName]: {
        ...columnFilters[colName],
        [key]: val
      }
    });
  };

  // Build text/numeric filters for API
  const buildFilters = () => {
    const textFilters = {};
    const numericFilters = {};
    selectedColumns.forEach(col => {
      const filter = columnFilters[col.name];
      if (!filter || filter.value === '') return;
      if (col.type === 'text' || col.type === 'varchar' || col.type === 'character varying') {
        textFilters[col.name] = filter.value;
      } else {
        numericFilters[col.name] = { op: filter.op || '=', values: [filter.value] };
      }
    });
    return { textFilters, numericFilters };
  };

  // Query data
  const executeQuery = async () => {
    if (!selectedSurvey || !selectedYear || !selectedSubset) return;
    const { textFilters, numericFilters } = buildFilters();
    // Use table_name from metadata (subset_metadata)
    const tableName = metadata && metadata[0] && metadata[0].table_name ? metadata[0].table_name : '';
    if (!tableName) {
      setQueryResult([]);
      return;
    }
    const result = await getFilteredSurveyData({
      table_name: tableName,
      text_filters: textFilters,
      numeric_filters: numericFilters
    });
    setQueryResult(result);
  };

  // Only enable execute if required fields are filled
  const canExecute = selectedSurvey && selectedYear && selectedSubset;

  // Get columns not yet selected
  const unselectedColumns = availableColumns.filter(
    c => !selectedColumns.find(sel => sel.name === c.name)
  );

  // Operators for numeric columns
  const numericOps = ['=', '>', '<', '>=', '<=', '!='];

  // Chart state

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'pie'
  const [chartX, setChartX] = useState('');
  const [chartY, setChartY] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Get numeric columns for chart Y
  const numericColumns = availableColumns.filter(col =>
    ['int', 'integer', 'float', 'double', 'numeric', 'real', 'bigint', 'smallint', 'decimal', 'number'].some(t => col.type && col.type.toLowerCase().includes(t))
  );
  // All columns for chart X
  const allColumns = availableColumns;

  // Pagination logic
  const totalRows = Array.isArray(queryResult) ? queryResult.length : 0;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedRows = Array.isArray(queryResult)
    ? queryResult.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : [];

  // Reset page on new query
  useEffect(() => { setPage(1); }, [queryResult, rowsPerPage]);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Query Builder</h1>
      <p className="mb-6 text-gray-600">Build and execute queries on survey datasets with custom filters</p>

      {/* Card: Dataset selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Dataset</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="survey-select" className="block mb-1 font-medium">Survey</label>
            <select
              id="survey-select"
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
              className="border px-3 py-2 rounded w-48"
            >
              <option value="">Select Survey</option>
              {surveyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year-select" className="block mb-1 font-medium">Year</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              disabled={!selectedSurvey}
              className="border px-3 py-2 rounded w-32"
            >
              <option value="">Select Year</option>
              {surveyYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subset-select" className="block mb-1 font-medium">Subset</label>
            <select
              id="subset-select"
              value={selectedSubset}
              onChange={e => setSelectedSubset(e.target.value)}
              disabled={!selectedYear}
              className="border px-3 py-2 rounded w-40"
            >
              <option value="">Select Subset</option>
              {surveySubsets.map(subset => (
                <option key={subset} value={subset}>{subset}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card: Query Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Query Filters</h2>
          {/* Optionally add Hide/Show Filters toggle here */}
        </div>
        {availableColumns.length > 0 && (
          <>
            <div className="flex items-center mb-4">
              <label className="mr-2 font-medium">Add Filter Column:</label>
              <select
                className="border px-2 py-1 rounded"
                value=""
                onChange={e => {
                  handleAddColumn(e.target.value);
                }}
              >
                <option value="">Select Column</option>
                {unselectedColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            {/* Render selected column filters */}
            {selectedColumns.map(col => (
              <div key={col.name} className="flex items-center mb-2 space-x-2">
                <span className="font-medium">{col.name}</span>
                {col.type === 'text' || col.type === 'varchar' || col.type === 'character varying' ? (
                  <>
                    <select
                      className="border px-2 py-1 rounded"
                      value={columnFilters[col.name]?.value || ''}
                      onChange={e => handleFilterChange(col.name, 'value', e.target.value)}
                    >
                      <option value="">Select Value</option>
                      {Array.isArray(col.values) && col.values.filter(v => v !== null).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      className="border px-2 py-1 rounded"
                      value={columnFilters[col.name]?.op || '='}
                      onChange={e => handleFilterChange(col.name, 'op', e.target.value)}
                    >
                      {numericOps.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="border px-2 py-1 rounded w-24"
                      value={columnFilters[col.name]?.value || ''}
                      onChange={e => handleFilterChange(col.name, 'value', e.target.value)}
                    />
                  </>
                )}
                <button
                  className="ml-2 px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleRemoveColumn(col.name)}
                >Remove</button>
              </div>
            ))}
          </>
        )}
        <div className="mt-4 flex gap-4">
          <button
            onClick={executeQuery}
            className={`px-4 py-2 rounded ${canExecute ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={!canExecute}
          >
            <span className="inline-block align-middle mr-1">🔍</span> Execute Query
          </button>
          <button
            onClick={() => {
              setSelectedColumns([]); setColumnFilters({}); setQueryResult([]);
            }}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Card: Query Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Query Results ({totalRows} rows)</h2>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              className={`px-3 py-1 rounded ${viewMode === 'chart' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setViewMode('chart')}
              disabled={!queryResult || queryResult.length === 0}
            >
              Chart
            </button>
            {/* Export button can be added here */}
          </div>
        </div>
        {viewMode === 'table' ? (
          Array.isArray(queryResult) && queryResult.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    className="border px-2 py-1 rounded"
                    value={rowsPerPage}
                    onChange={e => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={15}>15</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border bg-gray-100"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >Prev</button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    className="px-2 py-1 rounded border bg-gray-100"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >Next</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(queryResult[0]).map(col => (
                        <th key={col} className="border px-3 py-2 text-left">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="border px-3 py-2">{val !== null ? val.toString() : '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No data available for the current query.</div>
          )
        ) : (
          <div>
            {/* Chart controls */}
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block mb-1 font-medium">Chart Type</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartType}
                  onChange={e => setChartType(e.target.value)}
                >
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="pie">Pie</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">X Axis</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartX}
                  onChange={e => setChartX(e.target.value)}
                >
                  <option value="">Select Column</option>
                  {allColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Y Axis</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartY}
                  onChange={e => setChartY(e.target.value)}
                >
                  <option value="">Select Column</option>
                  {numericColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {chartX && chartY && queryResult.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'bar' && (
                  <BarChart data={queryResult} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={chartX} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={chartY} fill="#2563eb" />
                  </BarChart>
                )}
                {chartType === 'line' && (
                  <LineChart data={queryResult} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={chartX} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={chartY} stroke="#2563eb" dot={false} />
                  </LineChart>
                )}
                {chartType === 'pie' && (
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={queryResult}
                      dataKey={chartY}
                      nameKey={chartX}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#2563eb"
                      label
                    >
                      {queryResult.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={`hsl(${(idx * 47) % 360}, 70%, 60%)`} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500">Select X and Y columns to view chart.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryBuilder;









import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getDistinctSurveyNames,
  getSurveySubsets,
  getSurveyMetadata
} from '../services/surveyService';

import { SUPABASE_URL } from '../services/surveyService';
// } from '../services/surveyService';

function QueryBuilder() {
  // Survey selection states
  const [surveyNames, setSurveyNames] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [surveyYears, setSurveyYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [surveySubsets, setSurveySubsets] = useState([]);
  const [selectedSubset, setSelectedSubset] = useState('');

  // Metadata and query states
  const [metadata, setMetadata] = useState({});
  const [queryResult, setQueryResult] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  // Dynamic filter states
  const [selectedColumns, setSelectedColumns] = useState([]); // [{col, type}]
  const [columnFilters, setColumnFilters] = useState({}); // {col: {op, value}}
  const [availableColumns, setAvailableColumns] = useState([]); // [{name, type, values}]

  // Chart state
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'pie'
  const [chartX, setChartX] = useState('');
  const [chartY, setChartY] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [serverRowLimitReached, setServerRowLimitReached] = useState(false);

  // Column selection for display
  const [showOnlyColumns, setShowOnlyColumns] = useState({}); // {colName: true/false}

  // Load survey names
  useEffect(() => {
    async function fetchSurveys() {
      const result = await getDistinctSurveyNames();
      setSurveyNames(result.map(row => row.survey_name));
    }
    fetchSurveys();
  }, []);

  // Load years when survey changes
  useEffect(() => {
    if (selectedSurvey) {
      getSurveySubsets(selectedSurvey).then(data => {
        setSurveyYears([...new Set(data.map(d => d.survey_year))]);
        setSurveySubsets([]);
        setSelectedYear('');
        setSelectedSubset('');
        setSelectedColumns([]);
        setColumnFilters({});
        setAvailableColumns([]);
      });
    }
  }, [selectedSurvey]);

  // Load subsets when year changes
  useEffect(() => {
    if (selectedSurvey && selectedYear) {
      getSurveySubsets(selectedSurvey).then(data => {
        const subsets = data
          .filter(d => d.survey_year == selectedYear)
          .map(d => d.survey_subset);
        setSurveySubsets(subsets);
        setSelectedSubset('');
        setSelectedColumns([]);
        setColumnFilters({});
        setAvailableColumns([]);
      });
    }
  }, [selectedSurvey, selectedYear]);

  // Load metadata when subset changes
  useEffect(() => {
    if (selectedSurvey && selectedYear && selectedSubset) {
      getSurveyMetadata(selectedSurvey, selectedYear, selectedSubset).then(meta => {
        setMetadata(meta);
        if (meta && meta[0]) {
          // Build available columns list
          const cols = meta[0].survey_column_names.map((col, idx) => ({
            name: col,
            type: meta[0].data_types[idx],
            values: meta[0].data_info[col]
          }));
          setAvailableColumns(cols);
        } else {
          setAvailableColumns([]);
        }
        setSelectedColumns([]);
        setColumnFilters({});
      });
    }
  }, [selectedSurvey, selectedYear, selectedSubset]);

  // Add a column to filter
  const handleAddColumn = (colName) => {
    if (!colName || selectedColumns.find(c => c.name === colName)) return;
    const col = availableColumns.find(c => c.name === colName);
    setSelectedColumns([...selectedColumns, col]);
    setColumnFilters({ ...columnFilters, [colName]: { op: '', value: '' } });
  };

  // Remove a column filter
  const handleRemoveColumn = (colName) => {
    setSelectedColumns(selectedColumns.filter(c => c.name !== colName));
    const newFilters = { ...columnFilters };
    delete newFilters[colName];
    setColumnFilters(newFilters);
    setShowOnlyColumns(prev => {
      const copy = { ...prev };
      delete copy[colName];
      return copy;
    });
  };

  // Update filter value/operator
  const handleFilterChange = (colName, key, val) => {
    setColumnFilters({
      ...columnFilters,
      [colName]: {
        ...columnFilters[colName],
        [key]: val
      }
    });
  };

  // Build text/numeric filters for API
  const buildFilters = () => {
    const textFilters = {};
    const numericFilters = {};
    selectedColumns.forEach(col => {
      const filter = columnFilters[col.name];
      if (!filter || filter.value === '') return;
      if (col.type === 'text' || col.type === 'varchar' || col.type === 'character varying') {
        textFilters[col.name] = filter.value;
      } else {
        numericFilters[col.name] = { op: filter.op || '=', values: [filter.value] };
      }
    });
    return { textFilters, numericFilters };
  };

  // Query data (server-side pagination)
  const executeQuery = async (pageOverride, rowsPerPageOverride) => {
    if (!selectedSurvey || !selectedYear || !selectedSubset) return;
    const { textFilters, numericFilters } = buildFilters();
    const tableName = metadata && metadata[0] && metadata[0].table_name ? metadata[0].table_name : '';
    if (!tableName) {
      setQueryResult([]);
      setTotalRows(0);
      return;
    }
    const pageNum = pageOverride || page;
    const rpp = rowsPerPageOverride || rowsPerPage;
    const start = (pageNum - 1) * rpp;
    const end = start + rpp - 1;
    let result = [];
    try {
      // Use SUPABASE_URL from surveyService.js
      const baseUrl = SUPABASE_URL.replace(/\/$/, '');
      const operatorMap = {
        '=': 'eq',
        '>': 'gt',
        '<': 'lt',
        '>=': 'gte',
        '<=': 'lte',
        '!=': 'neq'
      };
      const filterParams = [
        ...Object.entries(textFilters).map(([k, v]) => `${k}=ilike.*${encodeURIComponent(v)}*`),
        ...Object.entries(numericFilters).map(([k, conf]) => {
          const op = operatorMap[conf.op || '='];
          return `${k}=${op}.${conf.values[0]}`;
        })
      ].join('&');
      // Use /rpc/{tableName} for function call, or /{tableName} for direct table
      const url = `${baseUrl}/${encodeURIComponent(tableName)}${filterParams ? '?' + filterParams : ''}`;
      const response = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_API_KEY,
          Authorization: import.meta.env.VITE_SUPABASE_API_KEY,
          'Range': `${start}-${end}`
        }
      });
      result = await response.json();
      // Get total count from Content-Range header
      const contentRange = response.headers.get('Content-Range');
      let total = 0;
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) total = parseInt(match[1], 10);
      }
      setTotalRows(total);
      setServerRowLimitReached(result.length === rpp && total > end + 1);
    } catch (e) {
      result = [];
      setTotalRows(0);
      setServerRowLimitReached(false);
    }
    setQueryResult(result);
  };

  // Only enable execute if required fields are filled
  const canExecute = selectedSurvey && selectedYear && selectedSubset;

  // Get columns not yet selected
  const unselectedColumns = availableColumns.filter(
    c => !selectedColumns.find(sel => sel.name === c.name)
  );

  // Operators for numeric columns
  const numericOps = ['=', '>', '<', '>=', '<=', '!='];

  // Get numeric columns for chart Y
  const numericColumns = availableColumns.filter(col =>
    ['int', 'integer', 'float', 'double', 'numeric', 'real', 'bigint', 'smallint', 'decimal', 'number'].some(t => col.type && col.type.toLowerCase().includes(t))
  );
  // All columns for chart X
  const allColumns = availableColumns;

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRows = queryResult;

  // Reset page on new query or rowsPerPage change
  useEffect(() => { setPage(1); }, [rowsPerPage]);
  useEffect(() => { if (canExecute) executeQuery(1, rowsPerPage); }, [rowsPerPage]);
  // When page changes, fetch new data
  useEffect(() => { if (canExecute) executeQuery(page, rowsPerPage); }, [page]);

  // Columns to show in table
  const checkedCols = Object.keys(showOnlyColumns).filter(k => showOnlyColumns[k]);
  const tableColumns = checkedCols.length > 0
    ? checkedCols
    : (queryResult[0] ? Object.keys(queryResult[0]) : []);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Query Builder</h1>
      <p className="mb-6 text-gray-600">Build and execute queries on survey datasets with custom filters</p>

      {/* Card: Dataset selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Dataset</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="survey-select" className="block mb-1 font-medium">Survey</label>
            <select
              id="survey-select"
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
              className="border px-3 py-2 rounded w-48"
            >
              <option value="">Select Survey</option>
              {surveyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year-select" className="block mb-1 font-medium">Year</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              disabled={!selectedSurvey}
              className="border px-3 py-2 rounded w-32"
            >
              <option value="">Select Year</option>
              {surveyYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subset-select" className="block mb-1 font-medium">Subset</label>
            <select
              id="subset-select"
              value={selectedSubset}
              onChange={e => setSelectedSubset(e.target.value)}
              disabled={!selectedYear}
              className="border px-3 py-2 rounded w-40"
            >
              <option value="">Select Subset</option>
              {surveySubsets.map(subset => (
                <option key={subset} value={subset}>{subset}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card: Query Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Query Filters</h2>
        </div>
        {availableColumns.length > 0 && (
          <>
            <div className="flex items-center mb-4">
              <label className="mr-2 font-medium">Add Filter Column:</label>
              <select
                className="border px-2 py-1 rounded"
                value=""
                onChange={e => {
                  handleAddColumn(e.target.value);
                }}
              >
                <option value="">Select Column</option>
                {unselectedColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            {/* Render selected column filters */}
            {selectedColumns.map(col => (
              <div key={col.name} className="flex items-center mb-2 space-x-2">
                <span className="font-medium">{col.name}</span>
                <input
                  type="checkbox"
                  className="ml-2"
                  checked={!!showOnlyColumns[col.name]}
                  onChange={e => setShowOnlyColumns({ ...showOnlyColumns, [col.name]: e.target.checked })}
                  title="Show only this column in table"
                />
                <span className="text-xs text-gray-500">Show only</span>
                {col.type === 'text' || col.type === 'varchar' || col.type === 'character varying' ? (
                  <>
                    <select
                      className="border px-2 py-1 rounded"
                      value={columnFilters[col.name]?.value || ''}
                      onChange={e => handleFilterChange(col.name, 'value', e.target.value)}
                    >
                      <option value="">Select Value</option>
                      {Array.isArray(col.values) && col.values.filter(v => v !== null).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      className="border px-2 py-1 rounded"
                      value={columnFilters[col.name]?.op || '='}
                      onChange={e => handleFilterChange(col.name, 'op', e.target.value)}
                    >
                      {numericOps.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="border px-2 py-1 rounded w-24"
                      value={columnFilters[col.name]?.value || ''}
                      onChange={e => handleFilterChange(col.name, 'value', e.target.value)}
                    />
                  </>
                )}
                <button
                  className="ml-2 px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleRemoveColumn(col.name)}
                >Remove</button>
              </div>
            ))}
          </>
        )}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => { setPage(1); executeQuery(1, rowsPerPage); }}
            className={`px-4 py-2 rounded ${canExecute ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={!canExecute}
          >
            <span className="inline-block align-middle mr-1">🔍</span> Execute Query
          </button>
          <button
            onClick={() => {
              setSelectedColumns([]); setColumnFilters({}); setQueryResult([]); setShowOnlyColumns({});
            }}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Card: Query Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Query Results ({totalRows} rows)</h2>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              className={`px-3 py-1 rounded ${viewMode === 'chart' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setViewMode('chart')}
              disabled={!queryResult || queryResult.length === 0}
            >
              Chart
            </button>
          </div>
        </div>
        {viewMode === 'table' ? (
          Array.isArray(queryResult) && queryResult.length > 0 ? (
            <div className="relative">
              {serverRowLimitReached && (
                <div className="text-xs text-yellow-600 mb-2">Showing only {rowsPerPage} rows per page. Use filters to narrow results.</div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {tableColumns.map(col => (
                        <th key={col} className="border px-3 py-2 text-left">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {tableColumns.map((col, i) => (
                          <td key={i} className="border px-3 py-2">{row[col] !== null ? row[col].toString() : '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Sticky pagination controls at bottom */}
              <div className="sticky bottom-0 left-0 w-full bg-white border-t border-gray-200 flex items-center justify-between py-2 px-2 mt-2 z-10" style={{boxShadow:'0 -2px 8px rgba(0,0,0,0.03)'}}>
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    className="border px-2 py-1 rounded"
                    value={rowsPerPage}
                    onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); executeQuery(1, Number(e.target.value)); }}
                  >
                    <option value={15}>15</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border bg-gray-100"
                    onClick={() => { setPage(p => Math.max(1, p - 1)); executeQuery(page - 1, rowsPerPage); }}
                    disabled={page === 1}
                  >Prev</button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    className="px-2 py-1 rounded border bg-gray-100"
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); executeQuery(page + 1, rowsPerPage); }}
                    disabled={page === totalPages}
                  >Next</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No data available for the current query.</div>
          )
        ) : (
          <div>
            {/* Chart controls */}
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block mb-1 font-medium">Chart Type</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartType}
                  onChange={e => setChartType(e.target.value)}
                >
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="pie">Pie</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">X Axis</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartX}
                  onChange={e => setChartX(e.target.value)}
                >
                  <option value="">Select Column</option>
                  {allColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Y Axis</label>
                <select
                  className="border px-2 py-1 rounded"
                  value={chartY}
                  onChange={e => setChartY(e.target.value)}
                >
                  <option value="">Select Column</option>
                  {numericColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {chartX && chartY && queryResult.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'bar' && (
                  <BarChart data={queryResult} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={chartX} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={chartY} fill="#2563eb" />
                  </BarChart>
                )}
                {chartType === 'line' && (
                  <LineChart data={queryResult} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={chartX} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={chartY} stroke="#2563eb" dot={false} />
                  </LineChart>
                )}
                {chartType === 'pie' && (
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={queryResult}
                      dataKey={chartY}
                      nameKey={chartX}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#2563eb"
                      label
                    >
                      {queryResult.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={`hsl(${(idx * 47) % 360}, 70%, 60%)`} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500">Select X and Y columns to view chart.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryBuilder;