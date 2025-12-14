import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StatisticsService } from '../../services/statisticsService';
import { SurveyService } from '../../services/surveyService';
import { Search, Calendar, FileText, Edit, Lock, Unlock, Clock, ArrowRight } from 'lucide-react';
import { useToast } from '../Toast';

export default function SurveyManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
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
        // Use Promise.all to wait for all async operations
        const flattened = await Promise.all(
          (result.events || []).map(async (event) => {
            if (event.survey) {
              // Auto-open/close surveys based on schedule when loading
              // This ensures surveys are opened/closed when the page loads
              const surveyDetails = await loadSurveyDetails(event.survey.id);
              const survey = surveyDetails || event.survey;

              return {
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.start_date,
                eventEndDate: event.end_date,
                eventVenue: event.venue,
                surveyId: survey.id,
                surveyTitle: survey.title,
                surveyDescription: survey.description,
                surveyQuestions: survey.questions || [],
                responseCount: event.responseCount || 0,
                survey: survey // Include full survey object for status checks
              };
            }
            return null;
          })
        );
        // Filter out null values
        setEventsWithSurveys(flattened.filter(item => item !== null));
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
      // getSurveyById now automatically checks and opens/closes surveys based on schedule
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
        toast.error('Failed to update survey: ' + result.error);
      } else {
        await loadEventsWithSurveys(); // Refresh the list
        // Reload survey details
        const updatedSurvey = await loadSurveyDetails(selectedSurvey.id);
        if (updatedSurvey) {
          setSelectedSurvey(updatedSurvey);
        }
        toast.success('Survey updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update survey: ' + error.message);
    }
  };

  const handleScheduleSurvey = async () => {
    if (!selectedSurvey) return;

    try {
      // Combine date and time for opens_at
      // Treat user input as local time, then convert to UTC for storage
      let opensAtCombined = null;
      if (opensAtDate) {
        if (opensAtTime) {
          // Create date from user's local time input
          // JavaScript interprets YYYY-MM-DDTHH:mm as local time
          const localDate = new Date(`${opensAtDate}T${opensAtTime}`);
          // Convert to ISO string (UTC) for database storage
          opensAtCombined = localDate.toISOString();
        } else {
          // If no time specified, use midnight local time
          const localDate = new Date(`${opensAtDate}T00:00`);
          opensAtCombined = localDate.toISOString();
        }
      } else {
        // If date is cleared, explicitly pass null to clear the schedule
        opensAtCombined = null;
      }

      // Combine date and time for closes_at
      // Treat user input as local time, then convert to UTC for storage
      let closesAtCombined = null;
      if (closesAtDate) {
        if (closesAtTime) {
          // Create date from user's local time input
          const localDate = new Date(`${closesAtDate}T${closesAtTime}`);
          // Convert to ISO string (UTC) for database storage
          closesAtCombined = localDate.toISOString();
        } else {
          // If no time specified, use end of day local time
          const localDate = new Date(`${closesAtDate}T23:59:59`);
          closesAtCombined = localDate.toISOString();
        }
      } else {
        // If date is cleared, explicitly pass null to clear the schedule
        closesAtCombined = null;
      }

      // Always call scheduleSurvey, even if both are null (to clear schedules)
      const result = await SurveyService.scheduleSurvey(
        selectedSurvey.id,
        opensAtCombined,
        closesAtCombined
      );
      if (result.error) {
        toast.error('Failed to schedule survey: ' + result.error);
      } else {
        if (opensAtCombined || closesAtCombined) {
          toast.success('Survey scheduled successfully!');
        } else {
          toast.success('Survey schedule cleared!');
        }
        await loadEventsWithSurveys();
        // Reload survey details
        const updatedSurvey = await loadSurveyDetails(selectedSurvey.id);
        if (updatedSurvey) {
          setSelectedSurvey(updatedSurvey);
          // Reset form fields to match updated survey
          // Handle date parsing to avoid timezone issues
          if (updatedSurvey.opens_at) {
            // Parse the date string and extract local date components
            const opensDate = new Date(updatedSurvey.opens_at);
            // Use local date to avoid timezone conversion
            const year = opensDate.getFullYear();
            const month = String(opensDate.getMonth() + 1).padStart(2, '0');
            const day = String(opensDate.getDate()).padStart(2, '0');
            setOpensAtDate(`${year}-${month}-${day}`);
            const hours = String(opensDate.getHours()).padStart(2, '0');
            const minutes = String(opensDate.getMinutes()).padStart(2, '0');
            setOpensAtTime(`${hours}:${minutes}`);
          } else {
            setOpensAtDate('');
            setOpensAtTime('');
          }
          if (updatedSurvey.closes_at) {
            // Parse the date string and extract local date components
            const closesDate = new Date(updatedSurvey.closes_at);
            // Use local date to avoid timezone conversion
            const year = closesDate.getFullYear();
            const month = String(closesDate.getMonth() + 1).padStart(2, '0');
            const day = String(closesDate.getDate()).padStart(2, '0');
            setClosesAtDate(`${year}-${month}-${day}`);
            const hours = String(closesDate.getHours()).padStart(2, '0');
            const minutes = String(closesDate.getMinutes()).padStart(2, '0');
            setClosesAtTime(`${hours}:${minutes}`);
          } else {
            setClosesAtDate('');
            setClosesAtTime('');
          }
        }
      }
    } catch (error) {
      toast.error('Failed to schedule survey: ' + error.message);
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
    const now = new Date();

    // Check schedule first (schedule takes precedence)
    if (survey.opens_at && new Date(survey.opens_at) > now) {
      return `Scheduled to open: ${new Date(survey.opens_at).toLocaleString()}`;
    }

    if (survey.closes_at && new Date(survey.closes_at) < now) {
      return `Closed by schedule: ${new Date(survey.closes_at).toLocaleString()}`;
    }

    // Then check manual control
    if (!survey.is_open) {
      return 'Closed by organizer';
    }

    // If open and within schedule (or no schedule), show availability
    if (survey.opens_at || survey.closes_at) {
      return 'Available (scheduled)';
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
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
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
            Evaluation Management
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
                                // Handle date parsing to avoid timezone issues
                                if (surveyDetails.opens_at) {
                                  const opensDate = new Date(surveyDetails.opens_at);
                                  // Use local date to avoid timezone conversion
                                  const year = opensDate.getFullYear();
                                  const month = String(opensDate.getMonth() + 1).padStart(2, '0');
                                  const day = String(opensDate.getDate()).padStart(2, '0');
                                  setOpensAtDate(`${year}-${month}-${day}`);
                                  const hours = String(opensDate.getHours()).padStart(2, '0');
                                  const minutes = String(opensDate.getMinutes()).padStart(2, '0');
                                  setOpensAtTime(`${hours}:${minutes}`);
                                } else {
                                  setOpensAtDate('');
                                  setOpensAtTime('');
                                }
                                if (surveyDetails.closes_at) {
                                  const closesDate = new Date(surveyDetails.closes_at);
                                  // Use local date to avoid timezone conversion
                                  const year = closesDate.getFullYear();
                                  const month = String(closesDate.getMonth() + 1).padStart(2, '0');
                                  const day = String(closesDate.getDate()).padStart(2, '0');
                                  setClosesAtDate(`${year}-${month}-${day}`);
                                  const hours = String(closesDate.getHours()).padStart(2, '0');
                                  const minutes = String(closesDate.getMinutes()).padStart(2, '0');
                                  setClosesAtTime(`${hours}:${minutes}`);
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
                    className="w-full py-3 px-4 rounded-lg font-medium bg-blue-900 hover:bg-blue-800 text-white transition-colors flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Survey
                  </button>

                  <button
                    onClick={handleToggleSurvey}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${selectedSurvey.is_open
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-900 hover:bg-blue-800 text-white'
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
                          // Don't close modal automatically - let user see the updated schedule
                        }}
                        className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-900 hover:bg-blue-800 text-white"
                      >
                        {(!opensAtDate && !closesAtDate && !selectedSurvey.opens_at && !selectedSurvey.closes_at)
                          ? 'Clear Schedule (No changes)'
                          : (!opensAtDate && !closesAtDate)
                            ? 'Clear Schedule'
                            : 'Apply Schedule'}
                      </button>

                      <p className="text-xs text-gray-500">
                        Set dates to schedule automatic opening/closing. Clear fields to remove schedule and use manual control only.
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