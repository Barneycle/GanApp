import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'rating' | 'text';
  options?: string[];
  required: boolean;
}

const sampleQuestions: Question[] = [
  {
    id: '1',
    question: 'How would you rate your overall experience at this event?',
    type: 'rating',
    required: true,
  },
  {
    id: '2',
    question: 'Which session did you find most valuable?',
    type: 'multiple_choice',
    options: ['Keynote Speech', 'Panel Discussion', 'Workshop A', 'Workshop B', 'Networking Session'],
    required: true,
  },
  {
    id: '3',
    question: 'What aspects of the event could be improved?',
    type: 'text',
    required: false,
  },
  {
    id: '4',
    question: 'Would you recommend this event to others?',
    type: 'multiple_choice',
    options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'],
    required: true,
  },
  {
    id: '5',
    question: 'How did you hear about this event?',
    type: 'multiple_choice',
    options: ['Social Media', 'Email Newsletter', 'Word of Mouth', 'Website', 'Other'],
    required: true,
  },
];

export default function Survey() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === sampleQuestions.length - 1;

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
    setIsSubmitting(true);
    
    // Simulate survey submission
    setTimeout(() => {
      setIsSubmitting(false);
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
    }, 2000);
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
    return ((currentQuestionIndex + 1) / sampleQuestions.length) * 100;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="clipboard" size={18} color="#374151" />
            <Text className="text-lg font-bold text-gray-800 ml-2">Event Survey</Text>
          </View>
          
          <View className="w-10" />
        </View>

        {/* Progress Bar - Google Forms Style */}
        <View className="mt-4 mb-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-gray-600 font-medium">
              Question {currentQuestionIndex + 1} of {sampleQuestions.length}
            </Text>
            <Text className="text-sm text-gray-600 font-medium">
              {Math.round(getProgressPercentage())}%
            </Text>
          </View>
          <View className="w-full bg-gray-200 rounded-full h-1.5">
            <View 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </View>
        </View>
      </View>

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card - Google Forms Style */}
          <View className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
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
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <Text className={`font-medium text-sm sm:text-base ${
                  currentQuestionIndex === 0
                    ? 'text-gray-400'
                    : 'text-gray-700'
                }`}>
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextQuestion}
                disabled={isSubmitting}
                className={`py-3 px-6 rounded-md ${
                  isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
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
              <Text className="text-sm text-gray-600 font-medium">
                Question {currentQuestionIndex + 1} of {sampleQuestions.length}
              </Text>
              <Text className="text-sm text-gray-600 font-medium">
                {Math.round(getProgressPercentage())}%
              </Text>
            </View>
            <View className="w-full bg-gray-200 rounded-full h-1.5">
              <View 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
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
            <Text className="text-blue-600 text-sm sm:text-base font-medium hover:underline">
              Skip this survey
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
