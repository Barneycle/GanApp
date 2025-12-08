import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false);
  const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const notificationsDropdownRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) {
        closeNotificationsDropdown();
      }
    };

    if (isNotificationsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsDropdownOpen]);

  // Load unread notification count
  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      const result = await NotificationService.getUnreadCount(user.id);
      if (!result.error && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    };

    loadUnreadCount();

    // Subscribe to real-time notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        loadUnreadCount();
        // Add new notification to the list if dropdown is open
        if (isNotificationsDropdownOpen) {
          setNotifications(prev => [newNotification, ...prev]);
        }
      }
    );

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, isAuthenticated, isNotificationsDropdownOpen]);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      
      if (result && result.success) {
        navigate('/');
      } else {
        // Even if there's an error, try to navigate to home
        navigate('/');
      }
    } catch (error) {
      // Even if there's an error, try to navigate to home
      navigate('/');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const toggleEventsDropdown = () => {
    setIsEventsDropdownOpen(!isEventsDropdownOpen);
  };

  const toggleSurveyDropdown = () => {
    setIsSurveyDropdownOpen(!isSurveyDropdownOpen);
  };

  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const closeEventsDropdown = () => {
    setIsEventsDropdownOpen(false);
  };

  const closeSurveyDropdown = () => {
    setIsSurveyDropdownOpen(false);
  };

  const toggleNotificationsDropdown = () => {
    setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen);
    if (!isNotificationsDropdownOpen && user?.id) {
      loadNotifications();
    }
  };

  const closeNotificationsDropdown = () => {
    setIsNotificationsDropdownOpen(false);
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      setNotificationsLoading(true);
      const result = await NotificationService.getNotifications(user.id);
      if (!result.error) {
        setNotifications(result.notifications || []);
        const unread = (result.notifications || []).filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Only navigate if there's an action_url and it's not the notifications page
    if (notification.action_url && !notification.action_url.includes('/notifications')) {
      navigate(notification.action_url);
    }
    closeNotificationsDropdown();
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateTestNotification = async () => {
    if (!user?.id) return;
    
    const testTypes = ['info', 'success', 'warning', 'error'];
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
    
    const result = await NotificationService.createNotification(
      user.id,
      'Test Notification',
      `This is a test ${randomType} notification. Click to test the notification system!`,
      randomType,
      {
        action_url: '/notifications',
        action_text: 'View Notifications',
        priority: 'normal'
      }
    );

    if (result.error) {
      console.error('Failed to create test notification:', result.error);
    } else {
      // Reload notifications to show the new one
      await loadNotifications();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get user initials for profile circle
  const getUserInitials = () => {
    if (!user) return '?';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  };

  return (
         <nav className="bg-blue-900 text-white shadow-2xl border-b border-blue-800/50 backdrop-blur-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link 
              to={!user ? '/' : user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/participants'} 
              className="text-2xl font-bold text-white"
            >
              GanApp
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 flex-1 justify-center ml-8">
            {/* Home Link - Different for each role */}
            <Link
              to={!user ? '/' : user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/participants'}
              className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            
            {/* Events Link - Only for unauthenticated users */}
            {!user && (
              <Link
                to="/events"
                className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
              >
                Events
              </Link>
            )}
            

            {/* Role-specific Navigation */}
            {user?.role === 'admin' && (
              <>
                {/* Admin Navigation */}
                <Link
                  to="/admin"
                  className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Admin Dashboard
                </Link>
                <Link
                  to="/activity-log"
                  className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Activity Log
                </Link>
              </>
            )}
            
            {user?.role === 'organizer' && (
              <>
                {/* Organizer Navigation */}
                {/* Events Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleEventsDropdown}
                    onMouseEnter={() => setIsEventsDropdownOpen(true)}
                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Events</span>
                    <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isEventsDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-48 bg-blue-950 rounded-xl shadow-xl border border-blue-800/50 py-2 z-50"
                      onMouseLeave={() => setIsEventsDropdownOpen(false)}
                    >
                      <Link
                        to="/events"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                        onClick={closeEventsDropdown}
                      >
                        All Events
                      </Link>
                      <Link
                        to="/create-event"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                        onClick={closeEventsDropdown}
                      >
                        Create Event
                      </Link>
                    </div>
                  )}
                </div>

                {/* Survey Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleSurveyDropdown}
                    onMouseEnter={() => setIsSurveyDropdownOpen(true)}
                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Survey</span>
                    <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isSurveyDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-48 bg-blue-950 rounded-xl shadow-xl border border-blue-800/50 py-2 z-50"
                      onMouseLeave={() => setIsSurveyDropdownOpen(false)}
                    >
                      <Link
                        to="/survey-management"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                        onClick={closeSurveyDropdown}
                      >
                        Survey Management
                      </Link>
                      <Link
                        to="/event-statistics"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                        onClick={closeSurveyDropdown}
                      >
                        Event Statistics
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
            
                         {user?.role === 'participant' && (
               <>
                 {/* Participant Navigation */}
                 {/* Events Dropdown */}
                 <div className="relative">
                   <button
                     onClick={toggleEventsDropdown}
                     onMouseEnter={() => setIsEventsDropdownOpen(true)}
                     className="text-lg font-medium text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
                   >
                     <span>Events</span>
                     <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                     </svg>
                   </button>
                   
                   {isEventsDropdownOpen && (
                     <div 
                       className="absolute top-full left-0 mt-2 w-48 bg-blue-950 rounded-xl shadow-xl border border-blue-800/50 py-2 z-50"
                       onMouseLeave={() => setIsEventsDropdownOpen(false)}
                     >
                       <Link
                         to="/events"
                         className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                         onClick={closeEventsDropdown}
                       >
                         All Events
                       </Link>
                       <Link
                         to="/my-events"
                         className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                         onClick={closeEventsDropdown}
                       >
                         My Events
                       </Link>
                       <Link
                         to="/albums"
                         className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 hover:text-white transition-colors"
                         onClick={closeEventsDropdown}
                       >
                         Albums
                       </Link>
                     </div>
                   )}
                 </div>
               </>
             )}
          </div>

          {/* Desktop Profile/Login Section - Far Right */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0 ml-auto">
            {isAuthenticated ? (
              <>
                {/* Notifications Button with Dropdown */}
                <div className="relative" ref={notificationsDropdownRef}>
                  <button
                    onClick={toggleNotificationsDropdown}
                    className="relative p-2 text-gray-300 hover:text-white hover:bg-blue-800/50 rounded-full transition-colors focus:outline-none"
                    aria-label="Notifications"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[600px] flex flex-col">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={async () => {
                                if (!user?.id) return;
                                const result = await NotificationService.markAllAsRead(user.id);
                                if (!result.error) {
                                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                  setUnreadCount(0);
                                }
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleCreateTestNotification}
                            className="flex-1 px-3 py-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
                          >
                            Test Notification
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto flex-1">
                        {notificationsLoading ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-sm text-gray-500">No notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.slice(0, 10).map((notification) => (
                              <div
                                key={notification.id}
                                className={`w-full px-4 py-3 hover:bg-gray-50 transition-colors ${
                                  !notification.read ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <div className="flex items-start justify-between">
                                      <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {notification.title}
                                      </p>
                                      {!notification.read && (
                                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5 ml-2"></span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {formatNotificationTime(notification.created_at)}
                                    </p>
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const result = await NotificationService.deleteNotification(notification.id);
                                      if (!result.error) {
                                        setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                        if (!notification.read) {
                                          setUnreadCount(prev => Math.max(0, prev - 1));
                                        }
                                      }
                                    }}
                                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete notification"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <Link
                          to="/notifications"
                          onClick={closeNotificationsDropdown}
                          className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          See All
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar Button */}
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-400/50 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    />
                  ) : (
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md hover:shadow-lg transition-shadow border-2 border-blue-400/50">
                      {getUserInitials()}
                    </div>
                  )}
                </button>

                {/* Profile Dropdown - Facebook Style */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
                    {/* Profile Section at Top */}
                    <button
                      onClick={() => {
                        navigate('/profile');
                        closeProfileDropdown();
                      }}
                      className="w-full px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                    >
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {getUserInitials()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">See your profile</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Menu Items */}
                    <div className="py-2">
                    <Link
                        to="/settings"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-100 transition-colors text-gray-700"
                      onClick={closeProfileDropdown}
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium">Settings</span>
                        <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleSignOut}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-100 transition-colors text-gray-700 text-left"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : (
                             <Link
                 to="/login"
                 className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all duration-300 border border-blue-900/50 hover:border-blue-800 hover:shadow-lg hover:shadow-blue-900/25 hover:scale-105"
               >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

                {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-900 border-t border-blue-800/50">
                {/* Home Link - Different for each role */}
                <Link
                  to={!user ? '/' : user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/participants'}
                  className="text-lg font-medium text-gray-300 hover:text-white transition-colors block px-3 py-2 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                
                {/* Events Link - Only for unauthenticated users */}
                {!user && (
                  <Link
                    to="/events"
                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors block px-3 py-2 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Events
                  </Link>
                )}
                

                {/* Role-specific Mobile Navigation */}
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin"
                      className="text-lg font-medium text-gray-300 hover:text-white transition-colors block px-3 py-2 rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                    <Link
                      to="/activity-log"
                      className="text-lg font-medium text-gray-300 hover:text-white transition-colors block px-3 py-2 rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Activity Log
                    </Link>
                  </>
                )}
                
                {user?.role === 'organizer' && (
                  <>
                    {/* Mobile Events Section */}
                    <div className="px-3 py-2">
                      <div className="text-lg font-medium text-gray-300 mb-2">Events</div>
                      <div className="ml-4 space-y-1">
                        <Link
                          to="/events"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          All Events
                        </Link>
                        <Link
                          to="/create-event"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Create Event
                        </Link>
                      </div>
                    </div>
                    
                    {/* Mobile Survey Section */}
                    <div className="px-3 py-2">
                      <div className="text-lg font-medium text-gray-300 mb-2">Survey</div>
                      <div className="ml-4 space-y-1">
                        <Link
                          to="/survey-management"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Survey Management
                        </Link>
                        <Link
                          to="/event-statistics"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Event Statistics
                        </Link>
                      </div>
                    </div>
                  </>
                )}
                
                {user?.role === 'participant' && (
                  <>
                    {/* Mobile Events Section */}
                    <div className="px-3 py-2">
                      <div className="text-lg font-medium text-gray-300 mb-2">Events</div>
                      <div className="ml-4 space-y-1">
                        <Link
                          to="/events"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          All Events
                        </Link>
                        <Link
                          to="/my-events"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          My Events
                        </Link>
                        <Link
                          to="/albums"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Albums
                        </Link>
                      </div>
                    </div>
                  </>
                )}
            
            {/* Mobile Profile/Login Section */}
            {isAuthenticated ? (
              <div className="pt-4 border-t border-blue-800/50">
                <div className="flex items-center px-3 py-2">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-400/50 shadow-md mr-3"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl mr-3 border-2 border-blue-400/50">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-300">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/settings"
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-blue-800 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  to="/edit-profile"
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-blue-800 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-blue-800 transition-colors rounded-md"
                >
                  Sign Out
                </button>
              </div>
                         ) : (
               <div className="pt-4 border-t border-blue-800/50">
                                   <Link
                    to="/login"
                    className="block w-full px-6 py-4 bg-blue-900 hover:bg-blue-800 text-white text-lg font-semibold rounded-xl transition-all duration-300 border border-blue-900/50 hover:border-blue-800 hover:shadow-lg hover:shadow-blue-900/25 text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                   Sign In
                 </Link>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(isProfileDropdownOpen || isEventsDropdownOpen || isSurveyDropdownOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            closeProfileDropdown();
            closeEventsDropdown();
            closeSurveyDropdown();
          }}
        />
      )}
    </nav>
  );
};