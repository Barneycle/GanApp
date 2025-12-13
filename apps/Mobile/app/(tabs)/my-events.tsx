import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
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
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles, stripHtmlTags } from '../../lib/htmlUtils';
import RenderHTML from 'react-native-render-html';
import TutorialOverlay from '../../components/TutorialOverlay';
import { useToast } from '../../components/Toast';
import CertificateGeneratorModal from '../../components/CertificateGeneratorModal';

type DateFilter = 'all' | 'upcoming' | 'ongoing' | 'completed';
type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'registration-asc' | 'registration-desc';

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
  const [refreshing, setRefreshing] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<RegisteredEvent | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedRationale, setExpandedRationale] = useState<Set<string>>(new Set());
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certificateEventId, setCertificateEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showFilters, setShowFilters] = useState(false);
  const qrCodeViewRef = React.useRef<any>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const shouldCollapseRationale = (rationale: string): boolean => {
    if (!rationale) return false;
    // Check if content is long (more than 300 characters) or has multiple paragraphs
    const textContent = rationale.replace(/<[^>]*>/g, ''); // Strip HTML tags
    const hasMultipleParagraphs = (rationale.match(/<p>/g) || []).length > 1;
    return textContent.length > 300 || hasMultipleParagraphs;
  };

  const toggleRationale = (eventId: string) => {
    setExpandedRationale(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

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

  // Refresh when screen comes into focus (e.g., after registering for an event)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id && user?.role === 'participant') {
        loadRegisteredEvents();
      }
    }, [user?.id, user?.role])
  );

  const loadRegisteredEvents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await EventService.getUserRegistrations(user.id);
      
      if (result.error) {
        console.error('Error loading registrations:', result.error);
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
      console.error('Exception loading registered events:', err);
      setError('Failed to load your registered events');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRegisteredEvents();
    setRefreshing(false);
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

  // Get unique venues from registered events
  const uniqueVenues = useMemo(() => {
    const venues = registeredEvents
      .map(event => event.venue)
      .filter((venue): venue is string => !!venue && venue !== 'Location TBD' && venue.trim() !== '');
    return Array.from(new Set(venues)).sort();
  }, [registeredEvents]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...registeredEvents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query)) ||
        (event.rationale && stripHtmlTags(event.rationale).toLowerCase().includes(query))
      );
    }

    // Date/Status filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => {
        const startDate = new Date(`${event.start_date}T${event.start_time}`);
        return now < startDate;
      });
    } else if (dateFilter === 'ongoing') {
      filtered = filtered.filter(event => {
        const startDate = new Date(`${event.start_date}T${event.start_time}`);
        const endDate = new Date(`${event.end_date}T${event.end_time}`);
        return now >= startDate && now <= endDate;
      });
    } else if (dateFilter === 'completed') {
      filtered = filtered.filter(event => {
        const endDate = new Date(`${event.end_date}T${event.end_time}`);
        return now > endDate;
      });
    }

    // Venue filter
    if (venueFilter !== 'all') {
      filtered = filtered.filter(event => event.venue === venueFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'date-desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'registration-asc':
          return new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime();
        case 'registration-desc':
          return new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [registeredEvents, searchQuery, dateFilter, venueFilter, sortOption]);

  const handleUnregister = async (eventId: string) => {
    if (!user?.id) return;

    // Use EventService.unregisterFromEvent for consistency
    try {
      const result = await EventService.unregisterFromEvent(eventId, user.id);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        // Remove the event from the list
        setRegisteredEvents(prev => prev.filter(event => event.id !== eventId));
        toast.success('Successfully unregistered from event');
      }
    } catch (err) {
      toast.error('Failed to unregister from event');
    }
  };

  const handleTakeEvaluation = async (event: RegisteredEvent) => {
    try {
      // Get survey for this event
      const surveyResult = await SurveyService.getSurveyByEventId(event.id, user?.id || '');
      
      if (surveyResult.error) {
        toast.error(surveyResult.error);
      } else if (surveyResult.survey) {
        router.push(`/evaluation?id=${surveyResult.survey.id}`);
      } else {
        toast.warning('No survey is available for this event yet.');
      }
    } catch (err) {
      toast.error('Failed to load survey. Please try again.');
    }
  };

  const handleGenerateQR = async (event: RegisteredEvent) => {
    if (!user?.id) {
      toast.error('You must be logged in to generate a QR code');
      return;
    }

    setQrEvent(event);
    setQrCodeUrl('');
    setQrCodeData('');
    setQrError(null);
    setIsQRModalOpen(true);
    await generateEventQRCode(event);
  };

  const handleSnapPhoto = async (event: RegisteredEvent) => {
    // Navigate to camera screen with event ID
    router.push({
      pathname: '/camera',
      params: { eventId: event.id },
    } as any);
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
    if (!qrCodeViewRef.current || !qrEvent) {
      toast.error('QR code not available');
      return;
    }

    try {
      setDownloading(true);

      // Check if FileSystem is available
      if (!FileSystem.cacheDirectory) {
        toast.error('File system not available. Please rebuild the app.');
        return;
      }

      // Generate filename from event title
      const sanitizedTitle = qrEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}_qr_code.png`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      // Capture the styled QR code view as an image
      const uri = await captureRef(qrCodeViewRef.current, {
        format: 'png',
        quality: 1.0,
      });

      if (!uri) {
        throw new Error('Failed to capture QR code');
      }

      // Try to save directly to media library (Photos/Downloads)
      if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
        toast.error('Media library not available. Please rebuild the app with native modules enabled.');
        return;
      }

      // Request permissions
      const permissionResult = await MediaLibrary.requestPermissionsAsync(true);
      
      if (!permissionResult.granted) {
        toast.warning('Please grant photo library access to save the QR code. You can enable it in your device settings.');
        return;
      }

      // Create asset in media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      
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
      
      toast.success('QR code downloaded to your Photos/Downloads!');
      
    } catch (err: any) {
      console.error('Error downloading QR code:', err);
      toast.error(err.message || 'Unable to download QR code. Please make sure you have granted photo library permissions.');
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
              className="bg-blue-600 px-6 py-4 rounded-xl"
            >
              <Text className="text-white font-semibold text-base">Try Again</Text>
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
              className="bg-blue-600 px-6 py-4 rounded-xl"
            >
              <Text className="text-white font-semibold text-base">Browse Events</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="my-events"
        steps={[
          {
            id: '1',
            title: 'My Events',
            description: 'This screen shows all events you have registered for. You can view event details, access your QR code for check-in, and take surveys.',
          },
          {
            id: '2',
            title: 'Event Actions',
            description: 'For each event, you can: View QR code for check-in and Take evaluation surveys.',
          },
        ]}
      />

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 20) + 80 // Account for tab bar height
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
      >
        {/* Search Bar */}
        <View className="mb-4 mt-2">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-md">
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-slate-800"
              placeholder="Search your events..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter and Sort Controls */}
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-1 flex-row items-center justify-center bg-white rounded-xl px-4 py-3 shadow-md"
          >
            <Ionicons name="filter" size={18} color="#1e40af" />
            <Text className="ml-2 text-slate-800 font-medium">Filters</Text>
            {(dateFilter !== 'all' || venueFilter !== 'all') && (
              <View className="ml-2 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-white rounded-xl px-4 py-3 shadow-md"
            onPress={() => {
              // Cycle through sort options
              const sortOptions: SortOption[] = ['date-asc', 'date-desc', 'title-asc', 'title-desc', 'registration-asc', 'registration-desc'];
              const currentIndex = sortOptions.indexOf(sortOption);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortOption(sortOptions[nextIndex]);
            }}
          >
            <Ionicons name="swap-vertical" size={18} color="#1e40af" />
            <Text className="ml-2 text-slate-800 font-medium">
              {sortOption === 'date-asc' ? 'Date ↑' :
               sortOption === 'date-desc' ? 'Date ↓' :
               sortOption === 'title-asc' ? 'Title A-Z' :
               sortOption === 'title-desc' ? 'Title Z-A' :
               sortOption === 'registration-asc' ? 'Registration ↑' :
               'Registration ↓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <Text className="text-lg font-bold text-slate-800 mb-3">Status Filter</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(['all', 'upcoming', 'ongoing', 'completed'] as DateFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setDateFilter(filter)}
                  className={`px-4 py-2 rounded-lg ${
                    dateFilter === filter ? 'bg-blue-600' : 'bg-slate-100'
                  }`}
                >
                  <Text className={`font-medium ${
                    dateFilter === filter ? 'text-white' : 'text-slate-700'
                  }`}>
                    {filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : filter === 'ongoing' ? 'Ongoing' : 'Completed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {uniqueVenues.length > 0 && (
              <>
                <Text className="text-lg font-bold text-slate-800 mb-3">Venue</Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => setVenueFilter('all')}
                    className={`px-4 py-2 rounded-lg ${
                      venueFilter === 'all' ? 'bg-blue-600' : 'bg-slate-100'
                    }`}
                  >
                    <Text className={`font-medium ${
                      venueFilter === 'all' ? 'text-white' : 'text-slate-700'
                    }`}>
                      All Venues
                    </Text>
                  </TouchableOpacity>
                  {uniqueVenues.map((venue) => (
                    <TouchableOpacity
                      key={venue}
                      onPress={() => setVenueFilter(venue)}
                      className={`px-4 py-2 rounded-lg ${
                        venueFilter === venue ? 'bg-blue-600' : 'bg-slate-100'
                      }`}
                    >
                      <Text className={`font-medium ${
                        venueFilter === venue ? 'text-white' : 'text-slate-700'
                      }`}>
                        {venue}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
          {/* My Registered Events Section Card */}
          <View 
            className="rounded-3xl overflow-hidden"
            style={{ 
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Card Header */}
            <View 
              className="px-6 py-5"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}
            >
              <View className="flex-row items-center">
                <View 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <Ionicons name="calendar-outline" size={22} color="#2563eb" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">
                  {filteredAndSortedEvents.length === registeredEvents.length 
                    ? 'My Registered Events' 
                    : `My Events (${filteredAndSortedEvents.length}${registeredEvents.length > 0 ? ` of ${registeredEvents.length}` : ''})`}
                </Text>
              </View>
            </View>
            
            {/* Events List */}
            <View className="p-5">
              {filteredAndSortedEvents.length === 0 ? (
                <View className="py-12 items-center">
                  <View 
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <Ionicons name="calendar-outline" size={40} color="#64748b" />
                  </View>
                  <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
                    {registeredEvents.length === 0 ? 'No Registered Events' : 'No Events Match Your Filters'}
                  </Text>
                  <Text className="text-gray-500 text-center text-sm">
                    {registeredEvents.length === 0 
                      ? 'You haven\'t registered for any events yet.'
                      : 'Try adjusting your search or filters.'}
                  </Text>
                </View>
              ) : (
                filteredAndSortedEvents.map((event) => {
            const eventStatus = getEventStatus(event);
            
            return (
              <View
                key={event.registration_id}
                      className="rounded-2xl overflow-hidden mb-6"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 3,
                      }}
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
                <View className="p-5">
                  <View className="flex-row items-start justify-between mb-4">
                    <Text className="text-xl font-bold text-slate-800 flex-1">{event.title}</Text>
                    <View className={`ml-2 px-3 py-1 rounded-full ${eventStatus.color}`}>
                      <Text className={`text-sm font-medium ${eventStatus.textColor}`}>
                        {eventStatus.text}
                      </Text>
                    </View>
                  </View>
                  
                  {event.rationale && (
                    <View className="mb-4">
                      <View className="bg-blue-50 p-4 rounded-xl">
                        <View style={{ maxHeight: expandedRationale.has(event.id) ? undefined : 150, overflow: 'hidden' }}>
                          <RenderHTML
                            contentWidth={getHtmlContentWidth(36)}
                            source={{ html: decodeHtml(event.rationale) }}
                            baseStyle={{
                              ...defaultHtmlStyles.baseStyle,
                              fontSize: 16,
                              lineHeight: 24,
                            }}
                            tagsStyles={defaultHtmlStyles.tagsStyles}
                            enableExperimentalMarginCollapsing={true}
                          />
                        </View>
                        {shouldCollapseRationale(event.rationale) && (
                          <TouchableOpacity
                            onPress={() => toggleRationale(event.id)}
                            className="mt-3 flex-row items-center justify-center"
                          >
                            <Text className="text-blue-600 font-semibold text-sm">
                              {expandedRationale.has(event.id) ? 'Read Less' : 'Read More'}
                            </Text>
                            <Ionicons 
                              name={expandedRationale.has(event.id) ? 'chevron-up' : 'chevron-down'} 
                              size={16} 
                              color="#2563eb" 
                              style={{ marginLeft: 4 }}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                  
                  <View className="space-y-2.5 mb-4">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                      <Text className="text-base text-slate-600 ml-2">
                        {formatDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatDate(event.end_date)}`}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={18} color="#6b7280" />
                      <Text className="text-base text-slate-600 ml-2">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </Text>
                    </View>
                    
                    {/* Check-in Window Info */}
                    {(event.check_in_before_minutes || event.check_in_during_minutes) && (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle-outline" size={18} color="#2563eb" />
                        <Text className="text-base text-blue-600 ml-2">
                          Check-in: {formatCheckInTime(event)} - {formatCheckInEndTime(event)}
                        </Text>
                      </View>
                    )}
                    
                    {event.venue && (
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={18} color="#6b7280" />
                        <Text className="text-base text-slate-600 ml-2" numberOfLines={1}>
                          {event.venue}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Action Buttons - 3x3 Grid */}
                  <View 
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      marginTop: 8,
                      marginHorizontal: -4,
                    }}
                  >
                    {/* Row 1 - Primary Actions (Navy Blue) */}
                    <TouchableOpacity
                      onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#1e40af',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="information-circle" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        View Details
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleGenerateQR(event)}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#1e40af',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="qr-code" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        Generate QR Code
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleTakeEvaluation(event)}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#1e40af',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="clipboard-outline" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        Take Evaluation
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setCertificateEventId(event.id);
                        setIsCertificateModalOpen(true);
                      }}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#1e40af',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="document-text" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        Generate Certificate
                      </Text>
                    </TouchableOpacity>
                          
                    <TouchableOpacity
                      onPress={() => handleSnapPhoto(event)}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#3b82f6',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="camera" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        Snap Photo
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleUnregister(event.id)}
                      style={{
                        width: '31%',
                        margin: '1%',
                        backgroundColor: '#dc2626',
                        borderRadius: 10,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 75,
                      }}
                    >
                      <Ionicons name="person-remove" size={24} color="#ffffff" />
                      <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                        Unregister
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
                })
              )}
            </View>
          </View>
      </ScrollView>

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
                  <ViewShot 
                    ref={qrCodeViewRef}
                    options={{ format: 'png', quality: 1.0 }}
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
                  </ViewShot>

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

      {/* Certificate Generator Modal */}
      {isCertificateModalOpen && certificateEventId && (
        <CertificateGeneratorModal
          visible={isCertificateModalOpen}
          eventId={certificateEventId}
          onClose={() => {
            setIsCertificateModalOpen(false);
            setCertificateEventId(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

