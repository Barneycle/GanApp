import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminService } from '../../services/adminService';
import { SystemSettingsService } from '../../services/systemSettingsService';
import { DatabaseMaintenanceService } from '../../services/databaseMaintenanceService';
import { OrganizationService } from '../../services/organizationService';
import { Eye, EyeOff, Send, Trash2, AlertCircle, CheckCircle, XCircle, Info, Database, Activity, Shield, Search, ChevronDown } from 'lucide-react';
import { useToast } from '../../components/Toast';

export const Admin = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to check if user profile is complete
  const isProfileComplete = (user) => {
    if (!user) return false;
    const firstName = user.first_name;
    const lastName = user.last_name;
    const affiliatedOrg = user.affiliated_organization;
    
    const hasFirstName = firstName !== undefined && firstName !== null && String(firstName).trim() !== '';
    const hasLastName = lastName !== undefined && lastName !== null && String(lastName).trim() !== '';
    const hasAffiliatedOrg = affiliatedOrg !== undefined && affiliatedOrg !== null && String(affiliatedOrg).trim() !== '';
    
    return hasFirstName && hasLastName && hasAffiliatedOrg;
  };

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      return;
    }

    // Check if profile is complete
    if (!isProfileComplete(currentUser)) {
      navigate('/setup-profile');
      return;
    }
  }, [isAdmin, isAuthenticated, authLoading, currentUser, navigate]);

  if (authLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-600">You need admin privileges to access this page.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[95%] xl:max-w-[98%] mx-auto">

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-6">
          <div className="flex flex-nowrap border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'archived'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Archived Accounts
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'events'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Event Management
            </button>
            <button
              onClick={() => setActiveTab('cancellations')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'cancellations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Cancellation Requests
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Analytics & Reports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              System Settings
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Notification Management
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'database'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Database Maintenance
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'archived' && <ArchivedUsersTab />}
            {activeTab === 'events' && <EventsTab />}
            {activeTab === 'cancellations' && <CancellationsTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'database' && <DatabaseMaintenanceTab />}
          </div>
        </div>
      </div>
    </section>
  );
};

// Dashboard Tab Component
const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    setWarning('');
    const result = await AdminService.getDashboardStats();
    if (result.error) {
      setError(result.error);
    } else {
      setStats(result.stats || null);
      if (result.warning) {
        setWarning(result.warning);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading dashboard statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Overview</h2>
      {warning && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
          {warning}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Stats */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Users</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Users:</span>
              <span className="font-bold text-slate-800">{stats?.total_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Active Users:</span>
              <span className="font-bold text-green-600">{stats?.active_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Banned Users:</span>
              <span className="font-bold text-red-600">{stats?.banned_users || 0}</span>
            </div>
          </div>
        </div>

        {/* Events Stats */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Events</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Events:</span>
              <span className="font-bold text-slate-800">{stats?.total_events || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Published:</span>
              <span className="font-bold text-green-600">{stats?.published_events || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cancelled:</span>
              <span className="font-bold text-red-600">{stats?.cancelled_events || 0}</span>
            </div>
          </div>
        </div>

        {/* Other Stats */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Activity</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Registrations:</span>
              <span className="font-bold text-slate-800">{stats?.total_registrations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Certificates:</span>
              <span className="font-bold text-slate-800">{stats?.total_certificates || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pending Cancellations:</span>
              <span className="font-bold text-orange-600">{stats?.pending_cancellations || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    setWarning('');
    const result = await AdminService.getAllUsers();
    if (result.error) {
      setError(result.error);
    } else {
      setUsers(result.users || []);
      if (result.warning) {
        setWarning(result.warning);
      }
    }
    setLoading(false);
  };

  const handleBanUser = async (userId, durationValue, durationUnit) => {
    setActionLoading(true);
    const banUntil = new Date();
    const amount = Number(durationValue);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please provide a valid duration to ban the user.');
      setActionLoading(false);
      return;
    }

    switch (durationUnit) {
      case 'minutes':
        banUntil.setMinutes(banUntil.getMinutes() + amount);
        break;
      case 'hours':
        banUntil.setHours(banUntil.getHours() + amount);
        break;
      case 'days':
        banUntil.setDate(banUntil.getDate() + amount);
        break;
      case 'months':
        banUntil.setMonth(banUntil.getMonth() + amount);
        break;
      case 'years':
        banUntil.setFullYear(banUntil.getFullYear() + amount);
        break;
      default:
        banUntil.setDate(banUntil.getDate() + amount);
    }

    const result = await AdminService.banUser(userId, banUntil);
    if (result.error) {
      setError(result.error);
    } else {
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const handleUnbanUser = async (userId) => {
    setActionLoading(true);
    const result = await AdminService.unbanUser(userId);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('User unbanned successfully');
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const handleUnarchiveUser = async (userId) => {
    setActionLoading(true);
    const result = await AdminService.unarchiveUser(userId);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('User unarchived successfully');
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const handleChangeRole = async (userId, newRole) => {
    setActionLoading(true);
    const result = await AdminService.changeUserRole(userId, newRole);
    if (result.error) {
      setError(result.error);
    } else {
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const handleArchiveUser = async (userId, reason) => {
    setActionLoading(true);
    const result = await AdminService.archiveUser(userId, reason);
    if (result.error) {
      setError(result.error);
    } else {
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const normalizeString = (value) => (value || '').toString().toLowerCase().trim();

  // Filter out only archived users (not banned users)
  // Banned users should still appear in the list, only archived users should be filtered out
  const activeUsers = users.filter((user) => {
    // Check if user is archived
    // Archived users have archived = true in the user data
    // Banned users should NOT be filtered out - they should still appear in the list
    // A user is archived if archived === true (from metadata)
    const isArchived = user.archived === true;
    return !isArchived; // Only show users that are NOT archived
  });

  const filteredUsers = activeUsers.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      normalizeString(user.first_name).includes(term) ||
      normalizeString(user.last_name).includes(term) ||
      normalizeString(`${user.first_name} ${user.last_name}`).includes(term) ||
      normalizeString(user.email).includes(term) ||
      normalizeString(user.role).includes(term)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortKey];
    let bValue = b[sortKey];

    if (sortKey === 'name') {
      aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
    }

    if (sortKey === 'status') {
      const getStatus = (user) => {
        if (user.banned_until && new Date(user.banned_until) > new Date()) return 'banned';
        if (user.is_active === false) return 'inactive';
        return 'active';
      };
      aValue = getStatus(a);
      bValue = getStatus(b);
    }

    if (sortKey === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading users...</p>
      </div>
    );
  }

  const handleCreateUser = async (email, password, confirmPassword, role) => {
    setActionLoading(true);
    setError('');
    const result = await AdminService.createUser(email, password, confirmPassword, role);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      // Success - close modal, refresh users list, and show toast
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
      toast.success(`User account created successfully for ${email}`);
    }
    setActionLoading(false);
  };

  const handleUpdateUser = async (userId, updates) => {
    setActionLoading(true);
    setError('');
    const result = await AdminService.updateUser(userId, updates);
    if (result.error) {
      setError(result.error);
    } else {
      await loadUsers();
      setSelectedUser(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">User Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedUser(null);
              setActionType('create');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Create User
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {warning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
          {warning}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search Users</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or role"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
          <div className="flex space-x-3">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Created Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => toggleSort(sortKey)}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                  Name
                  {sortKey === 'name' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('email')} className="flex items-center gap-1">
                  Email
                  {sortKey === 'email' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('role')} className="flex items-center gap-1">
                  Role
                  {sortKey === 'role' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                  Status
                  {sortKey === 'status' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                  Created
                  {sortKey === 'created_at' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const isBanned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
              const isArchived = user.archived === true || user.user_metadata?.archived === true;
              const showUnban = isBanned && !isArchived; // Only show unban for banned users, not archived users
              const showUnarchive = isArchived; // Show unarchive for archived users

              return (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'organizer' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isArchived ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Archived
                    </span>
                  ) : user.banned_until && new Date(user.banned_until) > new Date() ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Banned
                    </span>
                  ) : user.is_active === false ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Inactive
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setActionType('edit');
                      }}
                      className="px-3 py-1 bg-blue-900 text-white rounded hover:bg-blue-800 text-xs"
                      disabled={actionLoading}
                    >
                      Edit
                    </button>
                    {showUnarchive ? (
                      <button
                        onClick={() => handleUnarchiveUser(user.id)}
                        className="px-3 py-1 bg-blue-900 hover:bg-blue-800 rounded text-xs text-white"
                        disabled={actionLoading}
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (showUnban) {
                            handleUnbanUser(user.id);
                          } else {
                            setSelectedUser(user);
                            setActionType('ban');
                          }
                        }}
                        className={`px-3 py-1 rounded text-xs ${showUnban ? 'bg-blue-900 hover:bg-blue-800' : 'bg-red-600 hover:bg-red-700'} text-white`}
                        disabled={actionLoading}
                      >
                        {showUnban ? 'Unban' : 'Ban'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setActionType('role');
                      }}
                      className="px-3 py-1 bg-blue-900 text-white rounded hover:bg-blue-800 text-xs"
                      disabled={actionLoading || showUnarchive}
                    >
                      Change Role
                    </button>
                    {!showUnarchive && (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setActionType('archive');
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                        disabled={actionLoading}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Modals */}
      {selectedUser && actionType === 'ban' && (
        <BanUserModal
          user={selectedUser}
          onBan={(value, unit) => handleBanUser(selectedUser.id, value, unit)}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {selectedUser && actionType === 'role' && (
        <ChangeRoleModal
          user={selectedUser}
          onChangeRole={(newRole) => handleChangeRole(selectedUser.id, newRole)}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {selectedUser && actionType === 'archive' && (
        <ArchiveUserModal
          user={selectedUser}
          onArchive={(reason) => handleArchiveUser(selectedUser.id, reason)}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {selectedUser && actionType === 'edit' && (
        <EditUserModal
          user={selectedUser}
          onUpdate={(updates) => handleUpdateUser(selectedUser.id, updates)}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {actionType === 'create' && (
        <CreateUserModal
          onCreate={(email, password, confirmPassword, role) => handleCreateUser(email, password, confirmPassword, role)}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

// Archived Users Tab Component
const ArchivedUsersTab = () => {
  const toast = useToast();
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('archived_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [actionLoading, setActionLoading] = useState(false);
  const [unarchivingUserId, setUnarchivingUserId] = useState(null);

  useEffect(() => {
    loadArchivedUsers();
  }, []);

  const loadArchivedUsers = async () => {
    setLoading(true);
    setError('');
    const result = await AdminService.getArchivedUsers();
    if (result.error) {
      setError(result.error);
    } else {
      setArchivedUsers(result.users || []);
    }
    setLoading(false);
  };

  const normalizeString = (value) => (value || '').toString().toLowerCase().trim();

  const filteredUsers = archivedUsers.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      normalizeString(user.first_name).includes(term) ||
      normalizeString(user.last_name).includes(term) ||
      normalizeString(`${user.first_name} ${user.last_name}`).includes(term) ||
      normalizeString(user.email).includes(term) ||
      normalizeString(user.role).includes(term) ||
      normalizeString(user.archive_reason).includes(term)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortKey];
    let bValue = b[sortKey];

    if (sortKey === 'name') {
      aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
    }

    if (sortKey === 'archived_at' || sortKey === 'original_created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'archived_at' ? 'desc' : 'asc');
    }
  };

  const handleUnarchiveUser = async (userId) => {
    setActionLoading(true);
    setUnarchivingUserId(userId);
    setError('');
    
    const result = await AdminService.unarchiveUser(userId);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('User unarchived successfully');
      await loadArchivedUsers();
    }
    
    setActionLoading(false);
    setUnarchivingUserId(null);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading archived users...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Archived Accounts</h2>
        <button
          onClick={loadArchivedUsers}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search archived users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {sortedUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">No archived users found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-slate-50">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase cursor-pointer hover:bg-slate-100"
                >
                  Name {sortKey === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Role</th>
                <th
                  onClick={() => toggleSort('archived_at')}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase cursor-pointer hover:bg-slate-100"
                >
                  Archived Date {sortKey === 'archived_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Archive Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Archive Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Activities</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'organizer' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(user.archived_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={user.archive_reason}>
                    {user.archive_reason}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {user.archive_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="space-y-1">
                      <div>Events: {user.total_events_created || 0}</div>
                      <div>Registrations: {user.total_events_attended || 0}</div>
                      <div>Surveys: {user.total_surveys_created || 0}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleUnarchiveUser(user.original_user_id)}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-blue-900 text-white rounded hover:bg-blue-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Restore this user account"
                    >
                      {unarchivingUserId === user.original_user_id && actionLoading ? 'Unarchiving...' : 'Unarchive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Ban User Modal
const BanUserModal = ({ user, onBan, onClose, loading }) => {
  const [durationValue, setDurationValue] = useState(7);
  const [durationUnit, setDurationUnit] = useState('days');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Ban User</h3>
        <p className="text-slate-600 mb-4">
          Ban {user.first_name} {user.last_name} ({user.email})
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Ban Duration</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="1"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Amount"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onBan(durationValue, durationUnit)}
            disabled={loading || !durationValue}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Banning...' : 'Ban User'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Change Role Modal
const ChangeRoleModal = ({ user, onChangeRole, onClose, loading }) => {
  const [newRole, setNewRole] = useState(user.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Change Role</h3>
        <p className="text-slate-600 mb-4">
          Change role for {user.first_name} {user.last_name} ({user.email})
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">New Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="participant">Participant</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onChangeRole(newRole)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Role'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Archive User Modal
const ArchiveUserModal = ({ user, onArchive, onClose, loading }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Archive User</h3>
        <p className="text-slate-600 mb-4">
          Archive {user.first_name} {user.last_name} ({user.email})
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Archive Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reason for archiving..."
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onArchive(reason)}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Archiving...' : 'Archive User'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit User Modal
const EditUserModal = ({ user, onUpdate, onClose, loading }) => {
  const [formData, setFormData] = useState({
    prefix: user.prefix || '',
    first_name: user.first_name || '',
    middle_initial: user.middle_initial || '',
    last_name: user.last_name || '',
    affix: user.affix || '',
    affiliated_organization: user.affiliated_organization || user.organization || '',
    role: user.role || 'participant'
  });
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [showCustomOrgInput, setShowCustomOrgInput] = useState(false);
  const [customOrgName, setCustomOrgName] = useState('');
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const orgDropdownRef = useRef(null);
  const orgInputRef = useRef(null);

  // Load organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      setLoadingOrganizations(true);
      const result = await OrganizationService.getOrganizationsGrouped();
      if (result.error) {
        console.error('Error loading organizations:', result.error);
      } else {
        setOrganizations(result.groups || []);
      }
      setLoadingOrganizations(false);
    };
    loadOrganizations();
  }, []);

  // Initialize organization state based on user's current org
  useEffect(() => {
    if (user.affiliated_organization && organizations.length > 0) {
      const orgExists = organizations.some(group => 
        group.organizations.some(org => org.name === user.affiliated_organization)
      );
      
      if (!orgExists) {
        setShowCustomOrgInput(true);
        setCustomOrgName(user.affiliated_organization);
      } else {
        setOrgSearchQuery(user.affiliated_organization);
      }
    }
  }, [user.affiliated_organization, organizations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target) && 
          orgInputRef.current && !orgInputRef.current.contains(event.target)) {
        setShowOrgDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrgSearchChange = (e) => {
    const value = e.target.value;
    setOrgSearchQuery(value);
    setShowOrgDropdown(true);
  };

  const handleSelectOrganization = (orgName) => {
    if (orgName === '__OTHER__') {
      setShowCustomOrgInput(true);
      setOrgSearchQuery('');
      setFormData(prev => ({
        ...prev,
        affiliated_organization: ''
      }));
      setShowOrgDropdown(false);
    } else {
      setOrgSearchQuery(orgName);
      setFormData(prev => ({
        ...prev,
        affiliated_organization: orgName
      }));
      setShowCustomOrgInput(false);
      setCustomOrgName('');
      setShowOrgDropdown(false);
    }
  };

  const handleCustomOrgChange = (e) => {
    const value = e.target.value;
    setCustomOrgName(value);
    setFormData(prev => ({
      ...prev,
      affiliated_organization: value
    }));
  };

  // Filter organizations based on search query
  const getFilteredOrganizations = () => {
    if (!orgSearchQuery.trim()) {
      return organizations;
    }

    const query = orgSearchQuery.toLowerCase();
    return organizations
      .map(group => ({
        ...group,
        organizations: group.organizations.filter(org =>
          org.name.toLowerCase().includes(query) ||
          group.category.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.organizations.length > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure organization name is set correctly
    let orgName = showCustomOrgInput 
      ? customOrgName.trim() 
      : (formData.affiliated_organization.trim() || orgSearchQuery.trim());
    
    // If custom org and it doesn't exist, create it
    if (showCustomOrgInput && orgName) {
      try {
        const orgResult = await OrganizationService.createCustomOrganization(orgName, user.id);
        if (orgResult.error) {
          console.error('Error creating organization:', orgResult.error);
          // Continue anyway with the custom name
        } else {
          orgName = orgResult.organization?.name || orgName;
        }
      } catch (error) {
        console.error('Error creating organization:', error);
        // Continue anyway with the custom name
      }
    }
    
    onUpdate({
      ...formData,
      affiliated_organization: orgName
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit User</h3>
        <p className="text-slate-600 mb-4">
          Editing: {user.email} (Email cannot be changed)
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Prefix */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prefix (optional)</label>
              <select
                name="prefix"
                value={formData.prefix}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Middle Initial */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Middle Initial (optional)</label>
              <input
                type="text"
                name="middle_initial"
                value={formData.middle_initial}
                onChange={handleChange}
                maxLength={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="M."
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Affix */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Affix (optional)</label>
              <select
                name="affix"
                value={formData.affix}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            {/* Affiliated Organization */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Affiliated Organization</label>
              {loadingOrganizations ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600">
                  Loading organizations...
                </div>
              ) : (
                <>
                  {!showCustomOrgInput ? (
                    <div className="relative" ref={orgDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          ref={orgInputRef}
                          type="text"
                          name="affiliated_organization"
                          value={showOrgDropdown ? orgSearchQuery : (formData.affiliated_organization || orgSearchQuery)}
                          onChange={handleOrgSearchChange}
                          onFocus={() => {
                            setShowOrgDropdown(true);
                            if (formData.affiliated_organization && !orgSearchQuery) {
                              setOrgSearchQuery(formData.affiliated_organization);
                            }
                          }}
                          className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Type to search organizations..."
                          required
                          disabled={loading}
                          autoComplete="off"
                        />
                        <ChevronDown 
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${showOrgDropdown ? 'rotate-180' : ''}`}
                        />
                      </div>
                      
                      {/* Dropdown List */}
                      {showOrgDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                          {getFilteredOrganizations().length > 0 ? (
                            <>
                              {getFilteredOrganizations().map((group) => (
                                <div key={group.category}>
                                  <div className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold text-xs sticky top-0">
                                    {group.category}
                                  </div>
                                  {group.organizations.map((org) => (
                                    <button
                                      key={org.id}
                                      type="button"
                                      onClick={() => handleSelectOrganization(org.name)}
                                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-900 transition-colors text-sm"
                                    >
                                      {org.name}
                                    </button>
                                  ))}
                                </div>
                              ))}
                              <div className="border-t border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleSelectOrganization('__OTHER__')}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-blue-600 font-medium transition-colors text-sm"
                                >
                                  Other (specify below)
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="px-3 py-2 text-slate-500 text-center text-sm">
                              No organizations found. 
                              <button
                                type="button"
                                onClick={() => handleSelectOrganization('__OTHER__')}
                                className="ml-1 text-blue-600 hover:text-blue-800 underline"
                              >
                                Add custom organization
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="custom_organization"
                        value={customOrgName}
                        onChange={handleCustomOrgChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your organization name"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomOrgInput(false);
                          setCustomOrgName('');
                          setOrgSearchQuery('');
                          setFormData(prev => ({
                            ...prev,
                            affiliated_organization: ''
                          }));
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        disabled={loading}
                      >
                        Select from list instead
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create User Modal
const CreateUserModal = ({ onCreate, onClose, loading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant'
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    onCreate(formData.email, formData.password, formData.confirmPassword, formData.role);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New User</h3>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                placeholder="user@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Re-enter password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Events Tab Component
const EventsTab = () => {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [activeView, setActiveView] = useState('active'); // 'active' or 'archived'
  const [loading, setLoading] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    loadEvents();
    loadArchivedEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    const result = await AdminService.getAllEvents();
    if (result.error) {
      setError(result.error);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(result.events || []);

    setLoading(false);
  };

  const loadArchivedEvents = async () => {
    setArchivedLoading(true);
    const result = await AdminService.getArchivedEvents();
    if (result.error) {
      console.error('Error loading archived events:', result.error);
      setArchivedEvents([]);
    } else {
      setArchivedEvents(result.events || []);
    }
    setArchivedLoading(false);
  };

  const handleArchiveEvent = async (eventId, reason) => {
    setActionLoading(true);
    setError('');
    const result = await AdminService.archiveEvent(eventId, reason);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Event archived successfully');
      await loadEvents();
      await loadArchivedEvents(); // Reload archived events after archiving
      setSelectedEvent(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const handleUnarchiveEvent = async (archiveId, reason) => {
    setActionLoading(true);
    setError('');
    const result = await AdminService.unarchiveEvent(archiveId, reason);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Event unarchived successfully');
      await loadEvents();
      await loadArchivedEvents(); // Reload archived events after unarchiving
      setSelectedEvent(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const currentEvents = activeView === 'archived' ? archivedEvents : events;
  const isLoading = activeView === 'archived' ? archivedLoading : loading;

  const filteredEvents = currentEvents.filter((event) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (event.title || '').toLowerCase().includes(term) ||
      (event.venue || '').toLowerCase().includes(term) ||
      (event.status || '').toLowerCase().includes(term)
    );
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let aValue;
    let bValue;

    switch (sortKey) {
      case 'title':
        aValue = (a.title || '').toLowerCase();
        bValue = (b.title || '').toLowerCase();
        break;
      case 'venue':
        aValue = (a.venue || '').toLowerCase();
        bValue = (b.venue || '').toLowerCase();
        break;
      case 'participants':
        aValue = a.current_participants || 0;
        bValue = b.current_participants || 0;
        break;
      case 'status':
        aValue = (a.status || '').toLowerCase();
        bValue = (b.status || '').toLowerCase();
        break;
      case 'date':
      default:
        aValue = new Date(a.start_date).getTime();
        bValue = new Date(b.start_date).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
  };

  if (isLoading && currentEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading {activeView === 'archived' ? 'archived ' : ''}events...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Event Management</h2>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'active'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Active Events
            </button>
            <button
              onClick={() => setActiveView('archived')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'archived'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Archived Events
            </button>
          </div>
          <button
            onClick={activeView === 'archived' ? loadArchivedEvents : loadEvents}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search Events</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, venue, or status"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
          <div className="flex space-x-3">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Start Date</option>
              <option value="title">Title</option>
              <option value="venue">Venue</option>
              <option value="status">Status</option>
              <option value="participants">Participants</option>
            </select>
            <button
              onClick={() => toggleSort(sortKey)}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('title')} className="flex items-center gap-1">
                  Title
                  {sortKey === 'title' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('venue')} className="flex items-center gap-1">
                  Venue
                  {sortKey === 'venue' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('date')} className="flex items-center gap-1">
                  Date
                  {sortKey === 'date' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('participants')} className="flex items-center gap-1">
                  Participants
                  {sortKey === 'participants' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                  Status
                  {sortKey === 'status' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
              {activeView === 'archived' && (
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort('archived_at')} className="flex items-center gap-1">
                    Archive Reason
                    {sortKey === 'archived_at' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              )}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((event) => (
              <tr key={event.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{event.title}</td>
                <td className="px-4 py-3">{event.venue}</td>
                <td className="px-4 py-3">
                  {new Date(event.start_date).toLocaleDateString()}
                  {event.is_archived && event.archived_at && (
                    <div className="text-xs text-slate-500 mt-1">
                      Archived: {new Date(event.archived_at).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {event.current_participants} / {event.max_participants || '∞'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'published' ? 'bg-green-100 text-green-800' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                  {event.is_archived && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                      Archived
                    </span>
                  )}
                </td>
                {activeView === 'archived' && (
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600 max-w-xs" title={event.archive_reason || 'No reason provided'}>
                      {event.archive_reason ? (
                        event.archive_reason.length > 50 ? (
                          <span>{event.archive_reason.substring(0, 50)}...</span>
                        ) : (
                          <span>{event.archive_reason}</span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">No reason provided</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex space-x-2 flex-wrap gap-2">
                    {!event.is_archived && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setActionType('stats');
                          }}
                          className="px-3 py-1 bg-blue-900 text-white rounded hover:bg-blue-800 text-xs"
                        >
                          View Stats
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setActionType('archive');
                          }}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                          title="Archive this event"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    {event.is_archived && (
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setActionType('unarchive');
                        }}
                        className="px-3 py-1 bg-blue-900 text-white rounded hover:bg-blue-800 text-xs"
                        title="Restore this event"
                        disabled={actionLoading}
                      >
                        Unarchive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Modals */}
      {selectedEvent && actionType === 'archive' && (
        <ArchiveEventModal
          event={selectedEvent}
          onArchive={(reason) => handleArchiveEvent(selectedEvent.id, reason)}
          onClose={() => {
            setSelectedEvent(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {selectedEvent && actionType === 'unarchive' && (
        <UnarchiveEventModal
          event={selectedEvent}
          onUnarchive={(reason) => handleUnarchiveEvent(selectedEvent.archive_id || selectedEvent.id, reason)}
          onClose={() => {
            setSelectedEvent(null);
            setActionType(null);
          }}
          loading={actionLoading}
        />
      )}

      {selectedEvent && actionType === 'stats' && (
        <EventStatsModal
          event={selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            setActionType(null);
          }}
        />
      )}
    </div>
  );
};

// Archive Event Modal
const ArchiveEventModal = ({ event, onArchive, onClose, loading }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Archive Event</h3>
        <p className="text-slate-600 mb-4">
          Archive "{event.title}"?
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Archive Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reason for archiving..."
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onArchive(reason)}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Archiving...' : 'Archive Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Unarchive Event Modal
const UnarchiveEventModal = ({ event, onUnarchive, onClose, loading }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Unarchive Event</h3>
        <p className="text-slate-600 mb-4">
          Restore "{event.title}" back to active events?
        </p>
        {event.archive_reason && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-600 mb-1">Original Archive Reason:</p>
            <p className="text-sm text-slate-700">{event.archive_reason}</p>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Unarchive Reason (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reason for unarchiving (optional)..."
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onUnarchive(reason)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Unarchiving...' : 'Unarchive Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Event Stats Modal
const EventStatsModal = ({ event, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const result = await AdminService.getEventStatistics(event.id);
    if (result.stats) {
      setStats(result.stats);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Event Statistics</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Registrations</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total_registrations}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Attendance</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_attendance}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.attendance_rate}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Certificates</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_certificates}</p>
              </div>
            </div>
          </div>
        ) : null}
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Cancellations Tab Component
const CancellationsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('requested_at');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    const result = await AdminService.getCancellationRequests();
    if (result.error) {
      setError(result.error);
    } else {
      setRequests(result.requests || []);
    }
    setLoading(false);
  };

  const handleReview = async (requestId, status, notes) => {
    setActionLoading(true);
    const result = await AdminService.reviewCancellationRequest(requestId, status, notes);
    if (result.error) {
      setError(result.error);
    } else {
      await loadRequests();
      setSelectedRequest(null);
    }
    setActionLoading(false);
  };

  const filteredRequests = requests.filter((request) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (request.event_title || '').toLowerCase().includes(term) ||
      (request.request_reason || '').toLowerCase().includes(term) ||
      (request.requester_name || request.requested_by || '').toLowerCase().includes(term)
    );
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue;
    let bValue;

    switch (sortKey) {
      case 'event_title':
        aValue = (a.event_title || '').toLowerCase();
        bValue = (b.event_title || '').toLowerCase();
        break;
      case 'requester':
        aValue = (a.requester_name || a.requested_by || '').toLowerCase();
        bValue = (b.requester_name || b.requested_by || '').toLowerCase();
        break;
      case 'status':
        aValue = (a.status || '').toLowerCase();
        bValue = (b.status || '').toLowerCase();
        break;
      case 'requested_at':
      default:
        aValue = new Date(a.requested_at).getTime();
        bValue = new Date(b.requested_at).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'requested_at' ? 'desc' : 'asc');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading cancellation requests...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Cancellation Requests</h2>
          <p className="text-sm text-slate-600 mt-1">Review and approve or decline event cancellation requests (Admin only)</p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search Requests</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event, requester, or reason"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
          <div className="flex space-x-3">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="requested_at">Requested Date</option>
              <option value="event_title">Event Title</option>
              <option value="requester">Requester</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => toggleSort(sortKey)}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      {sortedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-600">No pending cancellation requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{request.event_title}</h3>
                  <p className="text-sm text-slate-600">Requested on {new Date(request.requested_at).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                  Pending
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                <p className="text-slate-600">{request.request_reason}</p>
              </div>
              {request.additional_notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Additional Notes:</p>
                  <p className="text-slate-600">{request.additional_notes}</p>
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                  }}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                >
                  Review Request
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <ReviewCancellationModal
          request={selectedRequest}
          onApprove={(notes) => handleReview(selectedRequest.id, 'approved', notes)}
          onDecline={(notes) => handleReview(selectedRequest.id, 'declined', notes)}
          onClose={() => setSelectedRequest(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

// Review Cancellation Modal
const ReviewCancellationModal = ({ request, onApprove, onDecline, onClose, loading }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Review Cancellation Request</h3>
        <p className="text-xs text-slate-500 mb-4">Only administrators can approve or decline cancellation requests</p>
        <div className="mb-4">
          <p className="text-slate-600 mb-2"><strong>Event:</strong> {request.event_title}</p>
          <p className="text-slate-600 mb-2"><strong>Reason:</strong> {request.request_reason}</p>
          {request.additional_notes && (
            <p className="text-slate-600 mb-2"><strong>Notes:</strong> {request.additional_notes}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Review Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Add review notes..."
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onDecline(notes)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Decline'}
          </button>
          <button
            onClick={() => onApprove(notes)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    const result = await AdminService.getDashboardStats();
    if (result.error) {
      setError(result.error);
    } else {
      setStats(result.stats || null);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    if (!stats) return;
    
    setExportLoading(true);
    try {
      const csvRows = [];
      csvRows.push(['Metric', 'Value']);
      csvRows.push(['Total Users', stats.total_users || 0]);
      csvRows.push(['Active Users', stats.active_users || 0]);
      csvRows.push(['Banned Users', stats.banned_users || 0]);
      csvRows.push(['Total Events', stats.total_events || 0]);
      csvRows.push(['Published Events', stats.published_events || 0]);
      csvRows.push(['Cancelled Events', stats.cancelled_events || 0]);
      csvRows.push(['Total Registrations', stats.total_registrations || 0]);
      csvRows.push(['Total Certificates', stats.total_certificates || 0]);
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Analytics & Reports</h2>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={exportToCSV}
            disabled={exportLoading}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{exportLoading ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-blue-900">{stats.total_users || 0}</p>
              <p className="text-xs text-blue-700 mt-1">
                {stats.active_users || 0} active, {stats.banned_users || 0} banned
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <h3 className="text-sm font-medium text-green-800 mb-2">Total Events</h3>
              <p className="text-3xl font-bold text-green-900">{stats.total_events || 0}</p>
              <p className="text-xs text-green-700 mt-1">
                {stats.published_events || 0} published, {stats.cancelled_events || 0} cancelled
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <h3 className="text-sm font-medium text-purple-800 mb-2">Registrations</h3>
              <p className="text-3xl font-bold text-purple-900">{stats.total_registrations || 0}</p>
              <p className="text-xs text-purple-700 mt-1">Total event registrations</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <h3 className="text-sm font-medium text-orange-800 mb-2">Certificates</h3>
              <p className="text-3xl font-bold text-orange-900">{stats.total_certificates || 0}</p>
              <p className="text-xs text-orange-700 mt-1">Certificates generated</p>
            </div>
          </div>

          {/* User Growth Chart (Simple Bar Representation) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">User Statistics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Active Users</span>
                  <span>{stats.active_users || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.total_users > 0 ? ((stats.active_users || 0) / stats.total_users) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Banned Users</span>
                  <span>{stats.banned_users || 0}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${stats.total_users > 0 ? ((stats.banned_users || 0) / stats.total_users) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Statistics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Event Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Published Events</p>
                <p className="text-2xl font-bold text-blue-900">{stats.published_events || 0}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700 mb-1">Cancelled Events</p>
                <p className="text-2xl font-bold text-red-900">{stats.cancelled_events || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Total Registrations</p>
                <p className="text-2xl font-bold text-green-900">{stats.total_registrations || 0}</p>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-700">Pending Cancellation Requests</span>
                <span className="font-semibold text-orange-600">{stats.pending_cancellations || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-700">Total Certificates Generated</span>
                <span className="font-semibold text-purple-600">{stats.total_certificates || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    registration_enabled: true,
    event_creation_enabled: true,
    survey_creation_enabled: true,
    email_notifications_enabled: true,
    max_events_per_user: 10,
    max_participants_per_event: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const { settings: loadedSettings, error: loadError } = await SystemSettingsService.getSystemSettings();
      if (loadError) {
        setError(loadError);
      } else if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { success: saveSuccess, error: saveError } = await SystemSettingsService.updateSystemSettings(settings, user.id);
      if (saveError) {
        setError(saveError);
      } else if (saveSuccess) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">System Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center space-x-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="maintenance_mode" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Maintenance Mode
                </label>
                <p className="text-xs text-slate-500 mt-1">Temporarily disable the system for maintenance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="maintenance_mode"
                  checked={settings.maintenance_mode}
                  onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="registration_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                  User Registration
                </label>
                <p className="text-xs text-slate-500 mt-1">Allow new users to register</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="registration_enabled"
                  checked={settings.registration_enabled}
                  onChange={(e) => handleSettingChange('registration_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Feature Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Feature Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="event_creation_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Event Creation
                </label>
                <p className="text-xs text-slate-500 mt-1">Allow organizers to create events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="event_creation_enabled"
                  checked={settings.event_creation_enabled}
                  onChange={(e) => handleSettingChange('event_creation_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="survey_creation_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Survey Creation
                </label>
                <p className="text-xs text-slate-500 mt-1">Allow organizers to create surveys</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="survey_creation_enabled"
                  checked={settings.survey_creation_enabled}
                  onChange={(e) => handleSettingChange('survey_creation_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="email_notifications_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Email Notifications
                </label>
                <p className="text-xs text-slate-500 mt-1">Enable system-wide email notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="email_notifications_enabled"
                  checked={settings.email_notifications_enabled}
                  onChange={(e) => handleSettingChange('email_notifications_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">System Limits</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="max_events_per_user" className="block text-sm font-medium text-slate-700 mb-2">
                Max Events Per User
              </label>
              <input
                type="number"
                id="max_events_per_user"
                value={settings.max_events_per_user}
                onChange={(e) => handleSettingChange('max_events_per_user', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="max_participants_per_event" className="block text-sm font-medium text-slate-700 mb-2">
                Max Participants Per Event
              </label>
              <input
                type="number"
                id="max_participants_per_event"
                value={settings.max_participants_per_event}
                onChange={(e) => handleSettingChange('max_participants_per_event', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    targetType: 'all',
    roleFilter: 'participant',
    selectedUsers: []
  });
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const pageSize = 20;

  useEffect(() => {
    loadNotifications();
  }, [page]);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    const result = await AdminService.getAllNotifications(pageSize, page * pageSize);
    if (result.error) {
      setError(result.error);
    } else {
      setNotifications(result.notifications || []);
      setTotal(result.total || 0);
    }
    setLoading(false);
  };

  const handleSendBulk = async () => {
    if (!bulkForm.title || !bulkForm.message) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    setError('');

    try {
      let result;
      if (bulkForm.targetType === 'all') {
        result = await AdminService.sendNotificationToAll(
          bulkForm.title,
          bulkForm.message,
          bulkForm.type,
          {
            priority: bulkForm.priority
          }
        );
      } else if (bulkForm.targetType === 'role') {
        result = await AdminService.sendNotificationToAll(
          bulkForm.title,
          bulkForm.message,
          bulkForm.type,
          {
            priority: bulkForm.priority,
            roleFilter: bulkForm.roleFilter
          }
        );
      } else {
        result = await AdminService.sendBulkNotifications(
          bulkForm.selectedUsers,
          bulkForm.title,
          bulkForm.message,
          bulkForm.type,
          {
            priority: bulkForm.priority
          }
        );
      }

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Successfully sent ${result.sent || 0} notifications`);
        setShowBulkModal(false);
        setBulkForm({
          title: '',
          message: '',
          type: 'info',
          priority: 'normal',
          targetType: 'all',
          roleFilter: 'participant',
          selectedUsers: []
        });
        loadNotifications();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    const result = await AdminService.deleteNotification(notificationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Notification deleted');
      loadNotifications();
    }
  };

  const handleCleanupExpired = async () => {
    if (!window.confirm('Delete all expired notifications?')) return;

    const result = await AdminService.deleteExpiredNotifications();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deleted || 0} expired notifications`);
      loadNotifications();
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Notification Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleCleanupExpired}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Expired</span>
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Bulk Notification</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Read</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {notification.user?.email || notification.user_id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{notification.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{notification.message}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.type === 'success' ? 'bg-green-100 text-green-800' :
                      notification.type === 'error' ? 'bg-red-100 text-red-800' :
                      notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {notification.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      notification.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {notification.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {notification.read ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notifications.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">No notifications found</p>
          </div>
        )}

        {total > pageSize && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Notification Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Send Bulk Notification</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={bulkForm.title}
                  onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={bulkForm.message}
                  onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={4}
                  placeholder="Notification message"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={bulkForm.type}
                    onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={bulkForm.priority}
                    onChange={(e) => setBulkForm({ ...bulkForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target</label>
                <select
                  value={bulkForm.targetType}
                  onChange={(e) => setBulkForm({ ...bulkForm, targetType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="all">All Users</option>
                  <option value="role">By Role</option>
                </select>
              </div>

              {bulkForm.targetType === 'role' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={bulkForm.roleFilter}
                    onChange={(e) => setBulkForm({ ...bulkForm, roleFilter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="participant">Participants</option>
                    <option value="organizer">Organizers</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulk}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Database Maintenance Tab Component
const DatabaseMaintenanceTab = () => {
  const [stats, setStats] = useState(null);
  const [orphaned, setOrphaned] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleanupDays, setCleanupDays] = useState(90);
  const [cleaning, setCleaning] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [statsResult, orphanedResult, healthResult] = await Promise.all([
      DatabaseMaintenanceService.getDatabaseStats(),
      DatabaseMaintenanceService.getOrphanedRecords(),
      DatabaseMaintenanceService.getSystemHealth()
    ]);

    if (statsResult.error) {
      setError(statsResult.error);
    } else {
      setStats(statsResult.stats);
    }

    if (orphanedResult.error) {
      console.error('Failed to load orphaned records:', orphanedResult.error);
    } else {
      setOrphaned(orphanedResult.records || []);
    }

    if (healthResult.error) {
      console.error('Failed to load system health:', healthResult.error);
    } else {
      setHealth(healthResult.health);
    }

    setLoading(false);
  };

  const handleCleanupActivityLogs = async () => {
    if (!window.confirm(`Delete activity logs older than ${cleanupDays} days?`)) return;

    setCleaning(true);
    const result = await DatabaseMaintenanceService.cleanupOldActivityLogs(cleanupDays);
    setCleaning(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deleted || 0} old activity logs`);
      loadData();
    }
  };

  const handleCleanupNotifications = async () => {
    if (!window.confirm('Delete all expired notifications?')) return;

    setCleaning(true);
    const result = await DatabaseMaintenanceService.cleanupExpiredNotifications();
    setCleaning(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deleted || 0} expired notifications`);
      loadData();
    }
  };

  const handleCleanupOldReadNotifications = async () => {
    if (!window.confirm(`Delete read notifications older than ${cleanupDays} days?`)) return;

    setCleaning(true);
    const result = await DatabaseMaintenanceService.cleanupOldReadNotifications(cleanupDays);
    setCleaning(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deleted || 0} old read notifications`);
      loadData();
    }
  };

  const handleDeleteOrphaned = async (tableName) => {
    if (!window.confirm(`Delete orphaned records from ${tableName}?`)) return;

    setCleaning(true);
    const result = await DatabaseMaintenanceService.deleteOrphanedRecords(tableName);
    setCleaning(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deleted || 0} orphaned records`);
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading database information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800">Database Maintenance</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* System Health */}
      {health && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>System Health</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                health.database_status === 'healthy' ? 'bg-green-100 text-green-800' :
                health.database_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {health.database_status.toUpperCase()}
              </span>
            </div>
            {health.issues && health.issues.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Issues:</p>
                <ul className="list-disc list-inside space-y-1">
                  {health.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-slate-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Statistics */}
      {stats && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Database Statistics</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-1">Total Tables</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total_tables || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 mb-1">Total Rows</p>
              <p className="text-2xl font-bold text-green-900">{stats.total_rows?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-1">Largest Table</p>
              <p className="text-lg font-bold text-purple-900">
                {stats.table_sizes && stats.table_sizes.length > 0
                  ? stats.table_sizes[0].table_name
                  : 'N/A'}
              </p>
            </div>
          </div>
          {stats.table_sizes && stats.table_sizes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Table</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Rows</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Size (MB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.table_sizes.slice(0, 10).map((table) => (
                    <tr key={table.table_name}>
                      <td className="px-4 py-2 text-sm text-slate-900">{table.table_name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{table.row_count?.toLocaleString() || 0}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{table.size_mb?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orphaned Records */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>Orphaned Records</span>
        </h3>
        {orphaned.length === 0 ? (
          <p className="text-slate-600">No orphaned records found. Database is clean!</p>
        ) : (
          <div className="space-y-3">
            {orphaned.map((record, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium text-slate-800">{record.table_name}</p>
                  <p className="text-sm text-slate-600">{record.description}</p>
                  <p className="text-sm text-orange-700 mt-1">Count: {record.count}</p>
                </div>
                <button
                  onClick={() => handleDeleteOrphaned(record.table_name)}
                  disabled={cleaning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleanup Tools */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Cleanup Tools</span>
        </h3>
        <div className="space-y-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-medium text-slate-800">Activity Logs Cleanup</p>
                <p className="text-sm text-slate-600">Delete activity logs older than specified days</p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
                  min="1"
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  onClick={handleCleanupActivityLogs}
                  disabled={cleaning}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  Cleanup
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-medium text-slate-800">Expired Notifications</p>
                <p className="text-sm text-slate-600">Delete all notifications that have expired</p>
              </div>
              <button
                onClick={handleCleanupNotifications}
                disabled={cleaning}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                Cleanup
              </button>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-medium text-slate-800">Old Read Notifications</p>
                <p className="text-sm text-slate-600">Delete read notifications older than specified days</p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
                  min="1"
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  onClick={handleCleanupOldReadNotifications}
                  disabled={cleaning}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  Cleanup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

