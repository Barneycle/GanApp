import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParticipantService, ParticipantInfo } from '../lib/participantService';
import { showSuccess } from '../lib/sweetAlert';
import TutorialOverlay from '../components/TutorialOverlay';

export default function ParticipantDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { participantId, eventId, eventTitle, showAlert, alertTitle, alertMessage } = useLocalSearchParams<{
    participantId?: string;
    eventId?: string;
    eventTitle?: string;
    showAlert?: string;
    alertTitle?: string;
    alertMessage?: string;
  }>();
  
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasShownAlert = useRef(false);

  useEffect(() => {
    loadParticipantInfo();
  }, [participantId, eventId]);

  // Show alert after participant data is loaded
  useEffect(() => {
    if (!loading && participant && showAlert === 'true' && alertTitle && !hasShownAlert.current) {
      hasShownAlert.current = true;
      // Small delay to ensure screen is fully rendered
      setTimeout(() => {
        showSuccess(alertTitle, alertMessage);
      }, 300);
    }
  }, [loading, participant, showAlert, alertTitle, alertMessage]);

  const loadParticipantInfo = async () => {
    if (!participantId || !eventId) {
      setError('Missing participant or event information');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await ParticipantService.getParticipantInfo(participantId, eventId);
      
      if (data) {
        setParticipant(data);
      } else {
        setError('Participant not found');
      }
    } catch (err) {
      console.error('Error loading participant:', err);
      setError('Failed to load participant information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, type: 'registration' | 'attendance') => {
    if (type === 'registration') {
      switch (status) {
        case 'registered': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Registered' };
        case 'pending': return { bg: '#FFF3E0', text: '#F57C00', label: 'Pending' };
        default: return { bg: '#F3E5F5', text: '#6A1B9A', label: 'Not Registered' };
      }
    } else {
      switch (status) {
        case 'checked_in': return { bg: '#E3F2FD', text: '#1565C0', label: 'Checked In' };
        case 'not_checked_in': return { bg: '#FFF8E1', text: '#F57F17', label: 'Not Checked In' };
        default: return { bg: '#ECEFF1', text: '#455A64', label: 'Unknown' };
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} className="items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </SafeAreaView>
    );
  }


  if (error || !participant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">
            {error || 'Participant Not Found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-xl"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const registrationStatus = getStatusColor(participant.registration_status || 'unknown', 'registration');
  const attendanceStatus = getStatusColor(participant.attendance_status || 'not_checked_in', 'attendance');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <TutorialOverlay
        screenId="participant-details"
        steps={[
          {
            id: '1',
            title: 'Participant Information',
            description: 'View detailed information about a participant including their registration status, attendance, and contact details.',
          },
          {
            id: '2',
            title: 'Check-in Status',
            description: 'See if the participant has checked in to the event. You can view their QR code and registration details.',
          },
        ]}
      />
      {/* Header */}
      <View 
        className="border-b border-gray-200 px-6 py-4 flex-row items-center justify-between"
        style={{ 
          paddingTop: Math.max(insets.top, 8),
          backgroundColor: '#FAFAFA' 
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Participant Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
      >
        {/* Avatar Section */}
        <View className="px-6 pt-6 pb-6 items-center">
          {participant.avatar_url ? (
            <View className="w-48 h-48 rounded-full overflow-hidden mb-4 bg-gray-200 shadow-lg">
              <Image
                source={{ uri: participant.avatar_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View className="w-48 h-48 bg-blue-600 rounded-full items-center justify-center mb-4 shadow-lg">
              <Ionicons name="person" size={80} color="white" />
            </View>
          )}
        </View>

        {/* Name and Role */}
        <View className="px-6 pb-6">
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            {[participant.first_name, participant.middle_initial, participant.last_name]
              .filter(Boolean)
              .join(' ')}
          </Text>
          <Text className="text-lg text-gray-500 capitalize">
            {participant.role}
          </Text>
        </View>

        {/* Event and Status Card */}
        <View className="mx-6 mb-6 rounded-xl p-6 shadow-sm border border-gray-100" style={{ backgroundColor: '#FAFAFA' }}>
          {/* Event Section */}
          <View className="mb-6">
            <Text className="text-2xl text-blue-600 font-semibold mb-3">Event</Text>
            <Text className="text-2xl font-bold text-blue-900">{eventTitle || 'Sample Conference 2024'}</Text>
          </View>

          {/* Status Badges */}
          <View className="flex-row gap-3">
            <View 
              className="flex-1 rounded-xl p-5"
              style={{ backgroundColor: registrationStatus.bg }}
            >
              <Text className="text-sm font-semibold mb-2" style={{ color: registrationStatus.text }}>
                Registration
              </Text>
              <Text className="text-lg font-bold" style={{ color: registrationStatus.text }}>
                {registrationStatus.label}
              </Text>
            </View>
            <View 
              className="flex-1 rounded-xl p-5"
              style={{ backgroundColor: attendanceStatus.bg }}
            >
              <Text className="text-sm font-semibold mb-2" style={{ color: attendanceStatus.text }}>
                Check-in
              </Text>
              <Text className="text-lg font-bold" style={{ color: attendanceStatus.text }}>
                {attendanceStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Registration Date */}
        {participant.registration_date && (
          <View className="mx-6 mb-6 rounded-xl p-5 shadow-sm border border-gray-100" style={{ backgroundColor: '#FAFAFA' }}>
            <Text className="text-sm text-gray-500 mb-2">Registered On</Text>
            <Text className="text-lg font-medium text-gray-900">
              {new Date(participant.registration_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
