import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StatisticsService } from '../../services/statisticsService';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Area, AreaChart
} from 'recharts';
import { ArrowLeft, Download, FileJson, FileSpreadsheet, TrendingUp, Users, MessageSquare, Star } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export const EventStatisticsDetail = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'admin' && user?.role !== 'organizer') {
      navigate('/');
      return;
    }

    if (eventId) {
      loadStatistics();
    }
  }, [eventId, isAuthenticated, user, authLoading, navigate]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await StatisticsService.getEventStatistics(eventId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setStats(result.stats);
      }
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedQuestionStats = stats?.questionStats ? [...stats.questionStats].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  }) : [];

  const exportQuestionData = (format) => {
    if (!stats) return;

    const exportData = stats.questionStats.map(q => ({
      Question: q.questionText,
      Type: q.questionType,
      'Total Responses': q.totalResponses,
      'Average Rating': q.averageRating?.toFixed(2) || 'N/A',
      'Answer Distribution': JSON.stringify(q.answerDistribution)
    }));

    if (format === 'json') {
      StatisticsService.exportAsJSON(exportData, `event-statistics-${eventId}.json`);
    } else {
      StatisticsService.exportAsCSV(exportData, `event-statistics-${eventId}.csv`);
    }
  };

  const exportResponseData = (format) => {
    if (!stats) return;

    // Flatten all responses for export
    const exportData = [];
    stats.questionStats.forEach(q => {
      q.responses.forEach((response, idx) => {
        exportData.push({
          Question: q.questionText,
          'Question Type': q.questionType,
          Response: Array.isArray(response) ? response.join(', ') : String(response),
          'Response Index': idx + 1
        });
      });
    });

    if (format === 'json') {
      StatisticsService.exportAsJSON(exportData, `event-responses-${eventId}.json`);
    } else {
      StatisticsService.exportAsCSV(exportData, `event-responses-${eventId}.csv`);
    }
  };

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

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/event-statistics')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Statistics
          </button>
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const ratingData = stats.questionStats
    .filter(q => q.questionType === 'linear-scale' || q.questionType === 'rating' || q.questionType === 'star-rating')
    .map(q => ({
      question: q.questionText.substring(0, 30) + (q.questionText.length > 30 ? '...' : ''),
      average: q.averageRating || 0,
      responses: q.totalResponses
    }));

  const responseTrendData = stats.questionStats
    .map((q, idx) => ({
      question: `Q${idx + 1}`,
      responses: q.totalResponses
    }))
    .sort((a, b) => b.responses - a.responses);

  // Pie chart data for multiple choice questions
  const multipleChoiceData = stats.questionStats
    .filter(q => q.questionType === 'multiple-choice' || q.questionType === 'multiple_choice')
    .flatMap(q => 
      Object.entries(q.answerDistribution).map(([name, value]) => ({
        question: q.questionText.substring(0, 20),
        name,
        value
      }))
    );

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/event-statistics')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Statistics
          </button>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            {stats.event.title}
          </h1>
          <p className="text-slate-600 text-lg">
            {stats.survey.title}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Responses</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalResponses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-green-800 text-white flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Response Rate</p>
                <p className="text-2xl font-bold text-slate-800">{stats.responseRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Participants</p>
                <p className="text-2xl font-bold text-slate-800">{stats.participantCount}</p>
              </div>
            </div>
          </div>

          {stats.satisfactionRate !== undefined && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-800 text-white flex items-center justify-center">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Satisfaction</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.satisfactionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => exportQuestionData('json')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
          >
            <FileJson className="w-4 h-4" />
            <span>Export Questions (JSON)</span>
          </button>
          <button
            onClick={() => exportQuestionData('csv')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Questions (CSV)</span>
          </button>
          <button
            onClick={() => exportResponseData('json')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
          >
            <FileJson className="w-4 h-4" />
            <span>Export Responses (JSON)</span>
          </button>
          <button
            onClick={() => exportResponseData('csv')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Responses (CSV)</span>
          </button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Response Trend Chart */}
          {responseTrendData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
                <h3 className="text-xl font-semibold text-slate-800">Response Distribution by Question</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="responses" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Rating Average Chart */}
          {ratingData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-slate-50 px-6 py-4 border-b border-slate-100">
                <h3 className="text-xl font-semibold text-slate-800">Average Ratings</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" stroke="#64748b" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#64748b" domain={[0, 5]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="average" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Multiple Choice Distribution */}
          {multipleChoiceData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-slate-50 px-6 py-4 border-b border-slate-100">
                <h3 className="text-xl font-semibold text-slate-800">Multiple Choice Distribution</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={multipleChoiceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {multipleChoiceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Question Statistics Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Question Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('questionText')}
                  >
                    Question
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('questionType')}
                  >
                    Type
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('totalResponses')}
                  >
                    Responses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Distribution
                  </th>
                  {stats.questionStats.some(q => q.averageRating) && (
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('averageRating')}
                    >
                      Avg Rating
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {sortedQuestionStats.map((question, index) => (
                  <tr key={question.questionId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {index + 1}. {question.questionText}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {question.questionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {question.totalResponses}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {Object.keys(question.answerDistribution).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(question.answerDistribution)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div key={key} className="flex items-center">
                                  <span className="w-24 truncate">{key}:</span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              ))}
                            {Object.keys(question.answerDistribution).length > 3 && (
                              <span className="text-xs text-slate-500">
                                +{Object.keys(question.answerDistribution).length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No responses</span>
                        )}
                      </div>
                    </td>
                    {stats.questionStats.some(q => q.averageRating) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {question.averageRating ? question.averageRating.toFixed(2) : 'N/A'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};


