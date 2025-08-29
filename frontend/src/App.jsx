import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import QueryBuilder from './pages/QueryBuilder';
import QueryHistory from './pages/QueryHistory';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout component for authenticated pages
function AuthenticatedLayout({ children, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Layout component for auth pages (login/register)
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {children}
      </div>
    </div>
  );
}

// Public route component (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <AuthLayout>{children}</AuthLayout>;
}

// Main app component with conditional rendering
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public auth routes - no sidebar/navbar, redirect if already logged in */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes - with sidebar/navbar, redirect to login if not authenticated */}
      <Route path="/" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <Dashboard />
        </AuthenticatedLayout>
      } />
      <Route path="/surveys" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <Surveys />
        </AuthenticatedLayout>
      } />
      <Route path="/query/:surveyId?" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <QueryBuilder />
        </AuthenticatedLayout>
      } />
      <Route path="/history" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <QueryHistory />
        </AuthenticatedLayout>
      } />
      <Route path="/profile" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <Profile />
        </AuthenticatedLayout>
      } />
      <Route path="/admin" element={
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <AdminDashboard />
        </AuthenticatedLayout>
      } />
      <Route path="/dashboard" element={
        <AuthenticatedLayout>
          <Dashboard />
        </AuthenticatedLayout>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
