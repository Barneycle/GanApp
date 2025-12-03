import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';
import { stripHtmlTags } from '../../lib/htmlUtils';
import TutorialOverlay from '../../components/TutorialOverlay';

type DateFilter = 'all' | 'upcoming' | 'past';
type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'participants-asc' | 'participants-desc';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showFilters, setShowFilters] = useState(false);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  // Check if user is organizer or admin
  const isOrganizer = currentUser?.role === 'organizer' || currentUser?.role === 'admin';

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await EventService.getPublishedEvents();
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
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

  // Get unique venues from events
  const uniqueVenues = useMemo(() => {
    const venues = events
      .map(event => event.venue)
      .filter((venue): venue is string => !!venue && venue !== 'Location TBD' && venue.trim() !== '');
    return Array.from(new Set(venues)).sort();
  }, [events]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query)) ||
        (event.rationale && stripHtmlTags(event.rationale).toLowerCase().includes(query))
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.start_date) >= now);
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.end_date) < now);
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
        case 'participants-asc':
          return (a.current_participants || 0) - (b.current_participants || 0);
        case 'participants-desc':
          return (b.current_participants || 0) - (a.current_participants || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, searchQuery, dateFilter, venueFilter, sortOption]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <Text className="text-blue-100">Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-white text-lg font-semibold mb-4">Error Loading Events</Text>
          <Text className="text-blue-100 text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={loadEvents}
            className="bg-blue-700 px-6 py-3 rounded-md"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="events"
        steps={[
          {
            id: '1',
            title: 'Browse Events',
            description: 'This screen shows all available events. Browse through events and tap on any event to see details and register.',
          },
          {
            id: '2',
            title: 'Register for Events',
            description: 'Tap on an event card to view full details, read descriptions, and register to participate.',
          },
        ]}
      />

      <View className="flex-1 mx-4 my-2">
        {/* Search Bar */}
        <View className="mb-4">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-md">
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-slate-800"
              placeholder="Search events..."
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
              const sortOptions: SortOption[] = ['date-asc', 'date-desc', 'title-asc', 'title-desc', 'participants-asc', 'participants-desc'];
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
               sortOption === 'participants-asc' ? 'Participants ↑' :
               'Participants ↓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <Text className="text-lg font-bold text-slate-800 mb-3">Date Filter</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(['all', 'upcoming', 'past'] as DateFilter[]).map((filter) => (
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
                    {filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : 'Past'}
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
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            paddingTop: 8,
            paddingBottom: 70 + Math.max(insets.bottom, 8) + 20 // Tab bar height + safe area + extra padding
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
          {/* Create New Event Button - Only for organizers/admins */}
          {isOrganizer && (
            <View className="mb-5">
              <TouchableOpacity
                onPress={() => router.push('/create-event')}
                className="px-6 py-4 rounded-2xl flex-row items-center justify-center"
                style={{
                  backgroundColor: '#10b981',
                }}
              >
                <Ionicons name="add-circle" size={22} color="#ffffff" />
                <Text className="text-white font-bold text-lg ml-2">Create New Event</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Upcoming Events Section Card */}
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
                backgroundColor: '#F8FAFC',
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}
            >
              <View className="flex-row items-center">
                <View 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <Ionicons name="calendar" size={22} color="#2563eb" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">
                  {filteredAndSortedEvents.length === events.length 
                    ? 'Upcoming Events' 
                    : `Events (${filteredAndSortedEvents.length}${events.length > 0 ? ` of ${events.length}` : ''})`}
                </Text>
              </View>
            </View>
            
            {/* Card Content */}
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
                {events.length === 0 ? 'No Events Available' : 'No Events Match Your Filters'}
              </Text>
                  <Text className="text-gray-500 text-center text-sm">
                {events.length === 0 
                  ? 'Check back later for upcoming events.'
                  : 'Try adjusting your search or filters.'}
              </Text>
            </View>
          ) : (
                filteredAndSortedEvents.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                    className="rounded-2xl overflow-hidden"
                    style={[
                      {
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 3,
                        marginBottom: index < events.length - 1 ? 16 : 0,
                      }
                    ]}
                onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              >
                <Image 
                  source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }} 
                      className="w-full h-40"
                  resizeMode="cover"
                />
                
                    <View className="p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <View 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: '#DBEAFE' }}
                        >
                          <Text className="text-xs font-semibold text-blue-700">Event</Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={14} color="#64748b" />
                          <Text className="text-xs text-slate-500 ml-1">
                            {event.current_participants || 0}/{event.max_participants || '∞'}
                    </Text>
                        </View>
                  </View>
                  
                      <Text className="text-lg font-bold text-slate-900 mb-3" numberOfLines={2}>
                        {event.title}
                      </Text>
                  
                      <View className="space-y-2 mb-3">
                    <View className="flex-row items-center">
                          <View 
                            className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                            style={{ backgroundColor: '#FEF3C7' }}
                          >
                            <Ionicons name="calendar-outline" size={14} color="#D97706" />
                          </View>
                          <Text className="text-sm text-slate-700 flex-1">
                        {formatDate(event.start_date)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                          <View 
                            className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                            style={{ backgroundColor: '#DCFCE7' }}
                          >
                            <Ionicons name="time-outline" size={14} color="#16A34A" />
                          </View>
                          <Text className="text-sm text-slate-700 flex-1">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                          <View 
                            className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                            style={{ backgroundColor: '#DBEAFE' }}
                          >
                            <Ionicons name="location-outline" size={14} color="#2563EB" />
                          </View>
                          <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                        {event.venue || 'Location TBD'}
                      </Text>
                    </View>
                  </View>
                  
                      <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 mt-3">
                        <Text className="text-xs text-slate-400">
                          Tap to view details
                  </Text>
                        <View className="flex-row items-center">
                          <Text className="text-sm font-semibold text-blue-600 mr-1">View</Text>
                          <Ionicons name="arrow-forward" size={16} color="#2563eb" />
                        </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
