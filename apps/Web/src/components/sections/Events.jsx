import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

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
  const [registeringEvents, setRegisteringEvents] = useState(new Set());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [eventToRegister, setEventToRegister] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  useEffect(() => {
    loadEvents();
    if (user) {
      loadUserRegistrations();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (user?.role === 'organizer' || user?.role === 'admin') {
        // Load user's own events
        const result = await EventService.getEventsByCreator(user.id);
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
        }
      } else if (user) {
        // Load published events for authenticated participants
        const result = await EventService.getPublishedEvents();
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
        }
      } else {
        // Load published events for unauthenticated users
        const result = await EventService.getPublishedEvents();
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
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
      console.error('Error publishing event:', err);
      setError('Failed to publish event. Please try again.');
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
        setUserRegistrations(registeredEventIds);
      }
    } catch (err) {
      console.error('Error loading user registrations:', err);
    }
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
        // Reload events to update participant count
        await loadEvents();
      }
    } catch (err) {
      console.error('Error registering for event:', err);
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

  const handleCancelRegistration = async (eventId) => {
    if (!user) return;

    // Find the event to cancel registration for
    const event = events.find(e => e.id === eventId) || sampleEvents.find(e => e.id === eventId);
    if (event) {
      setEventToCancel(event);
      setShowCancelModal(true);
    }
  };

  const confirmCancellation = async () => {
    if (!eventToCancel) return;

    const eventId = eventToCancel.id;
    
    // Check if this is a sample event
    const isSampleEvent = sampleEvents.some(event => event.id === eventId);
    if (isSampleEvent) {
      // For sample events, simulate cancellation without database call
      setSuccessModalMessage('Registration cancelled for the sample event! (This is a demo cancellation)');
      setShowSuccessModal(true);
      setUserRegistrations(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      
      setShowCancelModal(false);
      setEventToCancel(null);
      return;
    }

    try {
      setRegisteringEvents(prev => new Set(prev).add(eventId));
      setError('');
      // Don't clear success message here - let it show after cancellation

      const result = await EventService.cancelEventRegistration(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessModalMessage('Registration cancelled successfully!');
        setShowSuccessModal(true);
        // Remove from user registrations
        setUserRegistrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
        // Reload events to update participant count
        await loadEvents();
      }
    } catch (err) {
      console.error('Error cancelling registration:', err);
      setError('Failed to cancel registration. Please try again.');
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setShowCancelModal(false);
      setEventToCancel(null);
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
    return timeString;
  };

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
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
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
        {events.length === 0 ? (
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
                          <p className="text-slate-600 mb-4 line-clamp-3">{event.rationale}</p>
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
                        <div className="flex space-x-2 mt-4">
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
                            <button 
                              onClick={() => handleCancelRegistration(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Cancelling...' : 'Cancel Registration'}
                            </button>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
                {/* Event Banner */}
                {event.banner_url && (
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">Event Banner</span>
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
                    <p className="text-slate-600 mb-4 line-clamp-3">{event.rationale}</p>
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
                  <div className="flex space-x-2 mt-4">
                    {user?.role === 'organizer' || user?.role === 'admin' ? (
                      <>
                        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          Edit
                        </button>
                        <button 
                          onClick={() => event.status === 'draft' ? handlePublishEvent(event.id) : null}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Publishing...' : event.status === 'draft' ? 'Publish' : 'Manage'}
                        </button>
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
                      <button 
                        onClick={() => handleCancelRegistration(event.id)}
                        disabled={registeringEvents.has(event.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registeringEvents.has(event.id) ? 'Cancelling...' : 'Cancel Registration'}
                      </button>
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

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && eventToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Registration Cancellation
              </h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to cancel your registration for <strong>"{eventToCancel.title}"</strong>?
                {sampleEvents.some(event => event.id === eventToCancel.id) && (
                  <span className="block mt-2 text-sm text-blue-600">
                    (This is a sample event - demo cancellation only)
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setEventToCancel(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Keep Registration
                </button>
                <button
                  onClick={confirmCancellation}
                  disabled={registeringEvents.has(eventToCancel.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registeringEvents.has(eventToCancel.id) ? 'Cancelling...' : 'Cancel Registration'}
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
    </section>
  );
};
