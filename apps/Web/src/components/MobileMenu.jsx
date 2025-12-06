import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const MobileMenu = ({ menuOpen, setMenuOpen }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isOrganizerRoute = () => {
    return location.pathname.startsWith('/organizer') || 
           location.pathname === '/create-event' || 
           location.pathname === '/view-events';
  };

  const isParticipantsRoute = () => {
    return location.pathname.startsWith('/participants') || 
           location.pathname === '/events' || 
           location.pathname === '/my-attendance' || 
           location.pathname === '/surveys' || 
           location.pathname === '/profile';
  };

  const isAdminRoute = () => {
    return location.pathname.startsWith('/admin') || 
           location.pathname === '/attendance' || 
           location.pathname === '/surveys' || 
           location.pathname === '/reports' ||
           location.pathname === '/settings' ||
           location.pathname === '/profile';
  };

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, setMenuOpen]);

  if (!menuOpen) return null;

  return (
    <div className="md:hidden bg-blue-900 border-t border-blue-800">
      <div className="px-4 py-6 space-y-4">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className={`block text-base font-medium ${
            isActive('/') ? 'text-white' : 'text-gray-300'
          } hover:text-white transition-colors`}
          title="Return to home page"
        >
          Home
        </Link>
        
        {isOrganizerRoute() ? (
          // Organizer-specific mobile menu
          <>
            {/* Events Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Events
              </div>
              <Link
                to="/view-events"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/view-events') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View all events"
              >
                All Events
              </Link>
              <Link
                to="/create-event"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/create-event') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Create a new event"
              >
                Create Event
              </Link>
            </div>
            
            <Link
              to="/survey-analytics"
              onClick={() => setMenuOpen(false)}
              className={`block text-base font-medium ${
                isActive('/survey-analytics') ? 'text-white' : 'text-gray-300'
              } hover:text-white transition-colors`}
              title="View survey responses and analytics"
            >
              Survey Analytics
            </Link>
          </>
        ) : isAdminRoute() ? (
          // Admin-specific mobile menu
          <>
            {/* Events Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Events
              </div>
              <Link
                to="/events"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/events') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View all events"
              >
                All Events
              </Link>
              <Link
                to="/create-event"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/create-event') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Create a new event"
              >
                Create Event
              </Link>
              <Link
                to="/manage-events"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/manage-events') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Manage ongoing and past events"
              >
                Manage Events
              </Link>
            </div>
            
            {/* Tools Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Tools
              </div>
              <Link
                to="/attendance"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/attendance') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="QR check-ins, photo verification, admin overrides"
              >
                Attendance
              </Link>
              <Link
                to="/surveys"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/surveys') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Manage evaluation forms, view responses"
              >
                Surveys
              </Link>
            </div>
            
            {/* Reports Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Reports
              </div>
              <Link
                to="/survey-analytics"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/survey-analytics') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View analytics dashboard"
              >
                Analytics Dashboard
              </Link>
              <Link
                to="/attendance-trends"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/attendance-trends') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View attendance trends"
              >
                Attendance Trends
              </Link>
              <Link
                to="/survey-insights"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/survey-insights') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View survey insights"
              >
                Survey Insights
              </Link>
            </div>
            
            {/* Settings Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Settings
              </div>
              <Link
                to="/system-preferences"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/system-preferences') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Configure system preferences"
              >
                System Preferences
              </Link>
              <Link
                to="/user-management"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/user-management') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Manage user accounts and permissions"
              >
                User Management
              </Link>
              <Link
                to="/customization"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/customization') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Customize system appearance and behavior"
              >
                Customization
              </Link>
            </div>
            
            {/* Profile Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Profile
              </div>
              <Link
                to="/account-settings"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/account-settings') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Manage account settings"
              >
                Account Settings
              </Link>
              <Link
                to="/help"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/help') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Get help and support"
              >
                Help
              </Link>
              <Link
                to="/logout"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/logout') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Logout from the system"
              >
                Logout
              </Link>
            </div>
          </>
        ) : isParticipantsRoute() ? (
          // Participants-specific mobile menu
          <>
            {/* Events Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Events
              </div>
              <Link
                to="/events"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/events') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="List of events you can join/register for"
              >
                All Events
              </Link>
            </div>
            
            {/* My Attendance Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                My Attendance
              </div>
              <Link
                to="/my-attendance"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/my-attendance') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="View your attendance history and QR check-in status"
              >
                My Attendance
              </Link>
            </div>
            
            {/* Surveys Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Surveys
              </div>
              <Link
                to="/surveys"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/surveys') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Answer post-event evaluation forms"
              >
                Surveys
              </Link>
            </div>
            
            {/* Profile Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Profile
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className={`block pl-4 text-base font-medium ${
                  isActive('/profile') ? 'text-white' : 'text-gray-300'
                } hover:text-white transition-colors`}
                title="Account settings, help, logout"
              >
                Profile
              </Link>
            </div>
          </>
        ) : (
          // Default mobile menu
          <>
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={`block text-base font-medium ${
                isActive('/admin') ? 'text-white' : 'text-gray-300'
              } hover:text-white transition-colors`}
              title="Access administrative functions and tools"
            >
              Admin
            </Link>
            <Link
              to="/organizer"
              onClick={() => setMenuOpen(false)}
              className={`block text-base font-medium ${
                isActive('/organizer') ? 'text-white' : 'text-gray-300'
              } hover:text-white transition-colors`}
              title="Manage events and surveys as an organizer"
            >
              Organizers
            </Link>
            <Link
              to="/participants"
              onClick={() => setMenuOpen(false)}
              className={`block text-base font-medium ${
                isActive('/participants') ? 'text-white' : 'text-gray-300'
              } hover:text-white transition-colors`}
              title="View and manage participant information"
            >
              Participants
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
