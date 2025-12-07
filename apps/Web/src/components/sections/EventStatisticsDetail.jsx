import React, { useState, useEffect, useRef } from 'react';
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
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent reloading if data has already been loaded
    if (hasLoadedRef.current) {
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Check authentication after loading is complete
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'admin' && user?.role !== 'organizer') {
      navigate('/');
      return;
    }

    if (!eventId) {
      setError('Event ID is missing');
      setLoading(false);
      return;
    }

    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadStatistics = async () => {
    if (!eventId) {
      setError('Event ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await StatisticsService.getEventStatistics(eventId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setStats(result.stats);
        hasLoadedRef.current = true;
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

  // Helper function to render HTML content safely
  const renderHTML = (html) => {
    if (!html) return '';
    return { __html: html };
  };

  // Group questions by sections
  const groupQuestionsBySections = (questionStats) => {
    const sections = [];
    let currentSection = null;
    let questionNumber = 1;

    questionStats.forEach((question) => {
      const sectionTitle = question.sectionTitle;
      const sectionDescription = question.sectionDescription;
      const sectionIndex = question.sectionIndex;

      // If this question has section info and it's different from current section, start a new section
      if (sectionTitle && (currentSection === null || currentSection.sectionIndex !== sectionIndex)) {
        currentSection = {
          sectionTitle,
          sectionDescription,
          sectionIndex,
          questions: []
        };
        sections.push(currentSection);
      } else if (!sectionTitle && currentSection === null) {
        // If no section info, create a default section
        currentSection = {
          sectionTitle: null,
          sectionDescription: null,
          sectionIndex: null,
          questions: []
        };
        sections.push(currentSection);
      } else if (!sectionTitle && currentSection && currentSection.sectionTitle) {
        // If we have a section but this question doesn't have section info, create a new default section
        currentSection = {
          sectionTitle: null,
          sectionDescription: null,
          sectionIndex: null,
          questions: []
        };
        sections.push(currentSection);
      }

      currentSection.questions.push({ ...question, globalIndex: questionNumber - 1 });
      questionNumber++;
    });

    return sections;
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

  const sections = groupQuestionsBySections(sortedQuestionStats);

  const exportQuestionData = (format) => {
    if (!stats) return;

    // Export all questions (grid rows are already expanded)
    const exportData = stats.questionStats.map(q => {
      const row = {
        Question: q.questionText,
        Type: q.questionType,
        'Total Responses': q.totalResponses,
        'Average Rating': q.averageRating?.toFixed(2) || 'N/A',
      };

      // Add each answer option as a separate column
      Object.entries(q.answerDistribution).forEach(([option, count]) => {
        row[option] = count;
      });

      return row;
    });

    if (format === 'json') {
      StatisticsService.exportAsJSON(exportData, `event-statistics-${eventId}.json`);
    } else {
      StatisticsService.exportAsCSV(exportData, `event-statistics-${eventId}.csv`);
    }
  };

  const exportResponseData = (format) => {
    if (!stats || !stats.rawResponses) return;

    // Get all questions from the survey to map question IDs to question text
    const questions = stats.survey?.questions || [];
    const questionMap = new Map();
    
    // Build a map of question IDs to question text
    questions.forEach((question, index) => {
      const questionId = question.id || question.question || `q_${index}`;
      const questionText = question.question || question.questionText || '';
      const questionType = question.type || question.questionType || '';
      const isGrid = questionType === 'multiple-choice-grid' || 
                     questionType === 'multiple_choice_grid' || 
                     questionType === 'checkbox-grid' || 
                     questionType === 'checkbox_grid';
      
      if (isGrid) {
        // For grid questions, map each row
        const rows = question.rows || [];
        rows.forEach((rowLabel) => {
          const rowQuestionId = `${questionId}_${rowLabel}`;
          questionMap.set(rowQuestionId, rowLabel);
        });
      } else {
        questionMap.set(questionId, questionText);
      }
    });

    // Export each response as a row
    const exportData = stats.rawResponses.map((responseRecord, index) => {
      const row = {
        'Response #': index + 1,
        'User ID': responseRecord.user_id || '',
        'Submitted At': responseRecord.created_at || ''
      };

      // Add each question's response as a column
      const responses = responseRecord.responses || {};
      questionMap.forEach((questionText, questionId) => {
        const response = responses[questionId];
        
        // Handle different response types
        if (response === undefined || response === null || response === '') {
          row[questionText] = '';
        } else if (Array.isArray(response)) {
          row[questionText] = response.join(', ');
        } else if (typeof response === 'object') {
          // For grid questions, format as readable key-value pairs
          const gridEntries = Object.entries(response).map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
          });
          row[questionText] = gridEntries.join('; ');
        } else {
          row[questionText] = String(response);
        }
      });

      return row;
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

  // Prepare chart data for rating questions (average ratings)
  const ratingData = stats.questionStats
    .filter(q => q.questionType === 'linear-scale' || q.questionType === 'rating' || q.questionType === 'star-rating')
    .map(q => ({
      question: q.questionText.substring(0, 30) + (q.questionText.length > 30 ? '...' : ''),
      average: q.averageRating || 0,
      responses: q.totalResponses
    }));

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

        {/* Question Statistics by Sections */}
        <div className="space-y-8 mb-8">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Section Header */}
              {section.sectionTitle && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-purple-200">
                  <h3 className="text-xl font-bold text-slate-800" dangerouslySetInnerHTML={renderHTML(section.sectionTitle)} />
                </div>
              )}
              
              {/* Grouped Bar Chart for All Questions (Google Forms Style) */}
              {section.questions.length > 0 && (() => {
                // Questions are already expanded by the statistics service (grid rows are separate questions)
                // Collect all unique answer options across all questions in this section
                const allAnswerOptions = new Set();
                section.questions.forEach(q => {
                  Object.keys(q.answerDistribution || {}).forEach(option => allAnswerOptions.add(option));
                });
                const answerOptions = Array.from(allAnswerOptions).sort((a, b) => {
                  // Try to sort by value if they're numbers
                  const aNum = parseFloat(a);
                  const bNum = parseFloat(b);
                  if (!isNaN(aNum) && !isNaN(bNum)) {
                    return bNum - aNum; // Descending order for numbers
                  }
                  // Otherwise maintain original order
                  return 0;
                });

                // Create chart data - one entry per question (rows for grids are already separate questions)
                const chartData = section.questions.map((question) => {
                  const dataPoint = {
                    item: question.questionText.length > 40 ? question.questionText.substring(0, 40) + '...' : question.questionText,
                    itemText: question.questionText,
                    questionId: question.questionId,
                    questionText: question.questionText,
                    totalResponses: question.totalResponses
                  };
                  
                  // Add value for each answer option (0 if not present)
                  answerOptions.forEach(option => {
                    dataPoint[option] = question.answerDistribution[option] || 0;
                  });
                  
                  return dataPoint;
                });

                // Get unique colors for each answer option
                const optionColors = {};
                answerOptions.forEach((option, idx) => {
                  optionColors[option] = COLORS[idx % COLORS.length];
                });

                return (
                  <div className="p-6">
                    {/* Legend */}
                    <div className="mb-6 flex flex-wrap gap-4 justify-center">
                      {answerOptions.map((option, idx) => (
                        <div key={option} className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: optionColors[option] }}
                          />
                          <span className="text-sm text-slate-700 font-medium">{option}</span>
                        </div>
                      ))}
                    </div>

                    {/* Grouped Bar Chart */}
                    {chartData.length > 0 && answerOptions.length > 0 ? (
                      <div className="mt-4">
                        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 60)}>
                          <BarChart 
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="item"
                              stroke="#64748b"
                              angle={-45}
                              textAnchor="end"
                              height={140}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis stroke="#64748b" />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value, name) => {
                                const dataPoint = chartData.find(d => d.item === name || d.itemText === name);
                                const total = dataPoint?.totalResponses || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value} (${percentage}%)`, name];
                              }}
                              labelFormatter={(label) => {
                                const dataPoint = chartData.find(d => d.item === label || d.itemText === label);
                                return dataPoint?.itemText || dataPoint?.questionText || label;
                              }}
                            />
                            {answerOptions.map((option, idx) => (
                              <Bar 
                                key={option}
                                dataKey={option}
                                fill={optionColors[option]}
                                radius={idx === answerOptions.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <p>No responses yet</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


