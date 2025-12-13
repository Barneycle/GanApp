import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  InteractionManager,
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
  
  // Auto-close countdown
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const AUTO_CLOSE_DELAY = 5000; // 5 seconds

  useEffect(() => {
    loadParticipantInfo();
  }, [participantId, eventId]);

  // Show alert after participant data is loaded
  useEffect(() => {
    if (!loading && participant && showAlert === 'true' && alertTitle && !hasShownAlert.current) {
      hasShownAlert.current = true;
      // Small delay to ensure screen is fully rendered
      setTimeout(() => {
        // Show alert with callback to start countdown after it closes
        showSuccess(alertTitle, alertMessage, () => {
          // Start auto-close countdown after sweetalert is closed
          startAutoCloseCountdown();
        });
      }, 300);
    }
    
    // Cleanup timers on unmount
    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    };
  }, [loading, participant, showAlert, alertTitle, alertMessage]);

  // Function to start the auto-close countdown
  const startAutoCloseCountdown = () => {
    // Start auto-close countdown
    const totalSeconds = Math.ceil(AUTO_CLOSE_DELAY / 1000);
    setRemainingSeconds(totalSeconds);
    
    // Animate progress bar
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_CLOSE_DELAY,
      useNativeDriver: false,
    }).start();
    
    // Update countdown every second
    let secondsLeft = totalSeconds;
    countdownTimer.current = setInterval(() => {
      secondsLeft -= 1;
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0) {
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
      }
    }, 1000);
    
    // Auto-close and navigate back
    autoCloseTimer.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        router.back();
      });
    }, AUTO_CLOSE_DELAY);
  };

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1e3a8a' }} className="items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }


  if (error || !participant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1e3a8a' }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={64} color="#ffffff" />
          <Text className="text-xl font-bold text-white mt-4 mb-2">
            {error || 'Participant Not Found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 bg-white rounded-xl"
          >
            <Text className="text-blue-900 font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const registrationStatus = getStatusColor(participant.registration_status || 'unknown', 'registration');
  const attendanceStatus = getStatusColor(participant.attendance_status || 'not_checked_in', 'attendance');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1e3a8a' }}>
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
        className="px-6 py-4 flex-row items-center justify-between"
        style={{ 
          paddingTop: Math.max(insets.top, 8),
          backgroundColor: '#1e3a8a' 
        }}
      >
        <TouchableOpacity
          onPress={() => {
            // Clear timers if manually closed
            if (autoCloseTimer.current) {
              clearTimeout(autoCloseTimer.current);
              autoCloseTimer.current = null;
            }
            if (countdownTimer.current) {
              clearInterval(countdownTimer.current);
              countdownTimer.current = null;
            }
            router.back();
          }}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Participant Details</Text>
        {showAlert === 'true' && remainingSeconds > 0 && (
          <View 
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#ffffff',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>
              {remainingSeconds}
            </Text>
          </View>
        )}
        {showAlert !== 'true' && <View className="w-10" />}
      </View>

      {/* Countdown Progress Bar */}
      {showAlert === 'true' && remainingSeconds > 0 && (
        <View 
          style={{
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              backgroundColor: '#ffffff',
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: Math.max(insets.bottom, 20) + 20,
          paddingTop: 20,
          paddingHorizontal: 16,
        }}
      >
        {/* Main Card Container */}
        <View 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Avatar Section */}
          <View className="items-center mb-6">
            {participant.avatar_url ? (
              <View 
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Image
                  source={{ uri: participant.avatar_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View 
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: '#1e3a8a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Ionicons name="person" size={60} color="white" />
              </View>
            )}
          </View>

          {/* Name and Role */}
          <View className="items-center mb-8">
            <Text 
              style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {[participant.first_name, participant.middle_initial, participant.last_name]
                .filter(Boolean)
                .join(' ')}
            </Text>
            <View 
              style={{
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text 
                style={{
                  fontSize: 14,
                  color: '#6b7280',
                  textTransform: 'capitalize',
                  fontWeight: '600',
                }}
              >
                {participant.role}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View 
            style={{
              height: 1,
              backgroundColor: '#e5e7eb',
              marginBottom: 24,
            }}
          />

          {/* Event Section */}
          <View className="mb-6">
            <Text 
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Event
            </Text>
            <Text 
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#1e3a8a',
              }}
            >
              {eventTitle || 'Sample Conference 2024'}
            </Text>
          </View>

          {/* Status Badges */}
          <View className="flex-row gap-3 mb-6">
            <View 
              style={{
                flex: 1,
                borderRadius: 16,
                padding: 16,
                backgroundColor: registrationStatus.bg,
              }}
            >
              <Text 
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: registrationStatus.text,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Registration
              </Text>
              <Text 
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: registrationStatus.text,
                }}
              >
                {registrationStatus.label}
              </Text>
            </View>
            <View 
              style={{
                flex: 1,
                borderRadius: 16,
                padding: 16,
                backgroundColor: attendanceStatus.bg,
              }}
            >
              <Text 
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: attendanceStatus.text,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Check-in
              </Text>
              <Text 
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: attendanceStatus.text,
                }}
              >
                {attendanceStatus.label}
              </Text>
            </View>
          </View>

          {/* Registration Date */}
          {participant.registration_date && (
            <>
              <View 
                style={{
                  height: 1,
                  backgroundColor: '#e5e7eb',
                  marginBottom: 16,
                }}
              />
              <View>
                <Text 
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  Registered On
                </Text>
                <Text 
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {new Date(participant.registration_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
