import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';
import { usePageVisibility } from '../../hooks/usePageVisibility';

// Sample events data for placeholders
const sampleEvents = [
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    title: "Tech Conference 2025",
    rationale: "Join industry leaders and tech enthusiasts for a day of insightful talks, networking, and innovation showcases.",
    start_date: "2024-06-15",
    end_date: "2024-06-15",
    start_time: "09:00:00",
    end_time: "17:00:00",
    venue: "Grand Convention Center, Cityville",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "TechCorp" },
      { name: "InnovateX" },
      { name: "Future Solutions" }
    ],
    guest_speakers: [
      { name: "Dr. Jane Smith" },
      { name: "Mr. John Doe" },
      { name: "Prof. Emily Johnson" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440022",
    title: "Music Festival",
    rationale: "Experience the best of live music with top artists from around the world in an unforgettable weekend celebration.",
    start_date: "2024-07-20",
    end_date: "2024-07-22",
    start_time: "14:00:00",
    end_time: "23:00:00",
    venue: "Central Park Amphitheater",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "MusicPro" },
      { name: "Sound Systems Inc" }
    ],
    guest_speakers: [
      { name: "DJ Master" },
      { name: "Rock Star" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440023",
    title: "Startup Pitch Night",
    rationale: "Witness innovative startups present their groundbreaking ideas to investors and industry experts.",
    start_date: "2024-08-10",
    end_date: "2024-08-10",
    start_time: "18:00:00",
    end_time: "22:00:00",
    venue: "Innovation Hub",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Venture Capital" },
      { name: "Startup Incubator" }
    ],
    guest_speakers: [
      { name: "Angel Investor" },
      { name: "Tech Entrepreneur" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440024",
    title: "AI Summit",
    rationale: "Explore the future of artificial intelligence with leading researchers and industry pioneers.",
    start_date: "2024-09-05",
    end_date: "2024-09-07",
    start_time: "08:00:00",
    end_time: "18:00:00",
    venue: "Tech Conference Center",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "AI Research Lab" },
      { name: "Machine Learning Corp" }
    ],
    guest_speakers: [
      { name: "AI Researcher" },
      { name: "Data Scientist" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440025",
    title: "Art & Design Expo",
    rationale: "Celebrate creativity and innovation in art and design with exhibitions from talented artists worldwide.",
    start_date: "2024-10-15",
    end_date: "2024-10-20",
    start_time: "10:00:00",
    end_time: "20:00:00",
    venue: "Modern Art Gallery",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Art Foundation" },
      { name: "Creative Studios" }
    ],
    guest_speakers: [
      { name: "Famous Artist" },
      { name: "Design Expert" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440026",
    title: "Business Networking",
    rationale: "Connect with industry professionals and expand your business network in a collaborative environment.",
    start_date: "2024-11-12",
    end_date: "2024-11-12",
    start_time: "17:00:00",
    end_time: "21:00:00",
    venue: "Business Center",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Business Network" },
      { name: "Professional Group" }
    ],
    guest_speakers: [
      { name: "Business Leader" },
      { name: "Network Expert" }
    ]
  }
];

export const Events = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userRegistrations, setUserRegistrations] = useState(new Set());
  const [userRegistrationDetails, setUserRegistrationDetails] = useState(new Map());
  const [registeringEvents, setRegisteringEvents] = useState(new Set());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [eventToRegister, setEventToRegister] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [submittingCancellation, setSubmittingCancellation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'upcoming', 'past'
  const [venueFilter, setVenueFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-asc'); // 'date-asc', 'date-desc', 'title-asc', 'title-desc', 'participants-asc', 'participants-desc'
  const [showFilters, setShowFilters] = useState(false);
  const isVisible = usePageVisibility();
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current && !loadingRef.current) {
      hasLoadedRef.current = true;
      loadEvents();
      if (user) {
        loadUserRegistrations();
      }
    }
  }, [user?.id, user?.role]); // Only depend on user ID and role, not the entire user object

  const loadEvents = async () => {
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
      setError('');
      
      if (user?.role === 'organizer' || user?.role === 'admin') {
        // Load user's own events
        const result = await EventService.getEventsByCreator(user.id);
        // Only update state if page is still visible
        if (isVisible) {
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
          }
        }
      } else if (user) {
        // Load published events for authenticated participants
        const result = await EventService.getPublishedEvents();
        // Only update state if page is still visible
        if (isVisible) {
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
          }
        }
      } else {
        // Load published events for unauthenticated users
        const result = await EventService.getPublishedEvents();
        // Only update state if page is still visible
        if (isVisible) {
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
          }
        }
      }
    } catch (err) {
      // Only update error if page is still visible
      if (isVisible) {
      setError('Failed to load events. Please try again.');
      }
    } finally {
      loadingRef.current = false;
      // Only set loading to false if page is still visible
      if (isVisible) {
      setLoading(false);
      }
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      await EventService.updateEventStatus(eventId, 'published');
      
      // Reload events to show updated status
      await loadEvents();
      
      // Show success message
      setSuccessMessage('Event published successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to publish event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetFeatured = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await EventService.setFeaturedEvent(eventId);
      if (result.error) {
        setError(result.error);
      } else {
        await loadEvents();
        setSuccessModalMessage('Event set as featured successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      setError('Failed to set featured event');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfeatureEvent = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await EventService.unfeatureEvent(eventId);
      if (result.error) {
        setError(result.error);
      } else {
        await loadEvents();
        setSuccessModalMessage('Event unfeatured successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      setError('Failed to unfeature event');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRegistrations = async () => {
    if (!user) return;
    
    try {
      const result = await EventService.getUserRegistrations(user.id);
      if (result.registrations) {
        const registeredEventIds = new Set(result.registrations.map(reg => reg.event_id));
        const registrationDetailsMap = new Map(
          result.registrations.map(reg => [
            reg.event_id,
            {
              registration_date: reg.registration_date,
              registration_id: reg.id,
              status: reg.status
            }
          ])
        );
        setUserRegistrations(registeredEventIds);
        setUserRegistrationDetails(registrationDetailsMap);
      }
    } catch (err) {
    }
  };

  const formatRegistrationDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleRegisterForEvent = async (eventId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Find the event to register for
    const event = events.find(e => e.id === eventId) || sampleEvents.find(e => e.id === eventId);
    if (event) {
      setEventToRegister(event);
      setShowConfirmationModal(true);
    }
  };

  const confirmRegistration = async () => {
    if (!eventToRegister) return;

    const eventId = eventToRegister.id;
    
    // Check if this is a sample event
    const isSampleEvent = sampleEvents.some(event => event.id === eventId);
    if (isSampleEvent) {
      // For sample events, simulate registration without database call
      setSuccessModalMessage('Successfully registered for the sample event! (This is a demo registration)');
      setShowSuccessModal(true);
      setUserRegistrations(prev => new Set(prev).add(eventId));
      
      setShowConfirmationModal(false);
      setEventToRegister(null);
      return;
    }

    try {
      setRegisteringEvents(prev => new Set(prev).add(eventId));
      setError('');
      // Don't clear success message here - let it show after registration

      const result = await EventService.registerForEvent(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessModalMessage('Successfully registered for the event!');
        setShowSuccessModal(true);
        // Add to user registrations
        setUserRegistrations(prev => new Set(prev).add(eventId));
        // Add registration details
        setUserRegistrationDetails(prev => new Map(prev).set(eventId, {
          registration_date: new Date().toISOString(),
          registration_id: result.registration?.id,
          status: 'registered'
        }));
        // Reload events to update participant count
        await loadEvents();
      }
    } catch (err) {
      setError('Failed to register for event. Please try again.');
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setShowConfirmationModal(false);
      setEventToRegister(null);
    }
  };

  const handleEditEvent = (eventId) => {
    navigate(`/edit-event/${eventId}`);
  };

  const handleManageEvent = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowManageModal(true);
    }
  };

  const handleRequestCancellation = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setEventToCancel(event);
      setCancellationReason('');
      setCancellationDate('');
      setCancellationNotes('');
      setShowCancellationModal(true);
    }
  };

  const submitCancellationRequest = async () => {
    if (!eventToCancel || !user) return;

    if (!cancellationReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    if (!cancellationDate) {
      setError('Please select a cancellation date');
      return;
    }

    try {
      setSubmittingCancellation(true);
      setError('');
      
      const result = await EventService.requestEventCancellation(
        eventToCancel.id,
        user.id,
        cancellationReason.trim(),
        cancellationDate,
        cancellationNotes.trim() || undefined
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccessModalMessage('Cancellation request submitted successfully! An admin will review your request.');
        setShowSuccessModal(true);
        setShowCancellationModal(false);
        setEventToCancel(null);
        setCancellationReason('');
        setCancellationDate('');
        setCancellationNotes('');
        await loadEvents();
      }
    } catch (err) {
      setError('Failed to submit cancellation request. Please try again.');
    } finally {
      setSubmittingCancellation(false);
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
    if (!timeString) return '';
    
    // Handle both "HH:MM:SS" and "HH:MM" formats
    const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
    const [hours, minutes] = time.split(':');
    
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
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

  // Get unique venues from events
  const uniqueVenues = [...new Set(events.map(event => event.venue).filter(v => v && v !== 'Location TBD' && v.trim() !== ''))].sort();

  // Filter and sort events
  const filteredAndSortedEvents = events.filter(event => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query)) ||
        (event.rationale && event.rationale.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      if (new Date(event.start_date) < now) return false;
    } else if (dateFilter === 'past') {
      if (new Date(event.end_date) >= now) return false;
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
      case 'participants-asc':
        return (a.current_participants || 0) - (b.current_participants || 0);
      case 'participants-desc':
        return (b.current_participants || 0) - (a.current_participants || 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading events...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Error Loading Events</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadEvents}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

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
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
        </div>

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
                  placeholder="Search events by title, venue, or description..."
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
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
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
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'upcoming', 'past'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDateFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dateFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'all' ? 'All Events' : filter === 'upcoming' ? 'Upcoming' : 'Past'}
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
                    <option value="participants-asc">Participants (Fewest First)</option>
                    <option value="participants-desc">Participants (Most First)</option>
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
                Showing {filteredAndSortedEvents.length} of {events.length} events
              </div>
            </div>
          )}
        </div>

        {/* Call to Action for Unauthenticated Users */}
        {!user && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8 text-center">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Want to Join Events?</h3>
            <p className="text-slate-600 mb-4">Create an account to register for events and get updates</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/registration')}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {filteredAndSortedEvents.length === 0 && events.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md mx-auto mb-8">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No Events Found</h3>
              <p className="text-slate-600 mb-4">
                {user?.role === 'organizer' || user?.role === 'admin' 
                  ? 'You haven\'t created any events yet. Start by creating your first event!' 
                  : 'There are no published events available at the moment.'
                }
              </p>
              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <button
                  onClick={() => navigate('/create-event')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Event
                </button>
              )}
            </div>
            
            {/* Sample Events for Preview */}
            {!user || user?.role === 'participant' ? (
              <div className="text-left">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Sample Events Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
                      {/* Event Banner */}
                      {event.banner_url && (
                        <div className="h-48 overflow-hidden">
                          <img
                            src={event.banner_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Event Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-slate-800 flex-1">{event.title}</h3>
                          <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {event.status}
                          </span>
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{event.venue}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>
                              {event.current_participants || 0} registered
                              {event.max_participants && ` / ${event.max_participants} max`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Sponsors and Speakers */}
                        {event.sponsors && event.sponsors.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Sponsors:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.sponsors.map((sponsor, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {sponsor.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {event.guest_speakers && event.guest_speakers.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Speakers:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.guest_speakers.map((speaker, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {speaker.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 mt-4">
                          {/* Publish button for organizers/admins viewing their own events */}
                          {(user?.role === 'organizer' || user?.role === 'admin') && event.status === 'draft' && (
                            <button 
                              onClick={() => handlePublishEvent(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Publishing...' : 'Publish Event'}
                            </button>
                          )}
                          
                          {/* Feature Event button for organizers/admins */}
                          {(user?.role === 'organizer' || user?.role === 'admin') && (
                            <button 
                              onClick={() => event.is_featured ? handleUnfeatureEvent(event.id) : handleSetFeatured(event.id)}
                              disabled={loading}
                              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                            >
                              {event.is_featured ? '⭐ Unfeature Event' : '⭐ Feature Event'}
                            </button>
                          )}
                          
                          {/* Debug: Always show feature button for testing */}
                          <button 
                            onClick={() => alert('Feature button clicked! Event: ' + event.title)}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold border-2 border-red-800"
                          >
                            🔥 TEST FEATURE BUTTON - CLICK ME!
                          </button>
                          
                          {/* Existing registration buttons */}
                          {!user ? (
                            <div className="w-full text-center">
                              <button 
                                onClick={() => navigate('/login')}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Login to Register
                              </button>
                            </div>
                          ) : userRegistrations.has(event.id) ? (
                            <div className="w-full bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-blue-800 text-sm">You're registered for this event!</p>
                                  {userRegistrationDetails.has(event.id) && (
                                    <p className="text-xs text-blue-600">
                                      Registered on {formatRegistrationDate(userRegistrationDetails.get(event.id).registration_date)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleRegisterForEvent(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Registering...' : 'Register'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : filteredAndSortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No Events Match Your Filters</h3>
              <p className="text-slate-600 mb-4">Try adjusting your search or filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                  setVenueFilter('all');
                  setSortOption('date-asc');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
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
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'published' ? 'bg-green-100 text-green-800' :
                      event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
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
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center text-sm text-slate-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>
                        {event.current_participants || 0} registered
                        {event.max_participants && ` / ${event.max_participants} max`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Sponsors and Speakers */}
                  {event.sponsors && event.sponsors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Sponsors:</p>
                      <div className="flex flex-wrap gap-1">
                        {event.sponsors.map((sponsor, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {sponsor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {event.guest_speakers && event.guest_speakers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Speakers:</p>
                      <div className="flex flex-wrap gap-1">
                        {event.guest_speakers.map((speaker, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {speaker.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 mt-6">
                    {user?.role === 'organizer' || user?.role === 'admin' ? (
                      <>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleEditEvent(event.id)}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => event.status === 'draft' ? handlePublishEvent(event.id) : handleManageEvent(event.id)}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Publishing...' : event.status === 'draft' ? 'Publish' : 'Manage'}
                          </button>
                        </div>
                        <button 
                          onClick={() => event.is_featured ? handleUnfeatureEvent(event.id) : handleSetFeatured(event.id)}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {event.is_featured ? 'Remove Featured' : 'Set as Featured'}
                        </button>
                        {/* Request Cancellation button - only for organizers, not for cancelled events */}
                        {user?.role === 'organizer' && event.status !== 'cancelled' && (
                          <button 
                            onClick={() => handleRequestCancellation(event.id)}
                            disabled={loading}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Request Cancellation
                          </button>
                        )}
                      </>
                    ) : !user ? (
                      <div className="w-full text-center">
                        <button 
                          onClick={() => navigate('/login')}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Login to Register
                        </button>
                      </div>
                    ) : userRegistrations.has(event.id) ? (
                      <div className="w-full bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-blue-800 text-sm">You're registered for this event!</p>
                            {userRegistrationDetails.has(event.id) && (
                              <p className="text-xs text-blue-600">
                                Registered on {formatRegistrationDate(userRegistrationDetails.get(event.id).registration_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleRegisterForEvent(event.id)}
                        disabled={registeringEvents.has(event.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registeringEvents.has(event.id) ? 'Registering...' : 'Register'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration Confirmation Modal */}
      {showConfirmationModal && eventToRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Event Registration
              </h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to register for <strong>"{eventToRegister.title}"</strong>?
                {sampleEvents.some(event => event.id === eventToRegister.id) && (
                  <span className="block mt-2 text-sm text-blue-600">
                    (This is a sample event - demo registration only)
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setEventToRegister(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegistration}
                  disabled={registeringEvents.has(eventToRegister.id)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registeringEvents.has(eventToRegister.id) ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Success!
              </h3>
              <p className="text-slate-600 mb-6 text-lg">
                {successModalMessage}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessModalMessage('');
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Event Modal */}
      {showManageModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Manage Event
              </h3>
              <p className="text-slate-600">
                Manage "{selectedEvent.title}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Event Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Event Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedEvent.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>{selectedEvent.current_participants || 0}/{selectedEvent.max_participants || '∞'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(selectedEvent.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                    View Registrations
                  </button>
                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    Generate QR Code
                  </button>
                  <button className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors">
                    View Analytics
                  </button>
                </div>
              </div>
              
              {/* Event Details */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Event Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Date:</span>
                    <div>{formatDate(selectedEvent.start_date)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Time:</span>
                    <div>{selectedEvent.start_time} - {selectedEvent.end_time}</div>
                  </div>
                  <div>
                    <span className="font-medium">Venue:</span>
                    <div>{selectedEvent.venue}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedEvent(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {showCancellationModal && eventToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Request Event Cancellation
              </h3>
              <p className="text-slate-600 text-sm">
                Request to cancel "{eventToCancel.title}". An admin will review your request.
              </p>
            </div>

            <div className="space-y-4">
              {/* Cancellation Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this event..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                  required
                />
              </div>

              {/* Cancellation Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cancellation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Select when you want the event to be cancelled
                </p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={cancellationNotes}
                  onChange={(e) => setCancellationNotes(e.target.value)}
                  placeholder="Any additional information for the admin..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCancellationModal(false);
                  setEventToCancel(null);
                  setCancellationReason('');
                  setCancellationDate('');
                  setCancellationNotes('');
                  setError('');
                }}
                disabled={submittingCancellation}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={submitCancellationRequest}
                disabled={submittingCancellation || !cancellationReason.trim() || !cancellationDate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCancellation ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  );
};

const toDateInputValue = (value) => {
  if (!value) return '';
  return value.split('T')[0] || '';
};

const toTimeInputValue = (value) => {
  if (!value) return '';
  const parts = value.split(':');
  const hours = parts[0]?.padStart(2, '0') || '00';
  const minutes = parts[1]?.padStart(2, '0') || '00';
  return `${hours}:${minutes}`;
};

const extractDateTimeParts = (value) => {
  if (!value) {
    return { date: '', time: '' };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  return {
    date: date.toISOString().split('T')[0],
    time: date.toTimeString().slice(0, 5),
  };
};
