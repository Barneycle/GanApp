import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Images,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';
import { RouteProgress } from './loading/RouteProgress';
import { Skeleton } from './loading/Skeleton';
import { runOptimistic } from '../hooks/useOptimistic';

const NAV = {
  guest: {
    primary: [
      { to: '/', label: 'Home', end: true },
      { to: '/events', label: 'Events' },
    ],
    more: [],
  },
  participant: {
    primary: [
      { to: '/participants', label: 'Home', end: true },
      { to: '/events', label: 'Events' },
      { to: '/my-events', label: 'My events' },
    ],
    more: [
      { to: '/my-certificates', label: 'Certificates', icon: Award },
      { to: '/albums', label: 'Albums', icon: Images },
    ],
  },
  organizer: {
    primary: [
      { to: '/organizer', label: 'Home', end: true },
      { to: '/events', label: 'Events' },
    ],
    more: [
      { to: '/event-messages', label: 'Messages', icon: MessageSquare },
      { to: '/albums', label: 'Albums', icon: Images },
      { to: '/standalone-certificate-generator', label: 'Certificates', icon: Award },
      { to: '/survey-management', label: 'Evaluations', icon: ClipboardList },
      { to: '/event-statistics', label: 'Stats', icon: BarChart3 },
    ],
  },
};

const pathMatches = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

const HOME = {
  guest: '/',
  participant: '/participants',
  organizer: '/organizer',
};

const linkClass = ({ isActive }) =>
  `relative flex h-14 items-center text-[13px] font-medium tracking-[-0.01em] transition-colors ${
    isActive ? 'text-white' : 'text-blue-100/70 hover:text-white'
  }`;

const formatNotificationTime = (dateString) => {
  const date = new Date(dateString);
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const roleKey = (user) => {
  if (user?.role === 'organizer') return 'organizer';
  if (user?.role === 'participant') return 'participant';
  return 'guest';
};

export const AppShell = ({ children }) => {
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const moreRef = useRef(null);

  const role = roleKey(user);
  const { primary: navItems, more: moreItems } = NAV[role];
  const homeTo = HOME[role];
  const moreActive = moreItems.some((item) => pathMatches(location.pathname, item.to));

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    const loadUnreadCount = async () => {
      const result = await NotificationService.getUnreadCount(user.id);
      if (!result.error && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    };

    loadUnreadCount();
    const unsubscribe = NotificationService.subscribeToNotifications(user.id, (newNotification) => {
      loadUnreadCount();
      if (notificationsOpen) {
        setNotifications((prev) => [newNotification, ...prev]);
      }
    });
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, isAuthenticated, notificationsOpen]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setNotificationsLoading(true);
      const result = await NotificationService.getNotifications(user.id);
      if (!result.error) {
        setNotifications(result.notifications || []);
        setUnreadCount((result.notifications || []).filter((n) => !n.read).length);
      }
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };

  const initials = useMemo(
    () => `${(user?.first_name || 'U').charAt(0)}${(user?.last_name || '').charAt(0)}`.toUpperCase(),
    [user?.first_name, user?.last_name]
  );

  return (
    <div className="organizer-root min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-blue-900/85 backdrop-blur-md">
        <RouteProgress />
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-8 px-5 lg:px-8">
          <Link to={homeTo} className="shrink-0 text-[15px] font-semibold tracking-tight text-white">
            GanApp
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="app-nav-line"
                        className="absolute inset-x-0 bottom-0 h-[1.5px] bg-white"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {moreItems.length > 0 && (
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen((open) => !open);
                    setProfileOpen(false);
                    setNotificationsOpen(false);
                  }}
                  className={`${linkClass({ isActive: moreActive })} gap-1`}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                >
                  More
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                  {moreActive && (
                    <motion.span
                      layoutId="app-nav-line"
                      className="absolute inset-x-0 bottom-0 h-[1.5px] bg-white"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.16 }}
                      className="absolute left-0 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 py-1 shadow-none backdrop-blur-md"
                      role="menu"
                    >
                      {moreItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathMatches(location.pathname, item.to);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-slate-50 ${
                              active ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {item.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {role === 'organizer' && (
              <Link
                to="/create-event"
                className="mr-1 hidden h-8 items-center rounded-md bg-white px-3.5 text-[13px] font-medium text-blue-900 transition-colors hover:bg-blue-50 sm:inline-flex"
              >
                New event
              </Link>
            )}

            {role === 'guest' && (
              <Link
                to="/login"
                className="mr-1 hidden h-8 items-center rounded-md bg-white px-3.5 text-[13px] font-medium text-blue-900 transition-colors hover:bg-blue-50 sm:inline-flex"
              >
                Sign in
              </Link>
            )}

            {isAuthenticated && (
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    setProfileOpen(false);
                    setMoreOpen(false);
                    if (next) loadNotifications();
                  }}
                  className="relative rounded-full p-2 text-gray-300 transition-colors hover:bg-blue-800/50 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 shadow-none backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[13px] font-medium text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            className="text-[12px] text-blue-600 hover:text-blue-800"
                            onClick={async () => {
                              if (!user?.id) return;
                              const result = await NotificationService.markAllAsRead(user.id);
                              if (!result.error) {
                                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                                setUnreadCount(0);
                              }
                            }}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto organizer-hide-scroll">
                        {notificationsLoading ? (
                          <div className="space-y-2 px-4 py-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-[13px] text-slate-400">Nothing yet</p>
                        ) : (
                          notifications.slice(0, 8).map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={async () => {
                                const wasUnread = !notification.read;
                                await runOptimistic({
                                  apply: () => {
                                    if (wasUnread) {
                                      setNotifications((prev) =>
                                        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
                                      );
                                      setUnreadCount((prev) => Math.max(0, prev - 1));
                                    }
                                  },
                                  request: async () => {
                                    if (wasUnread) await NotificationService.markAsRead(notification.id);
                                    return {};
                                  },
                                  revert: () => {
                                    if (wasUnread) {
                                      setNotifications((prev) =>
                                        prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n))
                                      );
                                      setUnreadCount((prev) => prev + 1);
                                    }
                                  },
                                });
                                if (notification.action_url && !notification.action_url.includes('/notifications')) {
                                  navigate(notification.action_url);
                                }
                                setNotificationsOpen(false);
                              }}
                              className="flex w-full flex-col gap-0.5 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <span className={`text-[13px] ${notification.read ? 'text-slate-500' : 'text-slate-900'}`}>
                                {notification.title}
                              </span>
                              <span className="text-[12px] text-slate-400">
                                {formatNotificationTime(notification.created_at)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="block border-t border-slate-100 px-4 py-2.5 text-center text-[12px] text-slate-500 hover:text-slate-900"
                      >
                        See all
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isAuthenticated && (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setNotificationsOpen(false);
                    setMoreOpen(false);
                  }}
                  className="rounded-full p-1"
                  aria-label="Account"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-blue-400/50" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white ring-1 ring-blue-400/50">
                      {initials}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 py-1 shadow-none backdrop-blur-md"
                    >
                      <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                        <User className="h-3.5 w-3.5" /> Profile
                      </Link>
                      <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                        <Settings className="h-3.5 w-3.5" /> Settings
                      </Link>
                      <Link to="/help" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                        <CircleHelp className="h-3.5 w-3.5" /> Help & support
                      </Link>
                      <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              type="button"
              className="rounded-full p-2 text-gray-300 hover:bg-blue-800/50 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-blue-900/95 backdrop-blur-md lg:hidden"
          >
            <div className="flex h-14 items-center justify-between px-5">
              <span className="text-[15px] font-semibold tracking-tight text-white">GanApp</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-gray-300 hover:text-white" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col px-5 pt-8">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block py-2.5 text-[28px] font-medium tracking-tight ${isActive ? 'text-white' : 'text-blue-100/70'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
              {moreItems.length > 0 && (
                <div className="mt-6 border-t border-blue-800/80 pt-5">
                  {moreItems.map((item, index) => (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * (navItems.length + index), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-2 text-[18px] font-medium tracking-tight ${
                            isActive || pathMatches(location.pathname, item.to) ? 'text-white' : 'text-gray-300'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              )}
              {role === 'organizer' && (
                <Link
                  to="/create-event"
                  onClick={() => setMobileOpen(false)}
                  className="mt-8 inline-flex h-11 w-fit items-center rounded-md bg-white px-5 text-[15px] font-medium text-blue-900"
                >
                  New event
                </Link>
              )}
              {role === 'guest' && (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-8 text-[28px] font-medium tracking-tight text-white"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
};
