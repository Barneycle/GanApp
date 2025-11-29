import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StatisticsService } from '../../services/statisticsService';
import { Calendar, BarChart3, Users, TrendingUp, Search, ArrowRight } from 'lucide-react';

export const EventStatistics = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is admin or organizer
    if (user?.role !== 'admin' && user?.role !== 'organizer') {
      navigate('/');
      return;
    }

    loadEvents();
  }, [isAuthenticated, user, authLoading, navigate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await StatisticsService.getEventsWithSurveys();
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.survey?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading statistics...</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'organizer')) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6">
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Stats */}
        {events.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Events</p>
                  <p className="text-2xl font-bold text-slate-800">{events.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-green-800 text-white flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Responses</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {events.reduce((sum, e) => sum + e.responseCount, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Average Responses</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {events.length > 0 
                      ? Math.round(events.reduce((sum, e) => sum + e.responseCount, 0) / events.length)
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchTerm ? 'No events found' : 'No events with evaluation forms'}
              </h3>
              <p className="text-slate-600">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Events with active evaluation forms will appear here'}
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
                      Evaluation Form
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Responses
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => navigate(`/event-statistics/${event.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {event.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {event.survey?.title || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(event.start_date)}</span>
                          {event.start_date !== event.end_date && (
                            <span className="ml-1">- {formatDate(event.end_date)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 truncate max-w-xs">
                          {event.venue || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-600">
                          <Users className="w-4 h-4 mr-2" />
                          <span className="font-medium">{event.responseCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-blue-600">
                          <span className="text-sm font-medium mr-2">View</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
