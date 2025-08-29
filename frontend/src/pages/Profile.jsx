import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LastLoginFormatter from "../components/LastLoginFormatter";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SUPABASE_URL = "https://odaheneiylpxohcnoptl.supabase.co/rest/v1";
const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY;

function Profile() {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(user?.user_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [lastLogin, setLastLogin] = useState(user?.last_login || "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recentQueries, setRecentQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  // Fetch latest user info and recent queries
  useEffect(() => {
    if (!user?.id) return;
    setUsername(user.user_name || "");
    setEmail(user.email || "");
    setLastLogin(user.last_login || "");
    // Fetch recent queries from Supabase
    axios
      .get(`${SUPABASE_URL}/users?id=eq.${user.id}&select=query_history,last_login`, {
        headers: {
          apikey: SUPABASE_API_KEY,
          Authorization: SUPABASE_API_KEY,
        },
      })
      .then((res) => {
        const u = res.data[0];
        setLastLogin(u?.last_login);
        const history = u?.query_history || [];
        // Skip first entry if it only contains user id
        const filteredHistory = history.length && history[0]?.user ? history.slice(1) : history;
        setRecentQueries(filteredHistory.slice(-5).reverse());
      });
  }, [user]);

  // Edit profile handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // Update user_name
      await axios.patch(
        `${SUPABASE_URL}/users?id=eq.${user.id}`,
        { user_name: username },
        {
          headers: {
            apikey: SUPABASE_API_KEY,
            Authorization: SUPABASE_API_KEY,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        }
      );
      // After successful username update, update user context correctly:
      setUser({ ...user, user_name: username });
      localStorage.setItem('user', JSON.stringify({ ...user, user_name: username }));
      setSuccessMsg("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      setErrorMsg("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    if (!password || !newPassword || newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match or are empty.");
      setLoading(false);
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          email: user.email,
          currentPassword: password,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      setSuccessMsg("Password changed successfully!");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg("Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await axios.delete(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setSuccessMsg("Account deleted. Redirecting...");
      setTimeout(() => {
        localStorage.removeItem("authToken");
        navigate("/login");
      }, 1500);
    } catch (err) {
      setErrorMsg("Failed to delete account.");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Download query history as CSV
  const handleDownloadData = () => {
    if (!recentQueries.length) return;
    const csvRows = [
      "Survey,Year,Subset,Filters,Timestamp",
      ...recentQueries.map((q) =>
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

  return (
    <div className="max-w-3xl space-y-8 py-2">
      {/* Profile Card */}
      <div className="card flex items-center gap-4 p-6">
        <div className="flex-shrink-0">
          <div className="bg-primary-600 text-white rounded-full h-16 w-16 flex items-center justify-center text-3xl font-bold">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
        <div>
          <div className="text-xl font-semibold text-gray-900">{user?.user_name || "-"}</div>
          <div className="text-sm text-gray-500">{user?.email || "-"}</div>
          <div className="text-xs text-gray-400 mt-1">
            Last login: <LastLoginFormatter lastLogin={lastLogin} />
          </div>
        </div>
        <div className="ml-auto flex flex-col gap-2">
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
            onClick={() => setEditMode(true)}
          >
            Edit Profile
          </button>
          <button
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Download My Data Button
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
          onClick={handleDownloadData}
        >
          Download My Data
        </button>
      </div> */}

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-center">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded text-center">
          {errorMsg}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                disabled={loading}
              >
                Save Changes
              </button>
              <button
                type="button"
                className="w-full py-2 mt-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
            </form>
            <hr className="my-6" />
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                disabled={loading}
              >
                Change Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 text-red-700">Delete Account</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card relative">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <button
          className="absolute top-4 right-4 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
          onClick={handleDownloadData}
        >
          Download My Data
        </button>
        <ul className="divide-y divide-gray-200 mt-8">
          {recentQueries.length === 0 ? (
            <li className="py-4 text-gray-500 text-center">No recent queries found.</li>
          ) : (
            recentQueries.map((q, idx) => (
              <li key={idx} className="py-4 flex flex-col">
                <span className="font-semibold text-gray-900">{q.survey} ({q.year})</span>
                <span className="text-sm text-gray-500">{q.subset}</span>
                <span className="text-xs text-gray-400">
                  <LastLoginFormatter lastLogin={q.timestamp} />
                </span>
                <span className="text-xs text-gray-600 mt-1">
                  Filters: {Object.keys(q.filters?.textFilters || {}).length === 0 && Object.keys(q.filters?.numericFilters || {}).length === 0
                    ? "None"
                    : [
                        ...Object.entries(q.filters?.textFilters || {}).map(([k, v]) => `${k}: ${v}`),
                        ...Object.entries(q.filters?.numericFilters || {}).map(([k, conf]) => `${k}: ${conf.op} ${conf.values?.join(", ")}`)
                      ].join("; ")
                  }
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default Profile;
