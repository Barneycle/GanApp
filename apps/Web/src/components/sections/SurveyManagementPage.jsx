import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';
import { SurveyService } from '../../services/surveyService';

export default function SurveyManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isManagingAvailability, setIsManagingAvailability] = useState(false);
  const [opensAtDate, setOpensAtDate] = useState('');
  const [opensAtTime, setOpensAtTime] = useState('');
  const [closesAtDate, setClosesAtDate] = useState('');
  const [closesAtTime, setClosesAtTime] = useState('');

  useEffect(() => {
    // Redirect if not authenticated or not an organizer
    if (!isAuthenticated || !user || user.role !== 'organizer') {
      navigate('/', { replace: true });
      return;
    }

    loadEvents();
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (selectedEventId) {
      loadSurveys();
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await EventService.getPublishedEvents();
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
        // Auto-select first event if available
        if (result.events && result.events.length > 0) {
          setSelectedEventId(result.events[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadSurveys = async () => {
    try {
      setSurveysLoading(true);
      const result = await SurveyService.getSurveysByEvent(selectedEventId);
      
      if (result.error) {
        console.error('Failed to load surveys:', result.error);
        setSurveys([]);
      } else {
        setSurveys(result.surveys || []); 
        // Auto-select first survey if available
        if (result.surveys && result.surveys.length > 0 && !selectedSurvey) {
          setSelectedSurvey(result.surveys[0]);
          const survey = result.surveys[0];
          
          // Set opens at date and time
          if (survey.opens_at) {
            const opensDate = new Date(survey.opens_at);
            setOpensAtDate(opensDate.toISOString().split('T')[0]);
            setOpensAtTime(opensDate.toTimeString().slice(0, 5));
          } else {
            setOpensAtDate('');
            setOpensAtTime('');
          }
          
          // Set closes at date and time
          if (survey.closes_at) {
            const closesDate = new Date(survey.closes_at);
            setClosesAtDate(closesDate.toISOString().split('T')[0]);
            setClosesAtTime(closesDate.toTimeString().slice(0, 5));
          } else {
            setClosesAtDate('');
            setClosesAtTime('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load surveys:', err);
      setSurveys([]);
    } finally {
      setSurveysLoading(false);
    }
  };

  const handleEventSelect = (eventId) => {
    setSelectedEventId(eventId);
        setSelectedSurvey(null);
    // Don't clear surveys array - let useEffect handle loading
  };

  const handleSurveySelect = (survey) => {
    setSelectedSurvey(survey);
    
    // Set opens at date and time
    if (survey.opens_at) {
      const opensDate = new Date(survey.opens_at);
      setOpensAtDate(opensDate.toISOString().split('T')[0]);
      setOpensAtTime(opensDate.toTimeString().slice(0, 5));
    } else {
      setOpensAtDate('');
      setOpensAtTime('');
    }
    
    // Set closes at date and time
    if (survey.closes_at) {
      const closesDate = new Date(survey.closes_at);
      setClosesAtDate(closesDate.toISOString().split('T')[0]);
      setClosesAtTime(closesDate.toTimeString().slice(0, 5));
    } else {
      setClosesAtDate('');
      setClosesAtTime('');
    }
    
    setIsManagingAvailability(false);
  };

  const handleToggleSurvey = async () => {
    if (!selectedSurvey) return;
    
    try {
      const result = await SurveyService.toggleSurveyAvailability(selectedSurvey.id);
      if (result.error) {
        alert('Failed to update survey: ' + result.error);
      } else {
        await loadSurveys(); // Refresh the list
        // Update selected survey with new state
        const updatedSurvey = surveys.find(e => e.id === selectedSurvey.id);
        if (updatedSurvey) {
          setSelectedSurvey({ ...updatedSurvey, is_open: result.isOpen });
        }
      }
    } catch (error) {
      alert('Failed to update survey: ' + error.message);
    }
  };

  const handleScheduleSurvey = async () => {
    if (!selectedSurvey) return;
    
    try {
      // Combine date and time for opens_at
      let opensAtCombined = null;
      if (opensAtDate && opensAtTime) {
        opensAtCombined = new Date(`${opensAtDate}T${opensAtTime}`).toISOString();
      } else if (opensAtDate) {
        opensAtCombined = new Date(`${opensAtDate}T00:00`).toISOString();
      }
      
      // Combine date and time for closes_at
      let closesAtCombined = null;
      if (closesAtDate && closesAtTime) {
        closesAtCombined = new Date(`${closesAtDate}T${closesAtTime}`).toISOString();
      } else if (closesAtDate) {
        closesAtCombined = new Date(`${closesAtDate}T23:59`).toISOString();
      }
      
      const result = await SurveyService.scheduleSurvey(
        selectedSurvey.id,
        opensAtCombined,
        closesAtCombined
      );
      if (result.error) {
        alert('Failed to schedule survey: ' + result.error);
      } else {
        alert('Survey scheduled successfully!');
        await loadSurveys();
      }
    } catch (error) {
      alert('Failed to schedule survey: ' + error.message);
    }
  };

  const getStatusBadge = (survey) => {
    if (!survey.is_active) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Inactive</span>;
    }
    if (!survey.is_open) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Closed</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Open</span>;
  };

  const getAvailabilityStatus = (survey) => {
    if (!survey.is_open) return 'Closed by organizer';
    
    const now = new Date();
    
    if (survey.opens_at && new Date(survey.opens_at) > now) {
      return `Opens ${new Date(survey.opens_at).toLocaleString()}`;
    }
    
    if (survey.closes_at && new Date(survey.closes_at) < now) {
      return `Closed ${new Date(survey.closes_at).toLocaleString()}`;
    }
    
    return 'Available now';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading events...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Events</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show no events state
  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-yellow-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-yellow-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Events Found</h3>
            <p className="text-slate-600 mb-4">You don't have any published events yet. Create an event first to manage surveys.</p>
            <a
              href="/create-event"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Event
            </a>
          </div>
        </div>
      </div>
    );
  }

  const selectedEvent = events.find(event => event.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            Survey Management
          </h1>
          <p className="text-slate-600 text-lg">
            Manage survey availability and settings for your events
          </p>
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventSelect(event.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedEventId === event.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium text-gray-900 mb-1">{event.title}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(event.start_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{event.venue}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Survey Management */}
        {selectedEvent && (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Survey Management - {selectedEvent.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage survey availability and settings
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {surveys.length} survey{surveys.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {surveysLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading surveys...</span>
              </div>
            ) : surveys.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-6">
                <div className="flex">
                  <div className="text-yellow-400">📝</div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">No Surveys</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      No surveys have been created for this event yet.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row">
                {/* Survey List - Left Side */}
                <div className="lg:w-1/2 border-r border-gray-200">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700">Select Survey</h3>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {surveys.map((survey) => (
                      <div
                        key={survey.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
                          selectedSurvey?.id === survey.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleSurveySelect(survey)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {survey.title}
                              </h4>
                              {getStatusBadge(survey)}
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {survey.description || 'No description'}
                            </p>
                            <div className="flex items-center space-x-3 mt-2">
                              <span className="text-xs text-gray-500">
                                {survey.questions?.length || 0} questions
                              </span>
                              <span className="text-xs text-gray-500">
                                {survey.is_open ? '🔓' : '🔒'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Survey Controls - Right Side */}
                <div className="lg:w-1/2 p-6">
                  {selectedSurvey ? (
                    <div className="space-y-6">
                      {/* Survey Info */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {selectedSurvey.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {selectedSurvey.description || 'No description'}
                        </p>
                        
                        {/* Current Status */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{selectedSurvey.is_open ? '🔓' : '🔒'}</span>
                            <span className="font-medium text-gray-900">
                              {selectedSurvey.is_open ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getAvailabilityStatus(selectedSurvey)}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-4">
                        <button
                          onClick={() => navigate(`/edit-survey/${selectedSurvey.id}`)}
                          className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Edit Survey
                        </button>

                        <button
                          onClick={handleToggleSurvey}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                            selectedSurvey.is_open
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {selectedSurvey.is_open ? 'Close Survey' : 'Open Survey'}
                        </button>

                        <button
                          onClick={() => setIsManagingAvailability(!isManagingAvailability)}
                          className="w-full py-2 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {isManagingAvailability ? 'Hide Schedule Options' : 'Show Schedule Options'}
                        </button>
                      </div>

                      {/* Schedule Options (Collapsible) */}
                      {isManagingAvailability && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Schedule Survey</h4>
                          
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Opens At:
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpensAtDate('');
                                    setOpensAtTime('');
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                  Clear
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="date"
                                  value={opensAtDate}
                                  onChange={(e) => setOpensAtDate(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="time"
                                  value={opensAtTime}
                                  onChange={(e) => setOpensAtTime(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              {selectedSurvey.opens_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Currently: {formatDateTime(selectedSurvey.opens_at)}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Closes At:
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosesAtDate('');
                                    setClosesAtTime('');
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                  Clear
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="date"
                                  value={closesAtDate}
                                  onChange={(e) => setClosesAtDate(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="time"
                                  value={closesAtTime}
                                  onChange={(e) => setClosesAtTime(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              {selectedSurvey.closes_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Currently: {formatDateTime(selectedSurvey.closes_at)}
                                </p>
                              )}
                            </div>
                            
                            <button
                              onClick={handleScheduleSurvey}
                              disabled={!opensAtDate && !closesAtDate}
                              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                                (!opensAtDate && !closesAtDate)
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              Apply Schedule
                            </button>
                            
                            <p className="text-xs text-gray-500">
                              Leave fields empty to use manual open/close control only
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Current Schedule Info */}
                      {(selectedSurvey.opens_at || selectedSurvey.closes_at) && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Schedule</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {selectedSurvey.opens_at && (
                              <p>📅 Opens: {formatDateTime(selectedSurvey.opens_at)}</p>
                            )}
                            {selectedSurvey.closes_at && (
                              <p>📅 Closes: {formatDateTime(selectedSurvey.closes_at)}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📝</div>
                        <p>Select an survey to manage</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}