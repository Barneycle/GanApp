import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false);
  const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  // Get user initials for profile circle
  const getUserInitials = () => {
    if (!user) return '?';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  };

  return (
         <nav className="bg-blue-900 text-white shadow-2xl border-b border-blue-800/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
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
          <div className="hidden md:flex items-center space-x-8">
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
                  Dashboard
                </Link>
                <Link
                  to="/users"
                  className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Manage Users
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

                {/* Evaluation Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleSurveyDropdown}
                    onMouseEnter={() => setIsSurveyDropdownOpen(true)}
                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Evaluation</span>
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
                        Evaluation Management
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
                     </div>
                   )}
                 </div>
               </>
             )}
          </div>

          {/* Desktop Profile/Login Section */}
          <div className="hidden md:block">
            {isAuthenticated ? (
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
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-md hover:shadow-lg transition-shadow border-2 border-blue-400/50">
                      {getUserInitials()}
                    </div>
                  )}
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-blue-950 rounded-xl shadow-xl border border-blue-800/50 py-2 z-50">
                    <div className="px-4 py-2 border-b border-blue-800/50">
                      <p className="text-sm font-medium text-white">{user?.first_name} {user?.last_name}</p>
                      <p className="text-xs text-gray-300">{user?.email}</p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user?.user_type === 'psu-student' ? 'bg-blue-100 text-blue-800' :
                          user?.user_type === 'psu-employee' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {user?.user_type}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user?.role === 'organizer' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user?.role}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/edit-profile"
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 transition-colors"
                      onClick={closeProfileDropdown}
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-900 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
                             <Link
                 to="/login"
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all duration-300 border border-blue-600/50 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/25 hover:scale-105"
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
                      Dashboard
                    </Link>
                    <Link
                      to="/users"
                      className="text-lg font-medium text-gray-300 hover:text-white transition-colors block px-3 py-2 rounded-md"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Manage Users
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
                    
                    {/* Mobile Evaluation Section */}
                    <div className="px-3 py-2">
                      <div className="text-lg font-medium text-gray-300 mb-2">Evaluation</div>
                      <div className="ml-4 space-y-1">
                        <Link
                          to="/survey-management"
                          className="text-base font-medium text-gray-400 hover:text-white transition-colors block py-1 rounded-md"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Evaluation Management
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
                    className="block w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold rounded-xl transition-all duration-300 border border-blue-600/50 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/25 text-center"
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