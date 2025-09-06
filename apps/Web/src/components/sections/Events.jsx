import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

// Sample events data for placeholders
const sampleEvents = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
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
    id: 6,
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

  useEffect(() => {
    loadEvents();
  }, []);

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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent mb-4">
            {!user ? 'Browse Events' : user?.role === 'organizer' || user?.role === 'admin' ? 'My Events' : 'Browse Events'}
          </h1>
          <p className="text-slate-600 text-xl sm:text-2xl max-w-3xl mx-auto">
            {!user 
              ? 'Discover exciting events and activities'
              : user?.role === 'organizer' || user?.role === 'admin' 
                ? 'Manage and track your created events' 
                : 'Discover and join exciting events'
            }
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

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
                          ) : (
                            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                              Register
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
                    ) : (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
