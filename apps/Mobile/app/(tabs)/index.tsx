import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles, stripHtmlTags } from '../../lib/htmlUtils';

const { width: screenWidth } = Dimensions.get('window');

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Swipe functionality state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEvents();
    loadFeaturedEvent();
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, authLoading, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<{ events: Event[]; error?: string }>((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      
      // Fetch published events for the home page
      const eventsPromise = EventService.getPublishedEvents();
      
      const result = await Promise.race([eventsPromise, timeoutPromise]);
      
      if (result.error) {
        setError(result.error);
        setEvents([]);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events from database');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedEvent = async () => {
    try {
      const result = await EventService.getFeaturedEvent();
      if (result.event) {
        setFeaturedEvent(result.event);
      }
    } catch (err) {
      // Silently fail - will fallback to first event
    }
  };

  // Use the featured event, or fallback to first event
  const displayFeaturedEvent = featuredEvent || events[0];

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


  // Navigation functions for carousel
  const scrollLeft = () => {
    setCurrentEventIndex((prev) => {
      const newIndex = prev - 1;
      if (newIndex < 0) {
        return events.length - 1;
      }
      return newIndex;
    });
  };

  const scrollRight = () => {
    setCurrentEventIndex((prev) => {
      const newIndex = prev + 1;
      if (newIndex >= events.length) {
        return 0;
      }
      return newIndex;
    });
  };

  // Swipe functionality
  const minSwipeDistance = 50;

  const onTouchStart = (e: any) => {
    setTouchEnd(null);
    setTouchStart(e.nativeEvent.pageX);
  };

  const onTouchMove = (e: any) => {
    setTouchEnd(e.nativeEvent.pageX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      scrollRight();
    }
    if (isRightSwipe) {
      scrollLeft();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (loading || authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-slate-600 text-lg mt-4">Loading events...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 items-center justify-center px-4">
        <View className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
          <View className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 items-center justify-center">
            <Ionicons name="alert-circle" size={32} color="#dc2626" />
          </View>
          <Text className="text-lg font-semibold text-slate-800 mb-2 text-center">Error Loading Events</Text>
          <Text className="text-slate-600 mb-4 text-center">{error}</Text>
          <TouchableOpacity
            onPress={loadEvents}
            className="bg-blue-600 py-3 px-4 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!currentUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} className="items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 20)
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-6xl mx-auto">
          {/* Single Featured Event Card */}
          {displayFeaturedEvent && (
            <View className="rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-12" style={{ backgroundColor: '#FAFAFA' }}>
              {/* Banner Image */}
              <View className="w-full h-64 overflow-hidden">
                <Image
                  source={{ uri: displayFeaturedEvent.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              
              {/* Event Content */}
              <View className="p-8">
                {/* Event Title */}
                <View className="items-center mb-6">
                  <Text className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-3 text-center">
                    {displayFeaturedEvent.title}
                  </Text>
                </View>

                {/* Event Rationale */}
                {displayFeaturedEvent.rationale && (
                  <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                      <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center mr-3">
                        <Ionicons name="bulb" size={24} color="white" />
                      </View>
                      <Text className="text-xl font-semibold text-slate-800">Event Rationale</Text>
                    </View>
                    <RenderHTML
                      contentWidth={getHtmlContentWidth(64)}
                      source={{ html: decodeHtml(displayFeaturedEvent.rationale) }}
                      baseStyle={defaultHtmlStyles.baseStyle}
                      tagsStyles={defaultHtmlStyles.tagsStyles}
                      enableExperimentalMarginCollapsing={true}
                    />
                  </View>
                )}

                {/* View Details Button */}
                <View className="items-center">
                  <TouchableOpacity
                    onPress={() => router.push(`/event-details?eventId=${displayFeaturedEvent.id}`)}
                    className="bg-blue-600 px-8 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-medium text-base">View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          
          {/* Events Carousel Card */}
          {events.length > 0 ? (
            <View className="mb-12">
              {/* Section Header with Title and Navigation */}
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-slate-800 mb-1">Upcoming Events</Text>
                  <Text className="text-slate-600 text-base">Discover and explore our upcoming events</Text>
                </View>
                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={scrollLeft}
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                  >
                    <Ionicons name="chevron-back" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={scrollRight}
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                  >
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Carousel Container */}
              <View 
                className="relative overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                  decelerationRate="fast"
                  snapToInterval={screenWidth - 32}
                  snapToAlignment="start"
                >
                  {events.map((event, index) => (
                    <TouchableOpacity
                      key={event.id}
                      className="w-80 rounded-lg overflow-hidden bg-white shadow-sm mr-6"
                      onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                      style={{ width: screenWidth - 32 }}
                    >
                      <Image
                        source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                        className="w-full h-48"
                        resizeMode="cover"
                      />
                      <View className="p-4">
                        <Text className="font-semibold text-lg text-gray-800 mb-2">{event.title}</Text>
                        <Text className="text-gray-600 text-sm mt-2 mb-3" numberOfLines={3}>
                          {(() => {
                            const text = stripHtmlTags(event.description || event.rationale || 'Experience something amazing');
                            return text.length > 150 ? text.substring(0, 150) + '...' : text;
                          })()}
                        </Text>
                        <View className="mt-3">
                          <View className="flex-row items-center mb-1">
                            <Ionicons name="calendar" size={16} color="#6b7280" />
                            <Text className="text-xs text-gray-500 ml-1">{formatDate(event.start_date)}</Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="time" size={16} color="#6b7280" />
                            <Text className="text-xs text-gray-500 ml-1">
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* See All Button */}
              <View className="flex-row justify-end mt-6">
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/events')}
                  className="bg-blue-600 px-6 py-3 rounded-xl items-center flex-row"
                >
                  <Text className="text-white font-medium mr-2">See All</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            !loading && (
              <View className="rounded-2xl shadow-lg border border-slate-100 p-8 mb-12" style={{ backgroundColor: '#FAFAFA' }}>
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-blue-100 mb-4 items-center justify-center">
                    <Ionicons name="calendar-outline" size={32} color="#2563eb" />
                  </View>
                  <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">No Upcoming Events</Text>
                  <Text className="text-gray-600 text-center">
                    There are no upcoming events at the moment. Check back later for new events!
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
