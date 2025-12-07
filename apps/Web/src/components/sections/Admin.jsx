import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminService } from '../../services/adminService';

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Manage users, events, and system settings</p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-6">
          <div className="flex flex-wrap border-b border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'events'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Event Management
            </button>
            <button
              onClick={() => setActiveTab('cancellations')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'cancellations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Cancellation Requests
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Analytics & Reports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              System Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'events' && <EventsTab />}
            {activeTab === 'cancellations' && <CancellationsTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'settings' && <SettingsTab />}
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    } else {
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

  const filteredUsers = users.filter((user) => {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">User Management</h2>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh
        </button>
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
              const isInactive = user.is_active === false;
              const showUnban = isBanned || isInactive;

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
                  {user.banned_until && new Date(user.banned_until) > new Date() ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Banned
                    </span>
                  ) : user.is_active === false ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
                        if (showUnban) {
                          handleUnbanUser(user.id);
                        } else {
                          setSelectedUser(user);
                          setActionType('ban');
                        }
                      }}
                      className={`px-3 py-1 rounded text-xs ${showUnban ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                      disabled={actionLoading}
                    >
                      {showUnban ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setActionType('role');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Change Role
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setActionType('archive');
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                    >
                      Archive
                    </button>
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
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

// Events Tab Component
const EventsTab = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    loadEvents();
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

  const handleArchiveEvent = async (eventId, reason) => {
    setActionLoading(true);
    const result = await AdminService.archiveEvent(eventId, reason);
    if (result.error) {
      setError(result.error);
    } else {
      await loadEvents();
      setSelectedEvent(null);
      setActionType(null);
    }
    setActionLoading(false);
  };

  const filteredEvents = events.filter((event) => {
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading events...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Event Management</h2>
        <button
          onClick={loadEvents}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setActionType('stats');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      View Stats
                    </button>
                    {(event.status === 'completed' || event.status === 'cancelled') && (
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setActionType('archive');
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                      >
                        Archive
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
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{exportLoading ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    // In a real app, this would fetch from a settings table
    // For now, we'll use default values
    setLoading(false);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, this would save to a settings table
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
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

