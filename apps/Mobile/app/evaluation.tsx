import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { showSuccess } from '../lib/sweetAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SurveyService, Survey } from '../lib/surveyService';
import { EventService } from '../lib/eventService';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import RenderHTML from 'react-native-render-html';
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles } from '../lib/htmlUtils';
import TutorialOverlay from '../components/TutorialOverlay';

interface Question {
  id?: string;
  question?: string;
  questionText?: string;
  type?: string;
  questionType?: string;
  question_type?: string;
  required?: boolean;
  options?: string[];
  rows?: string[];
  columns?: string[];
  min_rating?: number;
  max_rating?: number;
  scaleMin?: number;
  scaleMax?: number;
  lowestLabel?: string;
  highestLabel?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionIndex?: number;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue?: string;
}

export default function Evaluation() {
  const router = useRouter();
  const { id: surveyId } = useLocalSearchParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [hasCheckedSubmission, setHasCheckedSubmission] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const isMountedRef = useRef(false);

  // Safe navigation helpers
  const safeNavigate = (navigationFn: () => void) => {
    try {
      if (isMountedRef.current) {
        navigationFn();
      }
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  const handleBack = () => {
    safeNavigate(() => router.back());
  };

  const handleNavigateToMyEvents = () => {
    safeNavigate(() => router.replace('/(tabs)/my-events'));
  };


  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }

    // Use setTimeout to ensure navigation context is ready
    const timer = setTimeout(() => {
      if (!user?.id) {
        // Only navigate if component is still mounted
        if (isMountedRef.current) {
          safeNavigate(() => router.replace('/login'));
        }
        return;
      }
      
      if (user?.role !== 'participant') {
        // Only navigate if component is still mounted
        if (isMountedRef.current) {
          safeNavigate(() => router.replace('/'));
        }
        return;
      }

      if (!surveyId) {
        setError('Survey ID is missing');
        setLoading(false);
        return;
      }

      // Load data and check if already submitted
      loadData();
    }, 150); // Small delay to ensure navigation context is ready

    return () => clearTimeout(timer);
  }, [surveyId, user, authLoading]);

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
      
      // Load survey by ID first (needed even if already submitted for certificate generation)
      const surveyResult = await SurveyService.getSurveyById(surveyId);
      if (surveyResult.error) {
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
          if (eventResult.error) {
            console.error('Error loading event:', eventResult.error);
            // Don't set error, just log it - event is optional for display
          } else {
            setEvent(eventResult.event);
          }
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
            return; // Exit early - don't initialize form
          }
          // If error is not "not found", log it but continue
          if (responseCheckError && responseCheckError.code !== 'PGRST116') {
            console.error('Error checking existing response:', responseCheckError);
          }
        }
        
        // Mark that we've checked submission status
        setHasCheckedSubmission(true);
        
        // Only initialize responses if not already submitted
        const initialResponses: Record<string, any> = {};
        if (loadedSurvey.questions && Array.isArray(loadedSurvey.questions)) {
          loadedSurvey.questions.forEach((question, index) => {
            const qId = question.id || question.question || `q_${index}`;
            const questionType = question.questionType || question.type || question.question_type || '';
            // Initialize based on question type
            if (questionType === 'checkbox' || questionType === 'checkbox-grid' || questionType === 'checkbox_grid') {
              initialResponses[qId] = [];
            } else if (questionType === 'multiple-choice-grid' || questionType === 'multiple_choice_grid') {
              initialResponses[qId] = {};
            } else {
              initialResponses[qId] = '';
            }
          });
        }
        setResponses(initialResponses);
      } else {
        setError('Survey not found.');
        setHasCheckedSubmission(true);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load survey details');
      setHasCheckedSubmission(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
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
        const questionId = question.id || question.question || '';
        const response = responses[questionId];
        const questionType = question.questionType || question.type || question.question_type || '';
        
        // Check if response is empty based on question type
        let isEmpty = false;
        if (questionType === 'checkbox' || questionType === 'checkbox-grid' || questionType === 'checkbox_grid') {
          isEmpty = !response || (Array.isArray(response) && response.length === 0);
        } else if (questionType === 'multiple-choice-grid' || questionType === 'multiple_choice_grid') {
          isEmpty = !response || (typeof response === 'object' && Object.keys(response).length === 0);
        } else {
          isEmpty = !response || response === '';
        }
        
        if (isEmpty) {
          return `Please answer the required question: ${question.question || question.questionText}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (!survey || !user?.id) {
        throw new Error('Survey or user data is missing');
      }

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
      
      // Show success alert
      showSuccess(
        'Evaluation Submitted Successfully!',
        'Thank you for your feedback.',
        () => {
          // Navigate back to my-events
          setTimeout(() => {
            handleNavigateToMyEvents();
          }, 100);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderQuestion = (question: Question, index: number) => {
    const questionId = question.id || `q_${index}`;
    const questionText = question.question || question.questionText || '';
    // Check all possible field names for question type (matching web version)
    const questionType = question.questionType || question.type || question.question_type || '';
    const isRequired = question.required || false;
    const options = question.options || [];
    const currentResponse = responses[questionId] || '';
    
    // Debug logging
    if (!questionType) {
      console.warn('Question type not found for question:', question);
    }

    switch (questionType) {
      case 'short-answer':
      case 'text':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <TextInput
              value={typeof currentResponse === 'string' ? currentResponse : ''}
              onChangeText={(text) => handleResponseChange(questionId, text)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base text-gray-700 bg-white"
              placeholder="Type your answer here..."
            />
          </View>
        );

      case 'paragraph':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <TextInput
              value={typeof currentResponse === 'string' ? currentResponse : ''}
              onChangeText={(text) => handleResponseChange(questionId, text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base text-gray-700 bg-white min-h-[100px]"
              placeholder="Type your detailed answer here..."
            />
          </View>
        );

      case 'multiple-choice':
      case 'multiple_choice':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <View className="space-y-3">
              {options.map((option, optIndex) => (
                <TouchableOpacity
                  key={optIndex}
                  onPress={() => handleResponseChange(questionId, option)}
                  className={`flex-row items-center p-3 rounded-md border ${
                    currentResponse === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    currentResponse === option
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {currentResponse === option && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text className={`text-base ${
                    currentResponse === option
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'checkbox':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <View className="space-y-3">
              {options.map((option, optIndex) => {
                const checked = Array.isArray(currentResponse) && currentResponse.includes(option);
                return (
                  <TouchableOpacity
                    key={optIndex}
                    onPress={() => handleCheckboxChange(questionId, option, !checked)}
                    className="flex-row items-center p-4 rounded-md border border-gray-300 bg-white"
                  >
                    <View className={`w-6 h-6 rounded border-2 mr-4 items-center justify-center ${
                      checked
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-400'
                    }`}>
                      {checked && (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      )}
                    </View>
                    <Text className="text-lg flex-1 text-gray-700">
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'dropdown':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            {/* Note: React Native doesn't have a native dropdown/select component */}
            {/* We'll use a TouchableOpacity with a modal or picker - for now, use multiple choice style */}
            <View className="space-y-3">
              {options.map((option, optIndex) => (
                <TouchableOpacity
                  key={optIndex}
                  onPress={() => handleResponseChange(questionId, option)}
                  className={`flex-row items-center p-4 rounded-md border ${
                    currentResponse === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <View className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${
                    currentResponse === option
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {currentResponse === option && (
                      <View className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </View>
                  <Text className={`text-lg flex-1 ${
                    currentResponse === option
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'linear-scale':
      case 'rating':
        const scaleMin = question.min_rating || question.scaleMin || 1;
        const scaleMax = question.max_rating || question.scaleMax || 5;
        const lowestLabel = question.lowestLabel || '';
        const highestLabel = question.highestLabel || '';
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sm text-slate-600">{lowestLabel || `${scaleMin}`}</Text>
                <Text className="text-sm text-slate-600">{highestLabel || `${scaleMax}`}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleResponseChange(questionId, value.toString())}
                    className={`w-10 h-10 rounded-full border-2 items-center justify-center ${
                      parseInt(currentResponse) === value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-400 bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${
                      parseInt(currentResponse) === value
                        ? 'text-white font-medium'
                        : 'text-gray-700'
                    }`}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'star-rating':
        const starMin = question.scaleMin || 1;
        const starMax = question.scaleMax || 5;
        const starValue = parseInt(currentResponse) || 0;
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <View className="flex-row items-center">
              {Array.from({ length: starMax }, (_, i) => i + 1).map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleResponseChange(questionId, star.toString())}
                  className="mr-2"
                >
                  <Ionicons
                    name={starValue >= star ? 'star' : 'star-outline'}
                    size={32}
                    color={starValue >= star ? '#fbbf24' : '#d1d5db'}
                  />
                </TouchableOpacity>
              ))}
              {starValue > 0 && (
                <Text className="ml-2 text-sm text-slate-600">
                  {starValue} / {starMax}
                </Text>
              )}
            </View>
          </View>
        );

      case 'date':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <TextInput
              value={typeof currentResponse === 'string' ? currentResponse : ''}
              onChangeText={(text) => handleResponseChange(questionId, text)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base text-gray-700 bg-white"
              placeholder="YYYY-MM-DD"
            />
            {/* Note: For better UX, consider using a date picker library */}
          </View>
        );

      case 'time':
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <TextInput
              value={typeof currentResponse === 'string' ? currentResponse : ''}
              onChangeText={(text) => handleResponseChange(questionId, text)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base text-gray-700 bg-white"
              placeholder="HH:MM"
            />
            {/* Note: For better UX, consider using a time picker library */}
          </View>
        );

      case 'multiple-choice-grid':
      case 'multiple_choice_grid':
        const rows = question.rows || [];
        const columns = question.columns || [];
        const gridResponse = currentResponse || {};
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} className="mb-4">
              <View className="border border-slate-300 rounded-lg overflow-hidden">
                {/* Header Row */}
                <View className="flex-row bg-slate-50 border-b border-slate-300">
                  <View className="w-32 px-3 py-2 border-r border-slate-300">
                    <Text className="font-medium text-slate-700"></Text>
                  </View>
                  {columns.map((column, colIndex) => (
                    <View key={colIndex} className="w-24 px-3 py-2 border-r border-slate-300 items-center">
                      <Text className="text-xs text-slate-700 text-center" numberOfLines={2}>{column}</Text>
                    </View>
                  ))}
                </View>
                {/* Data Rows */}
                {rows.map((row, rowIndex) => (
                  <View key={rowIndex} className="flex-row border-b border-slate-300">
                    <View className="w-32 px-3 py-2 border-r border-slate-300 bg-slate-50">
                      <Text className="text-sm font-medium text-slate-700" numberOfLines={2}>{row}</Text>
                    </View>
                    {columns.map((column, colIndex) => (
                      <TouchableOpacity
                        key={colIndex}
                        onPress={() => {
                          const newResponse = { ...gridResponse, [row]: column };
                          handleResponseChange(questionId, newResponse);
                        }}
                        className="w-24 px-3 py-2 border-r border-slate-300 items-center justify-center"
                      >
                        <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                          gridResponse[row] === column
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-400 bg-white'
                        }`}>
                          {gridResponse[row] === column && (
                            <View className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 'checkbox-grid':
      case 'checkbox_grid':
        const checkboxRows = question.rows || [];
        const checkboxColumns = question.columns || [];
        const checkboxGridResponse = currentResponse || {};
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} className="mb-4">
              <View className="border border-slate-300 rounded-lg overflow-hidden">
                {/* Header Row */}
                <View className="flex-row bg-slate-50 border-b border-slate-300">
                  <View className="w-32 px-3 py-2 border-r border-slate-300">
                    <Text className="font-medium text-slate-700"></Text>
                  </View>
                  {checkboxColumns.map((column, colIndex) => (
                    <View key={colIndex} className="w-24 px-3 py-2 border-r border-slate-300 items-center">
                      <Text className="text-xs text-slate-700 text-center" numberOfLines={2}>{column}</Text>
                    </View>
                  ))}
                </View>
                {/* Data Rows */}
                {checkboxRows.map((row, rowIndex) => {
                  const rowKey = row;
                  const rowResponse = Array.isArray(checkboxGridResponse[rowKey]) ? checkboxGridResponse[rowKey] : [];
                  return (
                    <View key={rowIndex} className="flex-row border-b border-slate-300">
                      <View className="w-32 px-3 py-2 border-r border-slate-300 bg-slate-50">
                        <Text className="text-sm font-medium text-slate-700" numberOfLines={2}>{row}</Text>
                      </View>
                      {checkboxColumns.map((column, colIndex) => {
                        const checked = rowResponse.includes(column);
                        return (
                          <TouchableOpacity
                            key={colIndex}
                            onPress={() => {
                              const newRowResponse = checked
                                ? rowResponse.filter(c => c !== column)
                                : [...rowResponse, column];
                              const newResponse = { ...checkboxGridResponse, [rowKey]: newRowResponse };
                              handleResponseChange(questionId, newResponse);
                            }}
                            className="w-24 px-3 py-2 border-r border-slate-300 items-center justify-center"
                          >
                            <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                              checked
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-400 bg-white'
                            }`}>
                              {checked && (
                                <Ionicons name="checkmark" size={14} color="#ffffff" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        );

      default:
        console.warn(`Unknown question type: ${questionType} for question:`, question);
        return (
          <View key={questionId} className="mb-6">
            <View className="mb-2">
              <RenderHTML
                contentWidth={getHtmlContentWidth(32)}
                source={{ html: decodeHtml(questionText) }}
                baseStyle={defaultHtmlStyles.baseStyle}
                tagsStyles={defaultHtmlStyles.tagsStyles}
              />
              {isRequired && <Text className="text-red-500">*</Text>}
              {questionType && <Text className="text-xs text-slate-500 ml-2">(Type: {questionType})</Text>}
            </View>
            <TextInput
              value={typeof currentResponse === 'string' ? currentResponse : ''}
              onChangeText={(text) => handleResponseChange(questionId, text)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base text-gray-700 bg-white"
              placeholder="Type your answer here..."
            />
          </View>
        );
    }
  };

  // Loading state - show loading while checking auth, loading data, or checking if already submitted
  // Also show loading if we haven't checked submission status yet
  if (authLoading || loading || !hasCheckedSubmission) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 mt-4">Loading survey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Already submitted state - check this BEFORE rendering the form
  if (alreadySubmitted) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-white rounded-2xl shadow-lg border border-orange-200 p-8 max-w-md items-center">
            <View className="w-16 h-16 rounded-full bg-orange-100 mb-4 items-center justify-center">
              <Ionicons name="warning" size={32} color="#f59e0b" />
            </View>
            <Text className="text-xl font-semibold text-slate-800 mb-2">Evaluation Already Taken</Text>
            <Text className="text-slate-600 mb-8 text-center">
              You have already submitted an evaluation for this survey. Thank you for your feedback!
            </Text>
            <View className="w-full items-center gap-4">
              <TouchableOpacity
                onPress={handleNavigateToMyEvents}
                className="bg-blue-600 px-6 py-4 rounded-xl w-full items-center justify-center"
              >
                <Text className="text-white font-semibold text-base">Back to My Events</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!survey) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-white rounded-2xl shadow-lg border border-yellow-200 p-8 max-w-md items-center">
            <View className="w-16 h-16 rounded-full bg-yellow-100 mb-4 items-center justify-center">
              <Ionicons name="alert-circle" size={32} color="#f59e0b" />
            </View>
            <Text className="text-xl font-semibold text-slate-800 mb-2">No Survey Available</Text>
            <Text className="text-slate-600 mb-6 text-center">{error || 'No survey is available for this event yet.'}</Text>
            <TouchableOpacity
              onPress={handleNavigateToMyEvents}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Back to My Events</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="evaluation"
        steps={[
          {
            id: '1',
            title: 'Evaluation Survey',
            description: 'Provide your feedback about the event. Answer all questions honestly. Some questions may be required.',
          },
          {
            id: '2',
            title: 'Submit Evaluation',
            description: 'After completing all questions, tap "Submit" to save your evaluation. You may be able to generate a certificate after submission.',
          },
        ]}
      />
      {/* Header */}
      <View className="bg-blue-900 px-3" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 bg-blue-800 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="clipboard" size={18} color="#ffffff" />
            <Text className="text-lg font-bold text-white ml-2">
              {survey.title || 'Event Evaluation'}
            </Text>
          </View>
          
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 80
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Survey Description */}
        {survey.description && (
          <View className="mb-6">
            <Text className="text-slate-100 text-base">{survey.description}</Text>
          </View>
        )}

        {/* Event Info Card */}
        {event && (
          <View className="bg-white rounded-xl shadow-md border border-slate-100 p-4 mb-6">
            <Text className="text-xl font-bold text-slate-800 mb-4">{event.title}</Text>
            
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-slate-600 ml-2">
                  {formatDate(event.start_date)}
                  {event.start_date !== event.end_date && ` - ${formatDate(event.end_date)}`}
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-slate-600 ml-2">
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </Text>
              </View>
              
              {event.venue && (
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-slate-600 ml-2">{event.venue}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Survey Form */}
        <View className="bg-white rounded-xl shadow-md border border-slate-100 p-4 mb-6">
          {survey.questions && survey.questions.length > 0 ? (() => {
            // Group questions by section (matching web version)
            const sections: Array<{
              sectionTitle?: string;
              sectionDescription?: string;
              sectionIndex?: number;
              questions: Array<Question & { globalIndex: number }>;
            }> = [];
            let currentSection: typeof sections[0] | null = null;
            let questionNumber = 1;
            
            survey.questions.forEach((question, index) => {
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
                  sectionTitle: undefined,
                  sectionDescription: undefined,
                  sectionIndex: undefined,
                  questions: []
                };
                sections.push(currentSection);
              } else if (!sectionTitle && currentSection && currentSection.sectionTitle) {
                // If we have a section but this question doesn't have section info, create a new default section
                currentSection = {
                  sectionTitle: undefined,
                  sectionDescription: undefined,
                  sectionIndex: undefined,
                  questions: []
                };
                sections.push(currentSection);
              }
              
              currentSection!.questions.push({ ...question, globalIndex: questionNumber - 1 });
              questionNumber++;
            });
            
            return sections.map((section, sectionIdx) => (
              <View key={sectionIdx} className="mb-8">
                {/* Section Header */}
                {(section.sectionTitle || section.sectionDescription) && (
                  <View className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                    {section.sectionTitle && (
                      <View className="mb-2">
                        <RenderHTML
                          contentWidth={getHtmlContentWidth(32)}
                          source={{ html: decodeHtml(section.sectionTitle) }}
                          baseStyle={{ ...defaultHtmlStyles.baseStyle, fontSize: 18, fontWeight: 'bold' }}
                          tagsStyles={defaultHtmlStyles.tagsStyles}
                        />
                      </View>
                    )}
                    {section.sectionDescription && (
                      <View>
                        <RenderHTML
                          contentWidth={getHtmlContentWidth(32)}
                          source={{ html: decodeHtml(section.sectionDescription) }}
                          baseStyle={defaultHtmlStyles.baseStyle}
                          tagsStyles={defaultHtmlStyles.tagsStyles}
                        />
                      </View>
                    )}
                  </View>
                )}
                
                {/* Section Questions */}
                {section.questions.map((question, qIdx) => {
                  const questionId = question.id || `q_${question.globalIndex}`;
                  return (
                    <View key={questionId} className="mb-6 bg-white rounded-xl border border-slate-100 p-4">
                      <View className="flex-row items-start mb-4">
                        <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mr-3 flex-shrink-0">
                          <Text className="text-white font-bold text-lg">{question.globalIndex + 1}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm text-slate-600 mb-2">Question {question.globalIndex + 1}</Text>
                          {renderQuestion(question, question.globalIndex)}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ));
          })() : (
            <View className="items-center py-8">
              <Text className="text-slate-500">No questions in this survey.</Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-800 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <View className="flex-row gap-4 mt-8">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-lg items-center"
            >
              <Text className="text-slate-700 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className={`flex-1 px-6 py-3 rounded-lg items-center ${
                submitting ? 'bg-blue-400' : 'bg-blue-600'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-medium">Submit Evaluation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

