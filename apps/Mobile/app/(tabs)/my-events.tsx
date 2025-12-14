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
  Platform,
  Linking,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { SurveyService } from '../../lib/surveyService';
import { useAuth } from '../../lib/authContext';
import { supabase } from '../../lib/supabase';
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles, stripHtmlTags } from '../../lib/htmlUtils';
import RenderHTML from 'react-native-render-html';
import TutorialOverlay from '../../components/TutorialOverlay';
import { useToast } from '../../components/Toast';

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
  const [expandedRationale, setExpandedRationale] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [eventStatuses, setEventStatuses] = useState<Record<string, { isCheckedIn: boolean; isValidated: boolean; surveyCompleted: boolean; isSurveyAvailable: boolean }>>({});
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

        // Check check-in and survey completion status for each event
        if (user?.id && events.length > 0) {
          const statusPromises = events.map(async (event) => {
            const [checkInResult, surveyResult, surveyAvailabilityResult] = await Promise.all([
              EventService.checkUserCheckInStatus(event.id, user.id),
              EventService.checkUserSurveyCompletion(event.id, user.id),
              SurveyService.getSurveysByEvent(event.id)
            ]);

            // Check if survey is available (active and open)
            let isSurveyAvailable = false;
            if (surveyAvailabilityResult.surveys && surveyAvailabilityResult.surveys.length > 0) {
              const activeSurvey = surveyAvailabilityResult.surveys.find(s => s.is_active) || surveyAvailabilityResult.surveys[0];
              if (activeSurvey) {
                const now = new Date();
                const isActive = activeSurvey.is_active;
                const isOpen = activeSurvey.is_open;
                const opensAt = activeSurvey.opens_at ? new Date(activeSurvey.opens_at) : null;
                const closesAt = activeSurvey.closes_at ? new Date(activeSurvey.closes_at) : null;

                isSurveyAvailable = isActive && isOpen &&
                  (!opensAt || now >= opensAt) &&
                  (!closesAt || now <= closesAt);
              }
            }

            return {
              eventId: event.id,
              isCheckedIn: checkInResult.isCheckedIn || false,
              isValidated: checkInResult.isValidated || false,
              surveyCompleted: surveyResult.isCompleted || false,
              isSurveyAvailable: isSurveyAvailable
            };
          });

          const statuses = await Promise.all(statusPromises);
          const statusMap: Record<string, { isCheckedIn: boolean; isValidated: boolean; surveyCompleted: boolean; isSurveyAvailable: boolean }> = {};
          statuses.forEach(status => {
            statusMap[status.eventId] = {
              isCheckedIn: status.isCheckedIn,
              isValidated: status.isValidated,
              surveyCompleted: status.surveyCompleted,
              isSurveyAvailable: status.isSurveyAvailable
            };
          });
          setEventStatuses(statusMap);
        }
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

  const handleGenerateQR = (event: RegisteredEvent) => {
    if (!user?.id) {
      toast.error('You must be logged in to generate a QR code');
      return;
    }

    router.push({
      pathname: '/qr-generator',
      params: {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.start_date,
        eventTime: event.start_time,
        eventVenue: event.venue || '',
      },
    } as any);
  };

  const handleSnapPhoto = async (event: RegisteredEvent) => {
    // Navigate to camera screen with event ID
    router.push({
      pathname: '/camera',
      params: { eventId: event.id },
    } as any);
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
            description: 'This screen shows all events you have registered for. You can view event details, access your QR code for check-in, and take evaluations.',
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
                  className={`px-4 py-2 rounded-lg ${dateFilter === filter ? 'bg-blue-600' : 'bg-slate-100'
                    }`}
                >
                  <Text className={`font-medium ${dateFilter === filter ? 'text-white' : 'text-slate-700'
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
                    className={`px-4 py-2 rounded-lg ${venueFilter === 'all' ? 'bg-blue-600' : 'bg-slate-100'
                      }`}
                  >
                    <Text className={`font-medium ${venueFilter === 'all' ? 'text-white' : 'text-slate-700'
                      }`}>
                      All Venues
                    </Text>
                  </TouchableOpacity>
                  {uniqueVenues.map((venue) => (
                    <TouchableOpacity
                      key={venue}
                      onPress={() => setVenueFilter(venue)}
                      className={`px-4 py-2 rounded-lg ${venueFilter === venue ? 'bg-blue-600' : 'bg-slate-100'
                        }`}
                    >
                      <Text className={`font-medium ${venueFilter === venue ? 'text-white' : 'text-slate-700'
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
                const eventStatusData = eventStatuses[event.id] || { isCheckedIn: false, isValidated: false, surveyCompleted: false, isSurveyAvailable: false };
                const canTakeSurvey = eventStatusData.isCheckedIn && eventStatusData.isSurveyAvailable;
                const canGenerateCert = eventStatusData.isCheckedIn && eventStatusData.isValidated && eventStatusData.surveyCompleted;

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
                          onPress={() => {
                            if (!eventStatusData.isCheckedIn) {
                              toast.warning('Please check in to the event first before taking the survey.');
                              return;
                            }
                            if (!eventStatusData.isSurveyAvailable) {
                              toast.warning('The survey for this event is currently closed or not available.');
                              return;
                            }
                            handleTakeEvaluation(event);
                          }}
                          disabled={!canTakeSurvey}
                          style={{
                            width: '31%',
                            margin: '1%',
                            backgroundColor: canTakeSurvey ? '#1e40af' : '#9ca3af',
                            borderRadius: 10,
                            padding: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 75,
                            opacity: canTakeSurvey ? 1 : 0.6,
                          }}
                        >
                          <Ionicons name="clipboard-outline" size={24} color="#ffffff" />
                          <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                            Take Evaluation
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            if (!canGenerateCert) {
                              if (!eventStatusData.isCheckedIn) {
                                toast.warning('Please check in to the event first.');
                              } else if (!eventStatusData.isValidated) {
                                toast.warning('Your attendance must be validated by the organizer before generating a certificate.');
                              } else if (!eventStatusData.surveyCompleted) {
                                toast.warning('Please complete the survey/evaluation first.');
                              }
                              return;
                            }
                            router.push(`/certificate?eventId=${event.id}`);
                          }}
                          disabled={!canGenerateCert}
                          style={{
                            width: '31%',
                            margin: '1%',
                            backgroundColor: canGenerateCert ? '#1e40af' : '#9ca3af',
                            borderRadius: 10,
                            padding: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 75,
                            opacity: canGenerateCert ? 1 : 0.6,
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
                          onPress={() => router.push(`/event-messages?eventId=${event.id}`)}
                          style={{
                            width: '31%',
                            margin: '1%',
                            backgroundColor: '#10b981',
                            borderRadius: 10,
                            padding: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 75,
                          }}
                        >
                          <Ionicons name="chatbubbles" size={24} color="#ffffff" />
                          <Text className="text-white text-xs text-center font-semibold mt-1.5" numberOfLines={2}>
                            Contact Organizer
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


    </SafeAreaView>
  );
}

