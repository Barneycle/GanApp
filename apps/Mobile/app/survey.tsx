import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SurveyService, Survey as SurveyType } from '../lib/surveyService';
import { useAuth } from '../lib/authContext';

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'rating' | 'text';
  options?: string[];
  required: boolean;
}


export default function Survey() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [survey, setSurvey] = useState<SurveyType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilityInfo, setAvailabilityInfo] = useState<any>(null);
  const [validationInfo, setValidationInfo] = useState<any>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();

  const currentQuestion = survey?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (survey?.questions?.length || 0) - 1;

  useEffect(() => {
    if (eventId && user?.id) {
      fetchSurvey();
    } else if (!user?.id) {
      setError('You must be logged in to access surveys');
      setIsLoading(false);
    } else {
      setError('Event ID is required');
      setIsLoading(false);
    }
  }, [eventId, user?.id]);

  const fetchSurvey = async () => {
    if (!eventId || !user?.id) {
      setError('Event ID and user authentication are required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Now pass both eventId and userId for comprehensive validation
      const result = await SurveyService.getSurveyByEventId(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
        setAvailabilityInfo(result.availabilityInfo);
        setValidationInfo(result.validationInfo);
      } else if (result.survey) {
        setSurvey(result.survey);
        setAvailabilityInfo(result.availabilityInfo);
        setValidationInfo(result.validationInfo);
      } else {
        setError('No survey found for this event');
      }
    } catch (err) {
      setError('Failed to load survey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleTextInput = (questionId: string, text: string) => {
    setTextInputs(prev => ({ ...prev, [questionId]: text }));
  };

  const nextQuestion = () => {
    if (currentQuestion.required && !answers[currentQuestion.id] && currentQuestion.type !== 'text') {
      Alert.alert('Required Question', 'Please answer this question before continuing.');
      return;
    }

    if (currentQuestion.type === 'text' && currentQuestion.required && !textInputs[currentQuestion.id]?.trim()) {
      Alert.alert('Required Question', 'Please provide an answer before continuing.');
      return;
    }

    if (isLastQuestion) {
      submitSurvey();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitSurvey = async () => {
    if (!survey || !user) {
      Alert.alert('Error', 'Survey or user data is missing');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Combine all answers
      const allResponses = { ...answers, ...textInputs };
      
      const result = await SurveyService.submitSurveyResponse(
        survey.id,
        user.id,
        allResponses
      );

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      Alert.alert(
        'Survey Completed!',
        'Thank you for your feedback. Generating your certificate...',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to certificate generation
              router.push({
                pathname: '/certificate',
                params: { eventId: eventId }
              });
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <View className="space-y-2">
            {currentQuestion.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleAnswer(currentQuestion.id, option)}
                className={`flex-row items-center p-3 rounded-md border ${
                  answers[currentQuestion.id] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  answers[currentQuestion.id] === option
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-400'
                }`}>
                  {answers[currentQuestion.id] === option && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
                <Text className={`text-base ${
                  answers[currentQuestion.id] === option
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'rating':
        return (
          <View className="space-y-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => handleAnswer(currentQuestion.id, rating)}
                className={`flex-row items-center p-3 rounded-md border ${
                  answers[currentQuestion.id] === rating
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    answers[currentQuestion.id] === rating
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {answers[currentQuestion.id] === rating && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text className={`text-base ${
                    answers[currentQuestion.id] === rating
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}>
                    {rating} {rating === 1 ? 'Star' : 'Stars'}
                  </Text>
                </View>
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={18}
                      color={star <= rating ? '#fbbf24' : '#d1d5db'}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'text':
        return (
          <View>
            <TextInput
              className="border border-gray-300 rounded-md p-4 bg-white text-base text-gray-700 min-h-[120px] focus:border-blue-500"
              placeholder="Your answer"
              placeholderTextColor="#9ca3af"
              value={textInputs[currentQuestion.id] || ''}
              onChangeText={(text) => handleTextInput(currentQuestion.id, text)}
              multiline
              textAlignVertical="top"
            />
          </View>
        );

      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    if (!survey?.questions?.length) return 0;
    return ((currentQuestionIndex + 1) / survey.questions.length) * 100;
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 mt-4">Loading survey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced error state with comprehensive validation information
  if (error) {
    const getValidationIcon = () => {
      // Priority order: validation failures first, then availability issues
      if (validationInfo?.step === 'event_validation') {
        return 'calendar-outline';
      } else if (validationInfo?.step === 'attendance_verification') {
        if (validationInfo.reason === 'not_checked_in') {
          return 'qr-code-outline';
        }
        return 'person-outline';
      } else if (validationInfo?.step === 'survey_retrieval') {
        return 'document-outline';
      } else if (validationInfo?.step === 'cross_reference') {
        return 'warning-outline';
      } else if (validationInfo?.step === 'availability_check') {
        if (availabilityInfo?.status === 'closed_by_organizer') {
          return 'lock-closed';
        } else if (availabilityInfo?.status === 'scheduled_to_open') {
          return 'time';
        } else if (availabilityInfo?.status === 'closed_by_schedule') {
          return 'calendar';
        } else if (availabilityInfo?.status === 'inactive') {
          return 'power';
        }
      } else if (validationInfo?.step === 'exception') {
        return 'bug-outline';
      }
      return 'alert-circle';
    };

    const getValidationColor = () => {
      if (validationInfo?.step === 'event_validation') {
        return '#ef4444'; // red - critical
      } else if (validationInfo?.step === 'attendance_verification') {
        return '#f59e0b'; // amber - user action needed
      } else if (validationInfo?.step === 'survey_retrieval') {
        return '#6b7280'; // gray - not found
      } else if (validationInfo?.step === 'cross_reference') {
        return '#ef4444'; // red - security issue
      } else if (validationInfo?.step === 'availability_check') {
        if (availabilityInfo?.status === 'closed_by_organizer') {
          return '#f59e0b'; // amber
        } else if (availabilityInfo?.status === 'scheduled_to_open') {
          return '#3b82f6'; // blue
        } else if (availabilityInfo?.status === 'closed_by_schedule') {
          return '#ef4444'; // red
        }
      } else if (validationInfo?.step === 'exception') {
        return '#ef4444'; // red - system error
      }
      return '#ef4444'; // red - default
    };

    const getValidationTitle = () => {
      if (validationInfo?.step === 'event_validation') {
        return 'Event Access Denied';
      } else if (validationInfo?.step === 'attendance_verification') {
        if (validationInfo.reason === 'not_checked_in') {
          return 'Check-In Required';
        }
        return 'Attendance Verification Failed';
      } else if (validationInfo?.step === 'survey_retrieval') {
        return 'Survey Not Found';
      } else if (validationInfo?.step === 'cross_reference') {
        return 'Access Denied';
      } else if (validationInfo?.step === 'availability_check') {
        return 'Survey Not Available';
      } else if (validationInfo?.step === 'exception') {
        return 'System Error';
      }
      return 'Access Denied';
    };

    const getAdditionalInfo = () => {
      // Validation-specific guidance
      if (validationInfo?.step === 'event_validation') {
        return 'The event may not be published yet or may have already ended.';
      } else if (validationInfo?.step === 'attendance_verification') {
        if (validationInfo.reason === 'not_checked_in') {
          return 'Please scan the QR code at the event venue to check in first.';
        }
        return 'Please ensure you are registered and have checked in to this event.';
      } else if (validationInfo?.step === 'survey_retrieval') {
        return 'The event organizer hasn\'t created a survey for this event yet.';
      } else if (validationInfo?.step === 'cross_reference') {
        return 'There was a security validation error. Please contact support.';
      } else if (validationInfo?.step === 'availability_check') {
        if (availabilityInfo?.status === 'scheduled_to_open' && availabilityInfo.opensAt) {
          return `The survey will open on ${new Date(availabilityInfo.opensAt).toLocaleString()}`;
        } else if (availabilityInfo?.status === 'closed_by_schedule' && availabilityInfo.closesAt) {
          return `The survey closed on ${new Date(availabilityInfo.closesAt).toLocaleString()}`;
        } else if (availabilityInfo?.status === 'closed_by_organizer') {
          return 'The event organizer will open the survey when they\'re ready. Please check back later.';
        }
      } else if (validationInfo?.step === 'exception') {
        return 'An unexpected error occurred. Please try again or contact support.';
      }
      return null;
    };

    const getActionButton = () => {
      if (validationInfo?.step === 'attendance_verification' && validationInfo.reason === 'not_checked_in') {
        return (
          <TouchableOpacity
            onPress={() => router.push('/qrscanner')}
            className="mt-4 bg-blue-600 px-6 py-3 rounded-md"
          >
            <Text className="text-white font-medium">Go to QR Scanner</Text>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-blue-600 px-6 py-3 rounded-md"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      );
    };

    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name={getValidationIcon()} size={48} color={getValidationColor()} />
          <Text className="text-lg font-semibold text-white mt-4 text-center">
            {getValidationTitle()}
          </Text>
          <Text className="text-blue-100 mt-2 text-center text-base">
            {error}
          </Text>
          {getAdditionalInfo() && (
            <Text className="text-blue-100 mt-3 text-center text-sm px-4">
              {getAdditionalInfo()}
            </Text>
          )}
          
          {/* Validation Debug Info (only in development) */}
          {__DEV__ && validationInfo && (
            <View className="mt-4 p-3 bg-gray-100 rounded-lg">
              <Text className="text-xs text-gray-600 font-mono">
                Debug: {JSON.stringify(validationInfo, null, 2)}
              </Text>
            </View>
          )}
          
          {getActionButton()}
        </View>
      </SafeAreaView>
    );
  }

  // No survey found
  if (!survey || !survey.questions?.length) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="clipboard-outline" size={48} color="#ffffff" />
          <Text className="text-lg font-semibold text-white mt-4 text-center">
            No Survey Available
          </Text>
          <Text className="text-blue-100 mt-2 text-center">
            This event doesn't have a survey yet.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-blue-700 px-6 py-3 rounded-md"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      {/* Header */}
      <View className="bg-blue-900 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-blue-800 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="clipboard" size={18} color="#ffffff" />
            <Text className="text-lg font-bold text-white ml-2">
              {survey.title || 'Event Survey'}
            </Text>
          </View>
          
          <View className="w-10" />
        </View>

        {/* Progress Bar - Google Forms Style */}
        <View className="mt-4 mb-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-blue-100 font-medium">
              Question {currentQuestionIndex + 1} of {survey.questions.length}
            </Text>
            <Text className="text-sm text-blue-100 font-medium">
              {Math.round(getProgressPercentage())}%
            </Text>
          </View>
          <View className="w-full bg-blue-800 rounded-full h-1.5">
            <View 
              className="bg-white h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </View>
        </View>
      </View>

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            paddingVertical: 20,
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 20)
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card - Google Forms Style */}
          <View className="bg-white rounded-lg border border-blue-200 p-6 mb-8">
            <View className="mb-6">
              <Text className="text-lg sm:text-xl font-medium text-gray-900 mb-3">
                {currentQuestion.question}
              </Text>
              {currentQuestion.required && (
                <Text className="text-red-500 text-sm font-medium">* Required</Text>
              )}
            </View>

            {/* Answer Options */}
            <View className="mb-8">
              {renderQuestion()}
            </View>

            {/* Navigation Buttons - Google Forms Style */}
            <View className="flex-row justify-between space-x-3 sm:space-x-4">
              <TouchableOpacity
                onPress={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`py-3 px-6 rounded-md border ${
                  currentQuestionIndex === 0
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-blue-300 bg-white'
                }`}
              >
                <Text className={`font-medium text-sm sm:text-base ${
                  currentQuestionIndex === 0
                    ? 'text-blue-300'
                    : 'text-blue-700'
                }`}>
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextQuestion}
                disabled={isSubmitting}
                className={`py-3 px-6 rounded-md ${
                  isSubmitting ? 'bg-blue-400' : 'bg-blue-700'
                }`}
              >
                <Text className="text-white font-medium text-sm sm:text-base">
                  {isSubmitting ? 'Submitting...' : isLastQuestion ? 'Submit' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar - Google Forms Style */}
          <View className="mt-6 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-blue-100 font-medium">
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </Text>
              <Text className="text-sm text-blue-100 font-medium">
                {Math.round(getProgressPercentage())}%
              </Text>
            </View>
            <View className="w-full bg-blue-800 rounded-full h-1.5">
              <View 
                className="bg-white h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </View>
          </View>

          {/* Skip Survey Option - Google Forms Style */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Skip Survey',
                'Are you sure you want to skip this survey? You can still generate a certificate.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Skip', 
                    style: 'destructive',
                    onPress: () => router.push('/certificate')
                  }
                ]
              );
            }}
            className="mt-6 text-center"
          >
            <Text className="text-white text-sm sm:text-base font-medium underline">
              Skip this survey
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
