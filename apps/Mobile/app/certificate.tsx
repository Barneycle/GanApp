import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface CertificateData {
  eventId: string;
  eventName: string;
  participantName: string;
  date: string;
  certificateId: string;
  organizer: string;
}

export default function Certificate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  useEffect(() => {
    const mockData: CertificateData = {
      eventId: eventId || 'EVT-001',
      eventName: 'TechCon 2024: AI & Future Tech',
      participantName: 'John Doe',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      certificateId: `CERT-${Date.now()}`,
      organizer: 'GanApp Events'
    };
    
    setCertificateData(mockData);
  }, [eventId]);

  const generateCertificate = async () => {
    if (!certificateData) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      Alert.alert(
        'Certificate Generated!',
        'Your certificate has been successfully generated.',
        [{ text: 'Great!' }]
      );
    }, 3000);
  };

  const downloadCertificate = async () => {
    Alert.alert('Download', 'Certificate download functionality would be implemented here.');
  };

  const shareCertificate = async () => {
    Alert.alert('Share', 'Certificate sharing functionality would be implemented here.');
  };

  if (!certificateData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Loading certificate data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="ribbon" size={18} color="#374151" />
            <Text className="text-lg font-bold text-gray-800 ml-2">Generate Certificate</Text>
          </View>
          
          <View className="w-10" />
        </View>
      </View>

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-xl shadow-md p-6 mb-8">
            <View className="items-center mb-6">
              <View className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="ribbon" size={24} color="#2563eb" className="sm:hidden" />
                <Ionicons name="ribbon" size={32} color="#2563eb" className="hidden sm:block" />
              </View>
              <Text className="text-lg sm:text-xl font-bold text-gray-800 text-center">Certificate of Participation</Text>
            </View>

            <View className="space-y-4 sm:space-y-5">
              <View className="border-b border-gray-200 pb-4">
                <Text className="text-sm text-gray-600 mb-2">Event Name</Text>
                <Text className="text-base sm:text-lg font-semibold text-gray-800">{certificateData.eventName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-sm text-gray-600 mb-2">Participant</Text>
                <Text className="text-base sm:text-lg font-semibold text-gray-800">{certificateData.participantName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-sm text-gray-600 mb-2">Date</Text>
                <Text className="text-base sm:text-lg font-semibold text-gray-800">{certificateData.date}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-sm text-gray-600 mb-2">Organizer</Text>
                <Text className="text-base sm:text-lg font-semibold text-gray-800">{certificateData.organizer}</Text>
              </View>

              <View>
                <Text className="text-sm text-gray-600 mb-2">Certificate ID</Text>
                <Text className="text-sm font-mono text-gray-500">{certificateData.certificateId}</Text>
              </View>
            </View>
          </View>

          {!isGenerated ? (
            <TouchableOpacity
              onPress={generateCertificate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-lg items-center mb-6 ${
                isGenerating ? 'bg-gray-400' : 'bg-blue-500'
              }`}
            >
              <View className="flex-row items-center">
                {isGenerating && (
                  <View className="mr-3">
                    <Ionicons name="refresh" size={20} color="white" />
                  </View>
                )}
                <Text className="text-white text-base sm:text-lg font-semibold">
                  {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="space-y-4">
              <TouchableOpacity
                onPress={downloadCertificate}
                className="w-full py-4 bg-green-500 rounded-lg items-center"
              >
                <View className="flex-row items-center">
                  <Ionicons name="download" size={20} color="white" className="mr-3" />
                  <Text className="text-white text-base sm:text-lg font-semibold">Download PDF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareCertificate}
                className="w-full py-4 bg-blue-500 rounded-lg items-center"
              >
                <View className="flex-row items-center">
                  <Ionicons name="share-social" size={20} color="white" className="mr-3" />
                  <Text className="text-white text-base sm:text-lg font-semibold">Share Certificate</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {isGenerated && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#059669" className="mr-3" />
                <Text className="text-green-800 font-medium">Certificate generated successfully!</Text>
              </View>
            </View>
          )}

          <View className="space-y-4">
            <TouchableOpacity
              onPress={() => router.push('/')}
              className="w-full py-4 bg-gray-200 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
