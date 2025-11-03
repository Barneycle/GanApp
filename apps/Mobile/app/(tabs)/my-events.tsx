import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
let MediaLibrary: any = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (e) {
  console.log('expo-media-library not available:', e);
}
import { EventService, Event } from '../../lib/eventService';
import { SurveyService } from '../../lib/surveyService';
import { useAuth } from '../../lib/authContext';
import { supabase } from '../../lib/supabase';

interface RegisteredEvent extends Event {
  registration_date: string;
  registration_id: string;
  check_in_before_minutes?: number;
  check_in_during_minutes?: number;
}

export default function MyEvents() {
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<RegisteredEvent | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const qrCodeViewRef = React.useRef<View>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login');
      return;
    }
    
    if (user?.role !== 'participant') {
      router.replace('/');
      return;
    }

    if (user?.id) {
      loadRegisteredEvents();
    }
  }, [user]);

  const loadRegisteredEvents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await EventService.getUserRegistrations(user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Extract the events from the registrations (like the web version)
        const events = result.registrations?.map(registration => ({
          ...registration.events,
          registration_date: registration.registration_date,
          registration_id: registration.registration_id
        })) || [];
        
        setRegisteredEvents(events);
      }
    } catch (err) {
      setError('Failed to load your registered events');
    } finally {
      setLoading(false);
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

  const formatCheckInTime = (event: RegisteredEvent) => {
    if (!event.check_in_before_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInTime = new Date(startTime.getTime() - (event.check_in_before_minutes * 60000));
    
    return checkInTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCheckInEndTime = (event: RegisteredEvent) => {
    if (!event.check_in_during_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInEndTime = new Date(startTime.getTime() + (event.check_in_during_minutes * 60000));
    
    return checkInEndTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(`${event.start_date}T${event.start_time}`);
    const endDate = new Date(`${event.end_date}T${event.end_time}`);

    if (now < startDate) {
      return { status: 'upcoming', text: 'Upcoming', color: 'bg-blue-100', textColor: 'text-blue-800' };
    } else if (now >= startDate && now <= endDate) {
      return { status: 'ongoing', text: 'Ongoing', color: 'bg-green-100', textColor: 'text-green-800' };
    } else {
      return { status: 'completed', text: 'Completed', color: 'bg-gray-100', textColor: 'text-gray-800' };
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Confirm Unregistration',
      'Are you sure you want to unregister from this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('event_registrations')
                .update({ status: 'cancelled' })
                .eq('event_id', eventId)
                .eq('user_id', user.id);

              if (error) {
                Alert.alert('Error', error.message || 'Failed to unregister from event');
              } else {
                // Remove the event from the list
                setRegisteredEvents(prev => prev.filter(event => event.id !== eventId));
                Alert.alert('Success', 'Successfully unregistered from event');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to unregister from event');
            }
          },
        },
      ]
    );
  };

  const handleTakeEvaluation = async (event: RegisteredEvent) => {
    try {
      // Get survey for this event
      const surveyResult = await SurveyService.getSurveyByEventId(event.id, user?.id || '');
      
      if (surveyResult.error) {
        Alert.alert('Survey Not Available', surveyResult.error);
      } else if (surveyResult.survey) {
        router.push(`/survey?id=${surveyResult.survey.id}`);
      } else {
        Alert.alert('Survey Not Available', 'No survey is available for this event yet.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load survey. Please try again.');
    }
  };

  const handleGenerateQR = async (event: RegisteredEvent) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to generate a QR code');
      return;
    }

    setQrEvent(event);
    setQrCodeUrl('');
    setQrCodeData('');
    setQrError(null);
    setIsQRModalOpen(true);
    await generateEventQRCode(event);
  };

  const generateEventQRCode = async (event: RegisteredEvent) => {
    if (!user?.id) return;

    try {
      setQrLoading(true);
      setQrError(null);

      // Create QR data for event registration
      const qrData = {
        eventId: event.id,
        title: event.title,
        date: event.start_date,
        time: event.start_time,
        venue: event.venue,
        userId: user.id,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        type: 'event_registration',
        registrationId: event.registration_id
      };

      // Create a unique token for this user+event combination
      const qrDataString = `EVENT_${event.id}_USER_${user.id}_${Date.now()}`;

      // Check if QR code already exists for this user+event combination
      const { data: existingQRs, error: fetchError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('event_id', event.id)
        .eq('code_type', 'event_checkin')
        .eq('created_by', user.id)
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      const existingQR = existingQRs && existingQRs.length > 0 ? existingQRs[0] : null;

      let qrRecord;
      if (existingQR) {
        // Update existing QR code (don't create a new entry)
        // Preserve the existing qr_token to keep the QR code the same
        const { data, error } = await supabase
          .from('qr_codes')
          .update({
            qr_data: qrData,
            updated_at: new Date().toISOString()
            // Note: We preserve the existing qr_token so the QR code doesn't change
          })
          .eq('id', existingQR.id)
          .select();

        if (error) throw error;
        qrRecord = data && data.length > 0 ? data[0] : null;
        
        // Store QR code data for client-side generation
        const qrCodeDataString = JSON.stringify(qrData);
        setQrCodeData(qrCodeDataString);
        // Also keep URL for backward compatibility
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(qrCodeDataString)}`;
        setQrCodeUrl(qrUrl);
        return; // Exit early since we're using existing QR code
      } else {
        // Create new QR code only if it doesn't exist
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            code_type: 'event_checkin',
            title: `${event.title} - Check-in QR Code`,
            description: `QR code for event check-in: ${event.title}`,
            created_by: user.id,
            owner_id: user.id,
            event_id: event.id,
            qr_data: qrData,
            qr_token: qrDataString,
            is_active: true,
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        qrRecord = data && data.length > 0 ? data[0] : null;
        
        // Store QR code data for client-side generation
        const qrCodeDataString = JSON.stringify(qrData);
        setQrCodeData(qrCodeDataString);
        // Also keep URL for backward compatibility
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(qrCodeDataString)}`;
        setQrCodeUrl(qrUrl);
      }

    } catch (err: any) {
      console.error('Error generating event QR code:', err);
      setQrError(`Failed to generate QR code: ${err.message || 'Unknown error'}`);
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQRCode = async () => {
    if (!qrCodeUrl || !qrEvent) {
      Alert.alert('Error', 'QR code not available');
      return;
    }

    try {
      setDownloading(true);

      // Check if FileSystem is available
      if (!FileSystem.downloadAsync) {
        Alert.alert('Error', 'File system not available. Please rebuild the app.');
        return;
      }

      // Generate filename from event title
      const sanitizedTitle = qrEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}_qr_code.png`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      // Download the image
      const downloadResult = await FileSystem.downloadAsync(qrCodeUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download QR code');
      }

      // Try to save directly to media library (Photos/Downloads)
      if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
        Alert.alert(
          'Error', 
          'Media library not available. Please rebuild the app with native modules enabled.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const permissionResult = await MediaLibrary.requestPermissionsAsync(true);
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to save the QR code. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create asset in media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      
      // On Android, try to save to Downloads/GanApp folder
      if (Platform.OS === 'android') {
        try {
          const albumName = 'GanApp';
          let album = await MediaLibrary.getAlbumAsync(albumName);
          
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumError) {
          // Album creation failed, but asset is still saved to Photos
          console.log('Album creation error (asset still saved to Photos):', albumError);
        }
      }
      
      Alert.alert('Success', 'QR code downloaded to your Photos/Downloads!');
      
    } catch (err: any) {
      console.error('Error downloading QR code:', err);
      Alert.alert(
        'Download Failed', 
        err.message || 'Unable to download QR code. Please make sure you have granted photo library permissions and rebuild the app if needed.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!user?.role || user?.role !== 'participant') {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 mt-4">Loading your registered events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-white rounded-xl p-6 items-center max-w-md">
            <View className="w-16 h-16 rounded-full bg-red-100 mb-4 items-center justify-center">
              <Ionicons name="alert-circle" size={32} color="#dc2626" />
            </View>
            <Text className="text-red-800 text-lg mb-6 text-center">{error}</Text>
            <TouchableOpacity
              onPress={loadRegisteredEvents}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (registeredEvents.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-white rounded-xl p-6 items-center max-w-md">
            <View className="w-16 h-16 rounded-full bg-blue-100 mb-4 items-center justify-center">
              <Ionicons name="calendar-outline" size={32} color="#2563eb" />
            </View>
            <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">No Registered Events</Text>
            <Text className="text-gray-600 mb-6 text-center">
              You haven't registered for any events yet. Explore available events and join the ones that interest you!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/events')}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Browse Events</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      {/* Header */}
      <View className="bg-blue-900 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <View className="w-10" />
          
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={18} color="#ffffff" />
            <Text className="text-lg font-bold text-white ml-2">My Events</Text>
          </View>
          
          <View className="w-10" />
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
          <Text className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">My Registered Events</Text>
          
          {registeredEvents.map((event) => {
            const eventStatus = getEventStatus(event);
            
            return (
              <View
                key={event.registration_id}
                className="bg-white rounded-xl shadow-md mb-4 overflow-hidden"
              >
                {/* Event Banner */}
                {event.banner_url && (
                  <View className="h-48 overflow-hidden">
                    <Image 
                      source={{ uri: event.banner_url }} 
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                {/* Event Content */}
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-4">
                    <Text className="text-lg font-bold text-slate-800 flex-1">{event.title}</Text>
                    <View className={`ml-2 px-3 py-1 rounded-full ${eventStatus.color}`}>
                      <Text className={`text-xs font-medium ${eventStatus.textColor}`}>
                        {eventStatus.text}
                      </Text>
                    </View>
                  </View>
                  
                  {event.rationale && (
                    <Text className="text-sm text-slate-600 mb-4" numberOfLines={3}>
                      {event.rationale}
                    </Text>
                  )}
                  
                  <View className="space-y-2 mb-4">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-slate-600 ml-2">
                        {formatDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatDate(event.end_date)}`}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-slate-600 ml-2">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </Text>
                    </View>
                    
                    {/* Check-in Window Info */}
                    {(event.check_in_before_minutes || event.check_in_during_minutes) && (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle-outline" size={14} color="#2563eb" />
                        <Text className="text-sm text-blue-600 ml-2">
                          Check-in: {formatCheckInTime(event)} - {formatCheckInEndTime(event)}
                        </Text>
                      </View>
                    )}
                    
                    {event.venue && (
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-slate-600 ml-2" numberOfLines={1}>
                          {event.venue}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Action Buttons */}
                  <View className="gap-2">
                    <TouchableOpacity
                      onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                      className="w-full px-4 py-2 bg-blue-600 rounded-lg"
                    >
                      <Text className="text-white text-sm text-center font-medium">View Details</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleGenerateQR(event)}
                      className="w-full px-4 py-2 bg-green-600 rounded-lg"
                    >
                      <Text className="text-white text-sm text-center font-medium">Generate QR Code</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleTakeEvaluation(event)}
                      className="w-full px-4 py-2 bg-purple-600 rounded-lg"
                    >
                      <Text className="text-white text-sm text-center font-medium">Take Evaluation</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleUnregister(event.id)}
                      className="w-full px-4 py-2 bg-red-600 rounded-lg"
                    >
                      <Text className="text-white text-sm text-center font-medium">Unregister</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          
          <View className="h-6" />
        </ScrollView>
      </View>

      {/* QR Code Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isQRModalOpen}
        onRequestClose={() => setIsQRModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <ScrollView 
            className="w-full max-w-md"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="bg-white rounded-2xl overflow-hidden my-8">
              {/* Header */}
              <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-200">
                <Text className="text-xl font-semibold text-gray-900">Event QR Code</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setIsQRModalOpen(false);
                    setQrCodeUrl('');
                    setQrCodeData('');
                    setQrError(null);
                    setQrEvent(null);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View className="p-6">
              {/* Loading State */}
              {qrLoading && (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-gray-600 mt-4">Generating QR code...</Text>
                </View>
              )}

              {/* Error State */}
              {qrError && !qrLoading && (
                <View className="items-center py-8">
                  <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                    <Ionicons name="alert-circle" size={32} color="#dc2626" />
                  </View>
                  <Text className="text-red-600 mb-4 text-center">{qrError}</Text>
                  <TouchableOpacity
                    onPress={() => qrEvent && generateEventQRCode(qrEvent)}
                    className="bg-blue-600 px-6 py-3 rounded-lg"
                  >
                    <Text className="text-white font-medium">Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* QR Code */}
              {qrCodeData && !qrLoading && !qrError && qrEvent && (
                <View>
                  {/* Modern QR Code Card */}
                  <View 
                    ref={qrCodeViewRef}
                    style={{
                      backgroundColor: '#0f172a', // Dark blue background
                      borderRadius: 24,
                      padding: 24,
                      marginBottom: 24,
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.3,
                      shadowRadius: 20,
                      elevation: 10,
                    }}
                  >
                    {/* Background Pattern Effect */}
                    <View 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 24,
                        opacity: 0.1,
                        backgroundColor: '#1e40af', // Subtle pattern overlay
                      }}
                    />

                    {/* White Card Container */}
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        padding: 20,
                        width: '100%',
                        maxWidth: 320,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      {/* QR Code with Gradient */}
                      <View
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        {qrCodeData ? (
                          <View style={{ position: 'relative' }}>
                            <QRCode
                              value={qrCodeData}
                              size={240}
                              color="#1e3a8a" // Dark blue
                              backgroundColor="#ffffff"
                              quietZone={8}
                              enableLinearGradient={true}
                              linearGradient={['#3b82f6', '#1e40af', '#1e3a8a']}
                              gradientDirection={['0', '0', '240', '240']}
                            />
                          </View>
                        ) : null}
                      </View>

                      {/* User Name */}
                      {user && (
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#2563eb',
                            marginTop: 8,
                            marginBottom: 4,
                          }}
                        >
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.email?.split('@')[0] || 'User'}
                        </Text>
                      )}

                      {/* Event Title */}
                      <Text
                        style={{
                          fontSize: 14,
                          color: '#64748b',
                          textAlign: 'center',
                          marginBottom: 12,
                        }}
                      >
                        {qrEvent.title}
                      </Text>
                    </View>

                    {/* Scan Instruction */}
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#94a3b8',
                        marginTop: 16,
                        textAlign: 'center',
                      }}
                    >
                      Scan for event check-in
                    </Text>
                  </View>

                  {/* Event Info */}
                  <View className="bg-blue-50 rounded-xl p-4 mb-4">
                    <Text className="font-semibold text-gray-800 mb-2">{qrEvent.title}</Text>
                    <View className="space-y-1">
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-600 ml-2">
                          {formatDate(qrEvent.start_date)}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-600 ml-2">
                          {formatTime(qrEvent.start_time)}
                        </Text>
                      </View>
                      {qrEvent.venue && (
                        <View className="flex-row items-center">
                          <Ionicons name="location-outline" size={14} color="#6b7280" />
                          <Text className="text-sm text-gray-600 ml-2">{qrEvent.venue}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Download Button */}
                  <TouchableOpacity
                    onPress={downloadQRCode}
                    disabled={downloading}
                    style={{
                      backgroundColor: '#16a34a',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                  >
                    {downloading ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: '500', marginLeft: 8 }}>
                          Downloading...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={20} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: '500', marginLeft: 8 }}>
                          Download PNG
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

