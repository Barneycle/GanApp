import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users } from "lucide-react";
import EventModal from './EventModal';
import { GenerateQRModal } from './GenerateQR';
import CertificateGenerator from '../CertificateGenerator';
import { EventService } from '../../services/eventService';
import { SurveyService } from '../../services/surveyService';
import { useAuth } from '../../contexts/AuthContext';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { useToast } from '../Toast';
import { ConfirmationDialog } from '../ConfirmationDialog';

export const MyEvents = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isVisible = usePageVisibility();
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certificateEventId, setCertificateEventId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'upcoming', 'ongoing', 'completed'
  const [venueFilter, setVenueFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-asc'); // 'date-asc', 'date-desc', 'title-asc', 'title-desc', 'registration-asc', 'registration-desc'
  const [showFilters, setShowFilters] = useState(false);
  const [unregisterDialog, setUnregisterDialog] = useState({
    isOpen: false,
    eventId: null,
    eventTitle: '',
  });
  const [isUnregistering, setIsUnregistering] = useState(false);

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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.role !== 'participant') {
      navigate('/');
      return;
    }

    // Check if profile is complete
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }

    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current && !loadingRef.current) {
      hasLoadedRef.current = true;
      loadRegisteredEvents();
    }
  }, [user, isAuthenticated, navigate]);

  const loadRegisteredEvents = async () => {
    if (!user?.id) return;

    // Don't start loading if page is not visible
    if (!isVisible) {
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const result = await EventService.getUserRegistrations(user.id);
      
      // Only update state if page is still visible
      if (isVisible) {
      if (result.error) {
        setError(result.error);
      } else {
        // Extract the events from the registrations
        const events = result.registrations?.map(registration => ({
          ...registration.events,
          registration_date: registration.registration_date,
          registration_id: registration.id
        })) || [];
        
        setRegisteredEvents(events);
        }
      }
    } catch (err) {
      // Only update error if page is still visible
      if (isVisible) {
      setError('Failed to load your registered events');
      }
    } finally {
      loadingRef.current = false;
      // Only set loading to false if page is still visible
      if (isVisible) {
      setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCheckInTime = (event) => {
    if (!event.check_in_before_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInTime = new Date(startTime.getTime() - (event.check_in_before_minutes * 60000));
    
    return checkInTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCheckInEndTime = (event) => {
    if (!event.check_in_during_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInEndTime = new Date(startTime.getTime() + (event.check_in_during_minutes * 60000));
    
    return checkInEndTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(`${event.start_date}T${event.start_time}`);
    const endDate = new Date(`${event.end_date}T${event.end_time}`);

    if (now < startDate) {
      return { status: 'upcoming', text: 'Upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (now >= startDate && now <= endDate) {
      return { status: 'ongoing', text: 'Ongoing', color: 'bg-green-100 text-green-800 border-green-200' };
    } else {
      return { status: 'completed', text: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // Get unique venues from registered events
  const uniqueVenues = [...new Set(registeredEvents.map(event => event.venue).filter(v => v && v !== 'Location TBD' && v.trim() !== ''))].sort();

  // Filter and sort events
  const filteredAndSortedEvents = registeredEvents.filter(event => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query)) ||
        (event.rationale && event.rationale.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Status filter
    const now = new Date();
    const startDate = new Date(`${event.start_date}T${event.start_time}`);
    const endDate = new Date(`${event.end_date}T${event.end_time}`);
    
    if (dateFilter === 'upcoming') {
      if (now >= startDate) return false;
    } else if (dateFilter === 'ongoing') {
      if (now < startDate || now > endDate) return false;
    } else if (dateFilter === 'completed') {
      if (now <= endDate) return false;
    }

    // Venue filter
    if (venueFilter !== 'all' && event.venue !== venueFilter) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'date-asc':
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      case 'date-desc':
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'registration-asc':
        return new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime();
      case 'registration-desc':
        return new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime();
      default:
        return 0;
    }
  });

  const handleUnregisterClick = (eventId, eventTitle) => {
    setUnregisterDialog({
      isOpen: true,
      eventId,
      eventTitle,
    });
  };

  const handleUnregister = async () => {
    const { eventId } = unregisterDialog;
    if (!user?.id || !eventId) return;

    setIsUnregistering(true);
    try {
      const result = await EventService.unregisterFromEvent(eventId, user.id);
      
      if (result.error) {
        toast.error(result.error || 'Failed to unregister from event');
      } else {
        // Remove the event from the list
        setRegisteredEvents(prev => prev.filter(event => event.id !== eventId));
        toast.success('Successfully unregistered from event');
        setUnregisterDialog({ isOpen: false, eventId: null, eventTitle: '' });
      }
    } catch (err) {
      toast.error('Failed to unregister from event');
    } finally {
      setIsUnregistering(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'participant') {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading your registered events...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-800 mb-6 text-lg">{error}</p>
            <button 
              onClick={loadRegisteredEvents} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (registeredEvents.length === 0) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Registered Events</h3>
            <p className="text-slate-600 mb-6">You haven't registered for any events yet. Explore available events and join the ones that interest you!</p>
            <Link 
              to="/events"
              className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Use the selected event or first event as the featured event
  const featuredEvent = selectedEvent || registeredEvents[0];
  const eventStatus = getEventStatus(featuredEvent);

  return (
    <>
      <style>{`
        .rich-text-content h1, .rich-text-content h2, .rich-text-content h3, 
        .rich-text-content h4, .rich-text-content h5, .rich-text-content h6 {
          font-weight: 700;
          margin-top: 0.5em;
          margin-bottom: 0.25em;
        }
        .rich-text-content h1 { font-size: 1.5em; }
        .rich-text-content h2 { font-size: 1.25em; }
        .rich-text-content h3 { font-size: 1.1em; }
        .rich-text-content h4 { font-size: 1em; }
        .rich-text-content h5 { font-size: 0.9em; }
        .rich-text-content h6 { font-size: 0.8em; }
        .rich-text-content p {
          margin: 0.25em 0;
        }
        .rich-text-content ul, .rich-text-content ol {
          padding-left: 1.5em;
          margin: 0.25em 0;
        }
        .rich-text-content ul {
          list-style-type: disc;
        }
        .rich-text-content ol {
          list-style-type: decimal;
        }
        .rich-text-content li {
          margin: 0.1em 0;
        }
        .rich-text-content strong {
          font-weight: 700;
        }
        .rich-text-content em {
          font-style: italic;
        }
        .rich-text-content u {
          text-decoration: underline;
        }
        .rich-text-content s {
          text-decoration: line-through;
        }
        .rich-text-content blockquote {
          border-left: 4px solid rgb(203, 213, 225);
          padding-left: 0.5em;
          margin: 0.5em 0;
          color: rgb(100, 116, 139);
        }
        .rich-text-content a {
          color: rgb(37, 99, 235);
          text-decoration: underline;
        }
        .rich-text-content code {
          background: rgb(241, 245, 249);
          padding: 1px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .rich-text-content pre {
          background: rgb(241, 245, 249);
          padding: 0.5em;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 0.9em;
        }
        .rich-text-content img {
          max-width: 100%;
          height: auto;
          margin: 8px 0;
        }
      `}</style>
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search your events by title, venue, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-blue-800 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters & Sort
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'upcoming', 'ongoing', 'completed'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDateFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dateFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'all' ? 'All Events' : filter === 'upcoming' ? 'Upcoming' : filter === 'ongoing' ? 'Ongoing' : 'Completed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Venue Filter */}
                {uniqueVenues.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Venue</label>
                    <select
                      value={venueFilter}
                      onChange={(e) => setVenueFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Venues</option>
                      {uniqueVenues.map((venue) => (
                        <option key={venue} value={venue}>{venue}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date-asc">Date (Earliest First)</option>
                    <option value="date-desc">Date (Latest First)</option>
                    <option value="title-asc">Title (A-Z)</option>
                    <option value="title-desc">Title (Z-A)</option>
                    <option value="registration-asc">Registration Date (Oldest First)</option>
                    <option value="registration-desc">Registration Date (Newest First)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('all');
                    setVenueFilter('all');
                    setSortOption('date-asc');
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                >
                  Clear All Filters
                </button>
              </div>

              {/* Results Count */}
              <div className="mt-4 text-sm text-slate-600">
                Showing {filteredAndSortedEvents.length} of {registeredEvents.length} events
              </div>
            </div>
          )}
        </div>

        {/* Registered Events Grid */}
        {filteredAndSortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {registeredEvents.length === 0 ? 'No Registered Events' : 'No Events Match Your Filters'}
              </h3>
              <p className="text-slate-600 mb-4">
                {registeredEvents.length === 0 
                  ? 'You haven\'t registered for any events yet.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {registeredEvents.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('all');
                    setVenueFilter('all');
                    setSortOption('date-asc');
                  }}
                  className="px-6 py-3 bg-blue-800 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedEvents.map((event) => {
            const eventStatus = getEventStatus(event);
            
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
              >
                {/* Event Banner */}
                {event.banner_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" style={{display: 'none'}}>
                      <span className="text-white text-lg font-semibold">Event Banner</span>
                    </div>
                  </div>
                )}
                
                {/* Event Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex-1">{event.title}</h3>
                    <div className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${eventStatus.color}`}>
                      {eventStatus.text}
                    </div>
                  </div>
                  
                  {event.rationale && (
                    <div 
                      className="text-slate-600 mb-4 line-clamp-3 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: event.rationale }}
                      style={{
                        wordWrap: 'break-word'
                      }}
                    />
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {formatDate(event.start_date)}
                        {event.start_date !== event.end_date && (
                          <> - {formatDate(event.end_date)}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                    {/* Check-in Window Info */}
                    {(event.check_in_before_minutes || event.check_in_during_minutes) && (
                      <div className="flex items-center text-sm text-blue-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2M9 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2" />
                        </svg>
                        <span>
                          Check-in: {formatCheckInTime(event)} - {formatCheckInEndTime(event)}
                        </span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsModalOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setQrEvent(event);
                        setIsQRModalOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Generate QR Code
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          // Get survey for this event
                          const surveyResult = await SurveyService.getSurveysByEvent(event.id);
                          if (surveyResult.surveys && surveyResult.surveys.length > 0) {
                            // Get the first active survey
                            const activeSurvey = surveyResult.surveys.find(e => e.is_active) || surveyResult.surveys[0];
                            navigate(`/evaluation/${activeSurvey.id}`);
                          } else {
                            toast.info('No survey is available for this event yet.');
                          }
                        } catch (err) {
                          toast.error('Failed to load survey. Please try again.');
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Take Survey
                    </button>
                    <button
                      onClick={() => {
                        setCertificateEventId(event.id);
                        setIsCertificateModalOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Generate Certificate
                    </button>
                    <button
                      onClick={() => handleUnregisterClick(event.id, event.title)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm col-span-2"
                    >
                      Unregister
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
      
      {/* Event Modal */}
      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        event={selectedEvent} 
      />
      
      {/* QR Code Modal */}
      <GenerateQRModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        event={qrEvent} 
      />
      
      {/* Certificate Generator Modal */}
      {isCertificateModalOpen && (
        <CertificateGenerator
          eventId={certificateEventId}
          onClose={() => {
            setIsCertificateModalOpen(false);
            setCertificateEventId(null);
          }}
        />
      )}

      {/* Unregister Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={unregisterDialog.isOpen}
        onClose={() => {
          if (!isUnregistering) {
            setUnregisterDialog({ isOpen: false, eventId: null, eventTitle: '' });
          }
        }}
        onConfirm={handleUnregister}
        title="Unregister from Event"
        message={`Are you sure you want to unregister from "${unregisterDialog.eventTitle}"? This action cannot be undone.`}
        confirmText="Unregister"
        cancelText="Cancel"
        type="danger"
        loading={isUnregistering}
      />
    </section>
    </>
  );
};
