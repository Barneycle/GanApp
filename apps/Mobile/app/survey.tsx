import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Survey() {
  const router = useRouter();
  const [responses, setResponses] = useState({});

  const questions = [
    {
      id: 1,
      question: "How satisfied are you with the event?",
      type: "rating",
      options: ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"]
    },
    {
      id: 2,
      question: "What was your favorite part of the event?",
      type: "multiple_choice",
      options: ["Networking", "Presentations", "Workshops", "Food", "Other"]
    },
    {
      id: 3,
      question: "Would you recommend this event to others?",
      type: "yes_no"
    },
    {
      id: 4,
      question: "Any additional comments or suggestions?",
      type: "text"
    }
  ];

  const handleResponse = (questionId, response) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const submitSurvey = () => {
    // Handle survey submission
    console.log('Survey responses:', responses);
    // You can implement actual submission logic here
  };

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'rating':
        return (
          <View className="space-y-2">
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleResponse(question.id, index + 1)}
                className={`p-3 rounded-lg border ${
                  responses[question.id] === index + 1 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text className="text-slate-800">{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiple_choice':
        return (
          <View className="space-y-2">
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleResponse(question.id, option)}
                className={`p-3 rounded-lg border ${
                  responses[question.id] === option 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text className="text-slate-800">{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'yes_no':
        return (
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => handleResponse(question.id, 'Yes')}
              className={`flex-1 p-3 rounded-lg border ${
                responses[question.id] === 'Yes' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text className="text-center text-slate-800">Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleResponse(question.id, 'No')}
              className={`flex-1 p-3 rounded-lg border ${
                responses[question.id] === 'No' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text className="text-center text-slate-800">No</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-3xl font-bold text-slate-800 mb-2">Event Survey</Text>
          <Text className="text-slate-600 mb-6">Help us improve by sharing your feedback</Text>

          <View className="space-y-6">
            {questions.map((question) => (
              <View key={question.id} className="bg-white rounded-2xl shadow-lg p-6">
                <Text className="text-lg font-semibold text-slate-800 mb-4">
                  {question.question}
                </Text>
                {renderQuestion(question)}
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={submitSurvey}
            className="bg-blue-600 py-4 rounded-lg items-center mt-6"
          >
            <Text className="text-white font-semibold text-lg">Submit Survey</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
