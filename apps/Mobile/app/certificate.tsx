import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EventService, Event } from '../lib/eventService';
import { useAuth } from '../lib/authContext';

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
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();

  // Safe navigation helpers
  const safeNavigate = (navigationFn: () => void) => {
    try {
      if (isMounted) {
        navigationFn();
      }
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  const handleBack = () => {
    safeNavigate(() => router.back());
  };

  const handleNavigateToHome = () => {
    safeNavigate(() => router.push('/'));
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const eventResult = await EventService.getEventById(eventId);
      
      if (eventResult.error) {
        Alert.alert('Error', eventResult.error || 'Failed to load event data');
        setLoading(false);
        return;
      }

      if (eventResult.event) {
        setEvent(eventResult.event);
        
        // Get participant name from user data
        const participantName = user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : user?.email?.split('@')[0] || 'Participant';

        // Format event date
        const eventDate = new Date(eventResult.event.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Get organizer name (you might need to fetch this from the creator)
        // For now, using a default or trying to get from user
        const organizer = 'GanApp Events'; // You can fetch this from the event creator if needed

        const certificateData: CertificateData = {
          eventId: eventResult.event.id,
          eventName: eventResult.event.title,
          participantName: participantName,
          date: eventDate,
          certificateId: `CERT-${Date.now()}`,
          organizer: organizer
        };
        
        setCertificateData(certificateData);
      }
    } catch (err: any) {
      console.error('Error loading event data:', err);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

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

  if (!certificateData || loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-blue-100 mt-4">Loading certificate data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
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
          <View className="bg-white rounded-xl shadow-md p-6 mb-8">
            <View className="items-center mb-6">
              <Text className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Certificate of Participation</Text>
            </View>

            <View className="space-y-4 sm:space-y-5">
              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Event Name</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.eventName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Participant</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.participantName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Date</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.date}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Organizer</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.organizer}</Text>
              </View>

              <View>
                <Text className="text-base text-gray-600 mb-2">Certificate ID</Text>
                <Text className="text-base font-mono text-gray-500">{certificateData.certificateId}</Text>
              </View>
            </View>
          </View>

          {!isGenerated ? (
            <TouchableOpacity
              onPress={generateCertificate}
              disabled={isGenerating}
              className={`w-full py-5 rounded-lg items-center justify-center mb-6 ${
                isGenerating ? 'bg-blue-400' : 'bg-blue-700'
              }`}
            >
              <View className="flex-row items-center justify-center">
                {isGenerating && (
                  <View className="mr-3">
                    <Ionicons name="refresh" size={24} color="white" />
                  </View>
                )}
                <Text className="text-white text-lg font-semibold">
                  {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="space-y-4">
              <TouchableOpacity
                onPress={downloadCertificate}
                className="w-full py-5 bg-green-500 rounded-lg items-center justify-center"
                style={{ minHeight: 56 }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="download" size={24} color="white" style={{ marginRight: 12 }} />
                  <Text className="text-white text-lg font-semibold">Download PDF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareCertificate}
                className="w-full py-5 bg-blue-700 rounded-lg items-center justify-center"
                style={{ minHeight: 56 }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="share-social" size={24} color="white" style={{ marginRight: 12 }} />
                  <Text className="text-white text-lg font-semibold">Share Certificate</Text>
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
              onPress={handleNavigateToHome}
              className="w-full py-5 bg-blue-800 rounded-lg items-center justify-center"
            >
              <Text className="text-white text-lg font-semibold">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
