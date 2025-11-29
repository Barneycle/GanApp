import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';
import { SurveyService } from '../../services/surveyService';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, MapPin, Clock, ArrowLeft, Star, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const Evaluation = () => {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [hasCheckedSubmission, setHasCheckedSubmission] = useState(false);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Check authentication after loading is complete
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'participant') {
      navigate('/');
      return;
    }

    if (!surveyId) {
      setError('Survey ID is missing');
      setLoading(false);
      return;
    }

    loadData();

    // Timeout to ensure form shows even if loading takes too long (5 seconds max)
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, isAuthenticated, user, authLoading, navigate]);

  const loadData = async () => {
    if (!surveyId) {
      setError('Survey ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAlreadySubmitted(false); // Reset this state
      setHasCheckedSubmission(false); // Reset check flag
      
      console.log('Loading survey:', surveyId);
      
      // Load survey by ID first (needed even if already submitted for certificate generation)
      const surveyResult = await SurveyService.getSurveyById(surveyId);
      console.log('Survey result:', surveyResult);
      if (surveyResult.error) {
        console.error('Error loading survey:', surveyResult.error);
        setError(surveyResult.error || 'Survey not found');
        setLoading(false);
        setHasCheckedSubmission(true);
        return;
      } else if (surveyResult.survey) {
        const loadedSurvey = surveyResult.survey;
        setSurvey(loadedSurvey);
        
        // Load event for this survey
        if (loadedSurvey.event_id) {
          const eventResult = await EventService.getEventById(loadedSurvey.event_id);
          console.log('Event result:', eventResult);
          if (eventResult.error) {
            console.error('Error loading event:', eventResult.error);
            // Don't set error, just log it - event is optional for display
          } else {
            setEvent(eventResult.event);
          }
        }
      } else {
        setError('Survey not found.');
        setHasCheckedSubmission(true);
      }
      
      // Check if user has already submitted a response (after loading survey)
      if (user?.id) {
        const { data: existingResponse, error: responseCheckError } = await supabase
          .from('survey_responses')
          .select('id')
          .eq('survey_id', surveyId)
          .eq('user_id', user.id)
          .single();

        if (existingResponse) {
          setAlreadySubmitted(true);
          setHasCheckedSubmission(true);
          setLoading(false);
          return;
        }
        // If error is not "not found", log it but continue
        if (responseCheckError && responseCheckError.code !== 'PGRST116') {
          console.error('Error checking existing response:', responseCheckError);
        }
      }
      
      // Mark that we've checked submission status
      setHasCheckedSubmission(true);

      // Initialize responses object (only if not already submitted)
      const initialResponses = {};
      if (surveyResult.survey?.questions && Array.isArray(surveyResult.survey.questions)) {
        surveyResult.survey.questions.forEach((question, index) => {
          const qId = question.id || question.question || `q_${index}`;
          initialResponses[qId] = '';
        });
      }
      console.log('Initial responses:', initialResponses);
      setResponses(initialResponses);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load survey details');
      setHasCheckedSubmission(true);
    } finally {
      setLoading(false);
      console.log('Loading complete. Survey:', survey, 'Error:', error);
    }
  };

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    setResponses(prev => {
      const current = prev[questionId] || [];
      const newValue = Array.isArray(current) ? [...current] : [];
      
      if (checked) {
        if (!newValue.includes(option)) {
          newValue.push(option);
        }
      } else {
        const index = newValue.indexOf(option);
        if (index > -1) {
          newValue.splice(index, 1);
        }
      }
      
      return {
        ...prev,
        [questionId]: newValue
      };
    });
  };

  const validateForm = () => {
    if (!survey || !survey.questions) {
      return 'Survey is not loaded';
    }

    for (const question of survey.questions) {
      if (question.required) {
        const response = responses[question.id || question.question];
        if (!response || (Array.isArray(response) && response.length === 0)) {
          return `Please answer the required question: ${question.question || question.questionText}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Submit survey response to database
      const { data, error: submitError } = await supabase
        .from('survey_responses')
        .insert([{
          survey_id: survey.id,
          user_id: user.id,
          responses: responses
        }])
        .select()
        .single();

      if (submitError) {
        throw new Error(submitError.message || 'Failed to submit evaluation');
      }
      
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/my-events');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation. Please try again.');
    } finally {
      setSubmitting(false);
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

  const renderQuestion = (question, index) => {
    const questionId = question.id || `q_${index}`;
    const questionText = question.question || question.questionText;
    const questionType = question.type || question.questionType;
    const isRequired = question.required || false;
    const options = question.options || [];
    const currentResponse = responses[questionId] || '';

    switch (questionType) {
      case 'short-answer':
      case 'text':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your answer here..."
              required={isRequired}
            />
          </div>
        );

      case 'paragraph':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Type your detailed answer here..."
              required={isRequired}
            />
          </div>
        );

      case 'multiple-choice':
      case 'multiple_choice':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-3">
              {options.map((option, optIndex) => (
                <label key={optIndex} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={questionId}
                    value={option}
                    checked={currentResponse === option}
                    onChange={(e) => handleResponseChange(questionId, e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    required={isRequired}
                  />
                  <span className="text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-3">
              {options.map((option, optIndex) => {
                const checked = Array.isArray(currentResponse) && currentResponse.includes(option);
                return (
                  <label key={optIndex} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleCheckboxChange(questionId, option, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'dropdown':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={isRequired}
            >
              <option value="">Select an option...</option>
              {options.map((option, optIndex) => (
                <option key={optIndex} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'linear-scale':
      case 'rating':
        const scaleMin = question.min_rating || question.scaleMin || 1;
        const scaleMax = question.max_rating || question.scaleMax || 5;
        const lowestLabel = question.lowestLabel || '';
        const highestLabel = question.highestLabel || '';
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{lowestLabel || `${scaleMin}`}</span>
                <span>{highestLabel || `${scaleMax}`}</span>
              </div>
              <div className="flex items-center justify-between space-x-2">
                {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((value) => (
                  <label key={value} className="flex flex-col items-center space-y-2 cursor-pointer">
                    <input
                      type="radio"
                      name={questionId}
                      value={value}
                      checked={parseInt(currentResponse) === value}
                      onChange={(e) => handleResponseChange(questionId, e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      required={isRequired}
                    />
                    <span className="text-sm text-slate-700">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'star-rating':
        const starMin = question.scaleMin || 1;
        const starMax = question.scaleMax || 5;
        const starValue = parseInt(currentResponse) || 0;
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center space-x-1">
              {Array.from({ length: starMax }, (_, i) => i + 1).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleResponseChange(questionId, star.toString())}
                  className={`transition-all duration-200 ${
                    starValue >= star
                      ? 'text-yellow-400 scale-110'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      starValue >= star ? 'fill-current' : ''
                    }`}
                  />
                </button>
              ))}
              {starValue > 0 && (
                <span className="ml-2 text-sm text-slate-600">
                  {starValue} / {starMax}
                </span>
              )}
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={isRequired}
            />
          </div>
        );

      case 'time':
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="time"
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={isRequired}
            />
          </div>
        );

      default:
        return (
          <div key={questionId} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {questionText} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={currentResponse}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your answer here..."
              required={isRequired}
            />
          </div>
        );
    }
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </section>
    );
  }

  // Check authentication after loading is complete
  if (!isAuthenticated || user?.role !== 'participant') {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h3>
            <p className="text-red-800 mb-6">
              {!isAuthenticated 
                ? 'You must be logged in to submit an evaluation.'
                : 'Only participants can submit evaluations.'}
            </p>
            <button 
              onClick={() => navigate(!isAuthenticated ? '/login' : '/my-events')} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              {!isAuthenticated ? 'Go to Login' : 'Back to My Events'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Show loading while checking auth, loading data, or checking if already submitted
  // Also show loading if we haven't checked submission status yet
  if (loading || !hasCheckedSubmission) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading survey...</p>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Thank You!</h3>
            <p className="text-slate-600 mb-6">Your evaluation has been submitted successfully.</p>
            <p className="text-sm text-slate-500">Redirecting to My Events...</p>
          </div>
        </motion.div>
      </section>
    );
  }

  if (alreadySubmitted) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-orange-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Evaluation Already Taken</h3>
            <p className="text-slate-600 mb-8">
              You have already submitted an evaluation for this survey. Thank you for your feedback!
            </p>
            <div className="flex flex-col gap-4 items-center">
              {survey?.event_id && (
                <button 
                  onClick={() => navigate(`/certificate?eventId=${survey.event_id}`)} 
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold text-base shadow-md hover:shadow-lg"
                >
                  Generate Certificate
                </button>
              )}
              <button 
                onClick={() => navigate('/my-events')} 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-semibold text-base shadow-md hover:shadow-lg"
              >
                Back to My Events
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!survey) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-yellow-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-yellow-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Survey Available</h3>
            <p className="text-slate-600 mb-6">{error || 'No survey is available for this event yet.'}</p>
            <button 
              onClick={() => navigate('/my-events')} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Back to My Events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/my-events')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Events
          </button>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-slate-600 text-lg">
              {survey.description}
            </p>
          )}
        </div>

        {/* Event Info Card */}
        {event && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{event.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-slate-600">
                <Calendar className="w-5 h-5 mr-2" />
                <span>{formatDate(event.start_date)}</span>
                {event.start_date !== event.end_date && (
                  <span className="ml-1">- {formatDate(event.end_date)}</span>
                )}
              </div>
              
              <div className="flex items-center text-slate-600">
                <Clock className="w-5 h-5 mr-2" />
                <span>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </span>
              </div>
              
              {event.venue && (
                <div className="flex items-center text-slate-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Survey Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            {survey.questions && survey.questions.length > 0 ? (
              survey.questions.map((question, index) => (
                <div key={question.id || index} className="mb-8">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      {renderQuestion(question, index)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No questions in this survey.</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={() => navigate('/my-events')}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
