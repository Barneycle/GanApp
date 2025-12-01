import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Dimensions, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles, stripHtmlTags } from '../../lib/htmlUtils';
import TutorialOverlay from '../../components/TutorialOverlay';

const { width: screenWidth } = Dimensions.get('window');
const CONTAINER_PADDING = 16; // Padding inside the container card
const CARD_WIDTH = screenWidth * 0.85;
const CARD_MARGIN = 16;
const CARD_SPACING = CARD_WIDTH + CARD_MARGIN;
// Container width is screen width minus outer padding (typically 16px on each side for the main container)
const CONTAINER_WIDTH = screenWidth - (CONTAINER_PADDING * 2);
const CARD_OFFSET = (CONTAINER_WIDTH - CARD_WIDTH) / 2;

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const carouselContainerRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(screenWidth - 72); // Default estimate
  
  // Calculate snap offsets for centering each card within the container card
  // Each card should snap so its center aligns with the container center
  const snapOffsets = events.map((_, index) => {
    // Card position in scroll content (accounting for container padding)
    const cardLeftInContent = index * CARD_SPACING;
    // Card center position in scroll content
    const cardCenterInContent = cardLeftInContent + CARD_WIDTH / 2;
    // Scroll offset needed to center card within container (card center - container center)
    return cardCenterInContent - containerWidth / 2;
  });

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadEvents(), loadFeaturedEvent()]);
    } finally {
      setRefreshing(false);
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
    if (events.length === 0) return;
    
    setCurrentEventIndex((prev) => {
      const newIndex = prev - 1;
      if (newIndex < 0) {
        const targetIndex = events.length - 1;
        // Scroll to the last event
        setTimeout(() => {
          const offset = snapOffsets[targetIndex] || 0;
          scrollViewRef.current?.scrollTo({ x: offset, animated: true });
        }, 0);
        return targetIndex;
      }
      // Scroll to the previous event
      setTimeout(() => {
        const offset = snapOffsets[newIndex] || 0;
        scrollViewRef.current?.scrollTo({ x: offset, animated: true });
      }, 0);
      return newIndex;
    });
  };

  const scrollRight = () => {
    if (events.length === 0) return;
    
    setCurrentEventIndex((prev) => {
      const newIndex = prev + 1;
      if (newIndex >= events.length) {
        // Scroll to the first event
        setTimeout(() => {
          const offset = snapOffsets[0] || 0;
          scrollViewRef.current?.scrollTo({ x: offset, animated: true });
        }, 0);
        return 0;
      }
      // Scroll to the next event
      setTimeout(() => {
        const offset = snapOffsets[newIndex] || 0;
        scrollViewRef.current?.scrollTo({ x: offset, animated: true });
      }, 0);
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
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-blue-100 text-lg mt-4">Loading events...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-4">
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
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="home"
        steps={[
          {
            id: '1',
            title: 'Welcome to GanApp!',
            description: 'This is your home screen. Here you can browse featured events and upcoming events. Swipe left or right on event cards to see more events.',
          },
          {
            id: '2',
            title: 'View Event Details',
            description: 'Tap on any event card to see full details, register, and access event features like surveys and certificates.',
          },
        ]}
      />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 20)
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={["#2563eb"]}
          />
        }
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
          
          {/* Upcoming Events Section Card */}
          {events.length > 0 ? (
            <View 
              className="rounded-3xl overflow-hidden mb-12"
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
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: '#DBEAFE' }}
                    >
                      <Ionicons name="calendar" size={22} color="#2563eb" />
                    </View>
                    <Text className="text-2xl font-bold text-slate-900">Upcoming Events</Text>
                </View>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={scrollLeft}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <Ionicons name="chevron-back" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={scrollRight}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              {/* Card Content */}
              <View className="p-5">
              {/* Carousel Container */}
              <View 
                  ref={carouselContainerRef}
                className="relative overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    setContainerWidth(width);
                  }}
              >
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  scrollEventThrottle={16}
                    contentContainerStyle={{ 
                      paddingLeft: (containerWidth - CARD_WIDTH) / 2,
                      paddingRight: (containerWidth - CARD_WIDTH) / 2
                    }}
                  decelerationRate="fast"
                    snapToOffsets={snapOffsets}
                  snapToAlignment="start"
                    pagingEnabled={false}
                >
                  {events.map((event, index) => (
                    <TouchableOpacity
                      key={event.id}
                      className="rounded-2xl overflow-hidden"
                      onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                      style={{ 
                        width: CARD_WIDTH,
                        marginRight: CARD_MARGIN,
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
                      <Image
                        source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                        className="w-full h-32"
                        resizeMode="cover"
                      />
                      
                      <View className="p-3">
                        <View className="flex-row items-center justify-between mb-2">
                          <View 
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: '#DBEAFE' }}
                          >
                            <Text className="text-xs font-semibold text-blue-700">Event</Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="people-outline" size={12} color="#64748b" />
                            <Text className="text-xs text-slate-500 ml-1">
                              {event.current_participants || 0}/{event.max_participants || '∞'}
                            </Text>
                          </View>
                        </View>
                        
                        <Text className="text-base font-bold text-slate-800 mb-2" numberOfLines={2}>
                          {event.title}
                        </Text>
                        
                        <View className="space-y-1.5 mb-2">
                          <View className="flex-row items-center">
                            <View 
                              className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                              style={{ backgroundColor: '#FEF3C7' }}
                            >
                              <Ionicons name="calendar-outline" size={12} color="#D97706" />
                            </View>
                            <Text className="text-xs text-slate-700 flex-1">
                              {formatDate(event.start_date)}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <View 
                              className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                              style={{ backgroundColor: '#DCFCE7' }}
                            >
                              <Ionicons name="time-outline" size={12} color="#16A34A" />
                            </View>
                            <Text className="text-xs text-slate-700 flex-1">
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <View 
                              className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                              style={{ backgroundColor: '#DBEAFE' }}
                            >
                              <Ionicons name="location-outline" size={12} color="#2563EB" />
                            </View>
                            <Text className="text-xs text-slate-700 flex-1" numberOfLines={1}>
                              {event.venue || 'Location TBD'}
                            </Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center justify-between pt-2 border-t border-slate-100 mt-2">
                          <Text className="text-xs text-slate-400">
                            Tap to view
                          </Text>
                          <View className="flex-row items-center">
                            <Text className="text-xs font-semibold text-blue-600 mr-1">View</Text>
                            <Ionicons name="arrow-forward" size={14} color="#2563eb" />
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
