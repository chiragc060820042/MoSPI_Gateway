import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import LastLoginFormatter from "../components/LastLoginFormatter";
import { useNavigate } from "react-router-dom";

const SUPABASE_URL = "https://odaheneiylpxohcnoptl.supabase.co/rest/v1";
const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY;

function QueryHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [deletingIdx, setDeletingIdx] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [filterSurvey, setFilterSurvey] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) {
      setError("User not logged in.");
      setLoading(false);
      return;
    }
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `${SUPABASE_URL}/users?id=eq.${user.id}&select=query_history`,
          {
            headers: {
              apikey: SUPABASE_API_KEY,
              Authorization: SUPABASE_API_KEY,
            },
          }
        );
        const userData = res.data[0];
        // Skip the first entry if it only contains a user id
        let historyArr = userData?.query_history || [];
        if (historyArr.length && historyArr[0]?.user) {
          historyArr = historyArr.slice(1);
        }
        setHistory(historyArr);
      } catch (err) {
        setError("Failed to load query history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  // Helper to parse and extract fields
  const parseQuery = (item) => {
    return {
      survey: item.survey || "-",
      year: item.year || "-",
      subset: item.subset || "-",
      filters: item.filters?.textFilters || {},
      numericFilters: item.filters?.numericFilters || {},
      raw: item,
    };
  };

  // Re-run Query
  const handleRerun = (item) => {
    navigate("/query", {
      state: {
        survey: item.survey,
        year: item.year,
        subset: item.subset,
        filters: item.filters,
        numericFilters: item.filters?.numericFilters,
      },
    });
  };

  // Delete Query
  const handleDelete = async (idx) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;
    setDeletingIdx(idx);
    try {
      // Remove the item at idx from the array
      const newHistory = history.filter((_, i) => i !== idx);
      // Update in Supabase
      await axios.patch(
        `${SUPABASE_URL}/users?id=eq.${user.id}`,
        { query_history: newHistory },
        {
          headers: {
            apikey: SUPABASE_API_KEY,
            Authorization: SUPABASE_API_KEY,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        }
      );
      setHistory(newHistory);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (err) {
      alert("Failed to delete query.");
    } finally {
      setDeletingIdx(null);
    }
  };

  // Download history as CSV
  const handleDownloadHistory = () => {
    if (!filteredHistory.length) return;
    const csvRows = [
      "Survey,Year,Subset,Filters,Timestamp",
      ...filteredHistory.map((q) =>
        [
          q.survey,
          q.year,
          `"${q.subset}"`,
          `"${JSON.stringify(q.filters)}"`,
          q.timestamp,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_history.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Sorting logic
  const sortedHistory = [...history].sort((a, b) => {
    if (sortOption === "newest") {
      return new Date(b.timestamp) - new Date(a.timestamp);
    }
    if (sortOption === "oldest") {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
    if (sortOption === "survey-az") {
      return (a.survey || "").localeCompare(b.survey || "");
    }
    if (sortOption === "survey-za") {
      return (b.survey || "").localeCompare(a.survey || "");
    }
    return 0;
  });

  // Get unique surveys and years for dropdowns
  const surveyOptions = Array.from(
    new Set(history.map((q) => q.survey).filter(Boolean))
  );
  const yearOptions = Array.from(
    new Set(history.map((q) => q.year).filter(Boolean))
  );

  // Filtering logic (use sortedHistory now)
  const filteredHistory = sortedHistory.filter((item) => {
    let pass = true;
    if (filterSurvey && item.survey !== filterSurvey) pass = false;
    if (filterYear && item.year !== filterYear) pass = false;
    if (filterDate !== "all") {
      const now = new Date();
      const ts = new Date(item.timestamp);
      if (filterDate === "today" && ts.toDateString() !== now.toDateString())
        pass = false;
      if (filterDate === "week" && now - ts > 7 * 24 * 60 * 60 * 1000) pass = false;
      if (filterDate === "month" && now - ts > 30 * 24 * 60 * 60 * 1000)
        pass = false;
    }
    return pass;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Query History</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your previous queries and results
        </p>
      </div>

      {showDeleteSuccess && (
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-2 text-center">
          Query deleted successfully!
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No query history found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-4 mb-4 flex-wrap relative">
              {/* Filter controls */}
              <select
                className="border px-2 py-1 rounded"
                value={filterSurvey}
                onChange={(e) => setFilterSurvey(e.target.value)}
              >
                <option value="">All Surveys</option>
                {surveyOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className="border px-2 py-1 rounded"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                className="border px-2 py-1 rounded"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
              {/* Sorting control */}
              <select
                className="border px-2 py-1 rounded"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                title="Sort queries"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="survey-az">Survey A-Z</option>
                <option value="survey-za">Survey Z-A</option>
              </select>
              <button
                className="absolute right-2 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                onClick={handleDownloadHistory}
                title="Download All History"
              >
                ⬇️ Download All
              </button>
            </div>
            <div className="relative">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 border"></th>
                    <th className="px-4 py-2 border">Survey</th>
                    <th className="px-4 py-2 border">Year</th>
                    <th className="px-4 py-2 border">Subset</th>
                    <th className="px-4 py-2 border">Timestamp</th>
                    <th className="px-2 py-2 border text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, idx) => {
                    const parsed = parseQuery(item);
                    return (
                      <>
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 py-2 border text-center">
                            <button
                              onClick={() =>
                                setExpanded((exp) => ({
                                  ...exp,
                                  [idx]: !exp[idx],
                                }))
                              }
                              aria-label={expanded[idx] ? "Collapse" : "Expand"}
                            >
                              <span className="text-lg">
                                {expanded[idx] ? "▲" : "▼"}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-2 border">{parsed.survey}</td>
                          <td className="px-4 py-2 border">{parsed.year}</td>
                          <td className="px-4 py-2 border">{parsed.subset}</td>
                          <td className="px-4 py-2 border">
                            <LastLoginFormatter lastLogin={item.timestamp} />
                          </td>
                          <td className="px-2 py-2 border text-center">
                            {/* Re-run icon */}
                            <button
                              className="mx-1 text-blue-600 hover:bg-blue-100 hover:bg-opacity-50 transition p-1 rounded"
                              title="Re-run Query"
                              onMouseEnter={(e) =>
                                e.currentTarget.classList.add("ring", "ring-blue-300")
                              }
                              onMouseLeave={(e) =>
                                e.currentTarget.classList.remove("ring", "ring-blue-300")
                              }
                              onClick={() => handleRerun(item)}
                            >
                              <span role="img" aria-label="Re-run">
                                🔄
                              </span>
                            </button>
                            {/* Delete icon */}
                            <button
                              className={`mx-1 text-red-600 hover:bg-red-100 hover:bg-opacity-50 transition p-1 rounded ${
                                deletingIdx === idx
                                  ? "opacity-50 pointer-events-none"
                                  : ""
                              }`}
                              title="Delete Query"
                              onMouseEnter={(e) =>
                                e.currentTarget.classList.add("ring", "ring-red-300")
                              }
                              onMouseLeave={(e) =>
                                e.currentTarget.classList.remove("ring", "ring-red-300")
                              }
                              onClick={() => handleDelete(idx)}
                              disabled={deletingIdx === idx}
                            >
                              <span role="img" aria-label="Delete">
                                🗑️
                              </span>
                            </button>
                          </td>
                        </tr>
                        {expanded[idx] && (
                          <tr>
                            <td colSpan={6} className="bg-gray-50 border-t px-4 py-3">
                              <div>
                                <div className="mb-2 font-semibold">Query Filters:</div>
                                <ul className="list-disc ml-6">
                                  {Object.entries(parsed.filters).map(([k, v]) => (
                                    <li key={k}>
                                      {k}: {v}
                                    </li>
                                  ))}
                                  {Object.entries(parsed.numericFilters).map(([k, conf]) => (
                                    <li key={k}>
                                      {k}: {conf.op}{" "}
                                      {conf.values && conf.values.join(", ")}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryHistory;
