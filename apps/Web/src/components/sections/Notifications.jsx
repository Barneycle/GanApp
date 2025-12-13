import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationService } from '../../services/notificationService';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { Bell, Check, CheckCheck, Trash2, RefreshCw, Filter } from 'lucide-react';

export const Notifications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, success, warning, error, info
  const [selectedNotifications, setSelectedNotifications] = useState([]); // Array of selected notification IDs
  const isVisible = usePageVisibility();
  const hasLoadedRef = useRef(false);

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

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if profile is complete
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }

    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current && user?.id) {
      hasLoadedRef.current = true;
      loadNotifications();
    }
  }, [isAuthenticated, user?.id, authLoading, navigate]);

  // Separate effect for real-time subscription
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    // Subscribe to real-time notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, isAuthenticated]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await NotificationService.getNotifications(user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setNotifications(result.notifications || []);
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    const result = await NotificationService.markAsRead(notificationId);
    if (!result.error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    const result = await NotificationService.markAllAsRead(user.id);
    if (!result.error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleDelete = async (notificationId) => {
    const result = await NotificationService.deleteNotification(notificationId);
    if (!result.error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const handleDeleteAllRead = async () => {
    if (!user?.id) return;
    const result = await NotificationService.deleteAllRead(user.id);
    if (!result.error) {
      setNotifications(prev => prev.filter(n => !n.read));
    }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      const result = await NotificationService.deleteAll(user.id);
      if (!result.error) {
        setNotifications([]);
        setSelectedNotifications([]);
      }
    }
  };

  const handleToggleSelect = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleMarkAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      // Deselect all
      setSelectedNotifications([]);
    } else {
      // Select all filtered notifications
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedNotifications.length} notification(s)?`)) {
      // Delete each selected notification
      const deletePromises = selectedNotifications.map(id => 
        NotificationService.deleteNotification(id)
      );
      
      await Promise.all(deletePromises);
      
      // Remove deleted notifications from state
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;


  if (authLoading || loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading notifications...</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filter:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'read'
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Read
                </button>
              </div>
              <div className="flex items-center space-x-2 ml-auto">
                <span className="text-sm font-medium text-slate-700">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={loadNotifications}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center space-x-2"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {filteredNotifications.length > 0 && (
              <button
                onClick={handleMarkAll}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                {selectedNotifications.length === filteredNotifications.length ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Unmark all</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Mark all</span>
                  </>
                )}
              </button>
            )}
            {selectedNotifications.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedNotifications.length})</span>
              </button>
            )}
            {filteredNotifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                  unreadCount > 0
                    ? 'bg-blue-900 hover:bg-blue-800'
                    : 'bg-blue-400 cursor-not-allowed opacity-60'
                }`}
                title={unreadCount === 0 ? 'All notifications are already read' : 'Mark all notifications as read'}
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all as read</span>
              </button>
            )}
            {notifications.length > 0 && selectedNotifications.length === 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete all</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
            <Bell className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Notifications</h3>
            <p className="text-slate-600">
              {filter === 'unread' 
                ? 'You have no unread notifications.'
                : filter === 'read'
                ? 'You have no read notifications.'
                : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const isSelected = selectedNotifications.includes(notification.id);
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl shadow-lg border-2 p-4 transition-all hover:shadow-xl ${
                    !notification.read ? 'border-blue-300' : 'border-slate-100'
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Checkbox for selection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(notification.id);
                        }}
                        className="mt-1 flex-shrink-0 w-5 h-5 border-2 rounded border-slate-400 hover:border-blue-600 transition-colors flex items-center justify-center"
                        title={isSelected ? 'Unmark' : 'Mark'}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>{formatDate(notification.created_at)}</span>
                            {notification.priority !== 'normal' && (
                              <span className={`px-2 py-0.5 rounded ${
                                notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {notification.priority}
                              </span>
                            )}
                          </div>
                          {notification.action_url && notification.action_text && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {notification.action_text} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                            setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

