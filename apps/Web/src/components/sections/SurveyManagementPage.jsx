import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StatisticsService } from '../../services/statisticsService';
import { SurveyService } from '../../services/surveyService';
import { Search, Calendar, FileText, Edit, Lock, Unlock, Clock, ArrowRight } from 'lucide-react';

export default function SurveyManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [eventsWithSurveys, setEventsWithSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManagingAvailability, setIsManagingAvailability] = useState(false);
  const [opensAtDate, setOpensAtDate] = useState('');
  const [opensAtTime, setOpensAtTime] = useState('');
  const [closesAtDate, setClosesAtDate] = useState('');
  const [closesAtTime, setClosesAtTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Redirect if not authenticated or not an organizer
    if (!isAuthenticated || !user || user.role !== 'organizer') {
      navigate('/', { replace: true });
      return;
    }

    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadEventsWithSurveys();
    }
  }, [isAuthenticated, user, navigate]);

  const loadEventsWithSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await StatisticsService.getEventsWithSurveys();
      
      if (result.error) {
        setError(result.error);
      } else {
        // Flatten events with surveys - each survey becomes a row
        const flattened = [];
        (result.events || []).forEach(event => {
          if (event.survey) {
            // Get full survey details including opens_at, closes_at, is_open
            flattened.push({
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.start_date,
              eventEndDate: event.end_date,
              eventVenue: event.venue,
              surveyId: event.survey.id,
              surveyTitle: event.survey.title,
              surveyDescription: event.survey.description,
              surveyQuestions: event.survey.questions || [],
              responseCount: event.responseCount || 0
            });
          }
        });
        setEventsWithSurveys(flattened);
      }
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveyDetails = async (surveyId) => {
    try {
      const result = await SurveyService.getSurveyById(surveyId);
      if (!result.error && result.survey) {
        return result.survey;
      }
    } catch (err) {
      console.error('Failed to load survey details:', err);
    }
    return null;
  };


  const handleToggleSurvey = async () => {
    if (!selectedSurvey) return;
    
    try {
      const result = await SurveyService.toggleSurveyAvailability(selectedSurvey.id);
      if (result.error) {
        alert('Failed to update survey: ' + result.error);
      } else {
        await loadEventsWithSurveys(); // Refresh the list
        // Reload survey details
        const updatedSurvey = await loadSurveyDetails(selectedSurvey.id);
        if (updatedSurvey) {
          setSelectedSurvey(updatedSurvey);
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
        await loadEventsWithSurveys();
        // Reload survey details
        const updatedSurvey = await loadSurveyDetails(selectedSurvey.id);
        if (updatedSurvey) {
          setSelectedSurvey(updatedSurvey);
        }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredSurveys = eventsWithSurveys.filter(item =>
    item.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.surveyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.surveyDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              onClick={loadEventsWithSurveys}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Survey Management
          </h2>
          <p className="text-slate-600">
            Manage survey availability and settings for all events
          </p>
        </div>

            {/* Search Bar */}
            <div className="mb-6 relative z-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events or surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

        {/* Surveys Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {filteredSurveys.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {searchTerm ? 'No surveys found' : 'No surveys'}
                    </h3>
                    <p className="text-slate-600">
                      {searchTerm 
                        ? 'Try adjusting your search terms'
                        : 'No surveys have been created for any events yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Event Title
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Survey Form
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Venue
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Questions
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredSurveys.map((item) => (
                          <tr
                            key={`${item.eventId}-${item.surveyId}`}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-900">
                                {item.eventTitle}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-600">
                                {item.surveyTitle}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-slate-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{formatDate(item.eventDate)}</span>
                                {item.eventDate !== item.eventEndDate && (
                                  <span className="ml-1">- {formatDate(item.eventEndDate)}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-600 truncate max-w-xs">
                                {item.eventVenue || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-slate-600">
                                <FileText className="w-4 h-4 mr-2" />
                                <span className="font-medium">{item.surveyQuestions?.length || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-blue-600">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const surveyDetails = await loadSurveyDetails(item.surveyId);
                                    if (surveyDetails) {
                                      setSelectedSurvey(surveyDetails);
                                      if (surveyDetails.opens_at) {
                                        const opensDate = new Date(surveyDetails.opens_at);
                                        setOpensAtDate(opensDate.toISOString().split('T')[0]);
                                        setOpensAtTime(opensDate.toTimeString().slice(0, 5));
                                      } else {
                                        setOpensAtDate('');
                                        setOpensAtTime('');
                                      }
                                      if (surveyDetails.closes_at) {
                                        const closesDate = new Date(surveyDetails.closes_at);
                                        setClosesAtDate(closesDate.toISOString().split('T')[0]);
                                        setClosesAtTime(closesDate.toTimeString().slice(0, 5));
                                      } else {
                                        setClosesAtDate('');
                                        setClosesAtTime('');
                                      }
                                      setShowModal(true);
                                    }
                                  }}
                                  className="flex items-center"
                                >
                                  <span className="text-sm font-medium mr-2">Manage</span>
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

        {/* Management Modal */}
        {showModal && selectedSurvey && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedSurvey.title}
                      </h3>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSelectedSurvey(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedSurvey.description || 'No description'}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Current Status */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {selectedSurvey.is_open ? (
                          <Unlock className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {selectedSurvey.is_open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {getAvailabilityStatus(selectedSurvey)}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={() => navigate(`/edit-survey/${selectedSurvey.id}`)}
                        className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Survey
                      </button>

                      <button
                        onClick={handleToggleSurvey}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                          selectedSurvey.is_open
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {selectedSurvey.is_open ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Close Survey
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Open Survey
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setIsManagingAvailability(!isManagingAvailability)}
                        className="w-full py-2 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {isManagingAvailability ? 'Hide Schedule Options' : 'Show Schedule Options'}
                      </button>
                    </div>

                    {/* Schedule Options */}
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
                            onClick={async () => {
                              await handleScheduleSurvey();
                              setShowModal(false);
                            }}
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
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>Opens: {formatDateTime(selectedSurvey.opens_at)}</span>
                            </div>
                          )}
                          {selectedSurvey.closes_at && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>Closes: {formatDateTime(selectedSurvey.closes_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
      </div>
    </section>
  );
}