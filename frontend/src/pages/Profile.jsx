function Profile() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Management Coming Soon</h3>
          <p className="text-gray-500">
            This page will allow you to update your profile, manage API keys, and view usage statistics.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
