import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getDistinctSurveyNames,
  getSurveySubsets,
  getSurveyMetadata
} from '../services/surveyService';
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { SUPABASE_URL } from "../services/surveyService";
import { useLocation, useNavigate } from "react-router-dom";

function QueryBuilder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Survey selection states
  const [surveyNames, setSurveyNames] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [surveyYears, setSurveyYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [surveySubsets, setSurveySubsets] = useState([]);
  const [selectedSubset, setSelectedSubset] = useState('');
  const [textFilters, setTextFilters] = useState({}); // {col: value}
  const [numericFilters, setNumericFilters] = useState({}); // {col: {op, values}}


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

  const { user } = useAuth();
  const location = useLocation();
  const rerunRef = useRef(false);

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
    setLoading(true);
    setError('');
    const { textFilters, numericFilters } = buildFilters();
    const tableName = metadata && metadata[0] && metadata[0].table_name ? metadata[0].table_name : '';
    if (!tableName) {
      setQueryResult([]);
      setTotalRows(0);
      setLoading(false);
      return;
    }
    const pageNum = pageOverride || page;
    const rpp = rowsPerPageOverride || rowsPerPage;
    const start = (pageNum - 1) * rpp;
    const end = start + rpp - 1;
    let result = [];
    try {
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
      const url = `${baseUrl}/${encodeURIComponent(tableName)}${filterParams ? '?' + filterParams : ''}`;
      const response = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_API_KEY,
          Authorization: import.meta.env.VITE_SUPABASE_API_KEY,
          'Range': `${start}-${end}`,
          'Prefer': 'count=exact'
        }
      });
      if (!response.ok) {
        let msg = `Error: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.message) msg += ` - ${errJson.message}`;
        } catch { }
        setError(msg);
        setQueryResult([]);
        setTotalRows(0);
        setServerRowLimitReached(false);
        setLoading(false);
        return;
      }
      result = await response.json();
      const contentRange = response.headers.get('Content-Range');
      let total = 0;
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) total = parseInt(match[1], 10);
      }
      setTotalRows(total);
      setServerRowLimitReached(result.length === rpp && total > end + 1);
    } catch (e) {
      setError('Network or server error. Please try again.');
      result = [];
      setTotalRows(0);
      setServerRowLimitReached(false);
    }
    setQueryResult(result);
    setLoading(false);

    // Only log if the query was successful and user info is present
    if (user?.id && user?.email && selectedSurvey && selectedYear && selectedSubset) {
      try {
        const { textFilters, numericFilters } = buildFilters();
        await fetch(`${SUPABASE_URL}/rpc/add_json_to_user_array`, {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_API_KEY,
            Authorization: import.meta.env.VITE_SUPABASE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_user_id: user.id,
            p_email: user.email,
            p_new_item: {
              survey: selectedSurvey,
              year: selectedYear,
              subset: selectedSubset,
              filters: {
                textFilters,
                numericFilters
              },
              timestamp: new Date().toISOString(),
            },
          }),
        });
      } catch (e) {
        // Optionally log error, but don't block UI
        alert("Failed to log query history: " + e.message);
      }
    }
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

  // On mount, if rerun state is present, set all fields and mark rerunRef
  useEffect(() => {
    if (location.state) {
      setSelectedSurvey(location.state.survey || "");
      setSelectedYear(location.state.year || "");
      setSelectedSubset(location.state.subset || "");
      setTextFilters(location.state.filters?.textFilters || {});
      setNumericFilters(location.state.filters?.numericFilters || {});
      rerunRef.current = true;
    }
    // eslint-disable-next-line
  }, [location.state]);

  // When all fields are set and rerunRef is true, execute the query once
  useEffect(() => {
    if (
      rerunRef.current &&
      selectedSurvey &&
      selectedYear &&
      selectedSubset
    ) {
      executeQuery();
      rerunRef.current = false; // Prevent infinite loop
    }
    // eslint-disable-next-line
  }, [selectedSurvey, selectedYear, selectedSubset]);

  // Download query result as CSV
  const handleDownloadQueryResult = () => {
    if (!queryResult || !queryResult.length) return;
    const cols = Object.keys(queryResult[0]);
    const csvRows = [
      cols.join(","),
      ...queryResult.map(row =>
        cols.map(col => `"${row[col] !== undefined && row[col] !== null ? row[col] : ""}"`).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_result.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto py-0">
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
                <input
                  type="checkbox"
                  className="ml-2"
                  checked={!!showOnlyColumns[col.name]}
                  onChange={e => setShowOnlyColumns({ ...showOnlyColumns, [col.name]: e.target.checked })}
                  title="Show only this column in table"
                />
                <span className="text-xs text-gray-500">Show only</span>
              </div>
            ))}
          </>
        )}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => { setPage(1); executeQuery(1, rowsPerPage); }}
            className={`px-4 py-2 rounded ${canExecute && !loading ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={!canExecute || loading}
            {...error && (
              <div className="mt-2 text-red-600 text-sm font-medium">{error}</div>
            )}
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
          <button
            onClick={handleDownloadQueryResult}
            className={`px-4 py-2 rounded ${queryResult.length > 0 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={queryResult.length === 0}
          >
            <span className="inline-block align-middle mr-1">⬇️</span> Download CSV
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
              <div className="sticky bottom-0 left-0 w-full bg-white border-t border-gray-200 flex items-center justify-between py-2 px-2 mt-2 z-10" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.03)' }}>
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
                  <div className="w-full flex items-center">
                    <PieChart width={800} height={400}>
                      <Tooltip />
                      <Pie
                        data={
                          (() => {
                            const N = 20;
                            if (queryResult.length <= N) return queryResult;
                            const sorted = [...queryResult].sort((a, b) => b[chartY] - a[chartY]);
                            const top = sorted.slice(0, N);
                            const otherValue = sorted.slice(N).reduce((sum, d) => sum + (Number(d[chartY]) || 0), 0);
                            return [
                              ...top,
                              { [chartX]: 'Other', [chartY]: otherValue }
                            ];
                          })()
                        }
                        dataKey={chartY}
                        nameKey={chartX}
                        cx={350}
                        cy={180}
                        outerRadius={300}
                        fill="#2563eb"
                        label={({ name, value }) => {
                          // Only show labels if <= 10 slices, otherwise hide (show only on hover)
                          const data = queryResult.length <= 20
                            ? queryResult
                            : [
                              ...[...queryResult].sort((a, b) => b[chartY] - a[chartY]).slice(0, 20),
                              { [chartX]: 'Other' }
                            ];
                          if (data.length > 10) return '';
                          return `${name}: ${value}`;
                        }}
                      >
                        {(() => {
                          const data = queryResult.length <= 20
                            ? queryResult
                            : [
                              ...[...queryResult].sort((a, b) => b[chartY] - a[chartY]).slice(0, 20),
                              { [chartX]: 'Other' }
                            ];
                          return data.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={`hsl(${(idx * 47) % 360}, 70%, 60%)`} />
                          ));
                        })()}
                      </Pie>
                    </PieChart>
                    <div
                      className="flex flex-wrap justify-center gap-x-6 gap-y-2 w-full mt-6"
                      style={{
                        maxWidth: 900,
                        minWidth: 180,
                        alignContent: 'flex-start'
                      }}
                    >
                      {(() => {
                        const data = queryResult.length <= 20
                          ? queryResult
                          : [
                            ...[...queryResult].sort((a, b) => b[chartY] - a[chartY]).slice(0, 20),
                            { [chartX]: 'Other' }
                          ];
                        return data.map((entry, idx) => (
                          <div key={idx} className="flex items-center mr-4 mb-1 min-w-[90px]">
                            <span
                              className="inline-block w-4 h-4 mr-2 rounded"
                              style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 70%, 60%)` }}
                            ></span>
                            <span className="text-xs truncate">{entry[chartX]}: <b>{entry[chartY]}</b></span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500">Select X and Y columns to view chart.</div>
            )}
          </div>
        )}
      </div>
      {/* <div className="flex justify-end mb-2">
        <button
          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
          onClick={handleDownloadQueryResult}
          disabled={!queryResult || !queryResult.length}
          title="Download This Query Result"
        >
          ⬇️ Download Result
        </button>
      </div> */}
    </div>
  );
}

export default QueryBuilder;