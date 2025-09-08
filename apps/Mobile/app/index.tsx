import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LoadingScreen } from './loadingscreen';
import { EventService, Event } from '../lib/eventService';
import { useAuth } from '../lib/authContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const [slideOffset, setSlideOffset] = useState(0);
  const [currentSlideOffset, setCurrentSlideOffset] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isCardFolded, setIsCardFolded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Swipe functionality state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const { user: currentUser, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Carousel animation values
  const translateX = useSharedValue(0);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = 300;

  // Sample events data for carousel
  const sampleEvents = [
    {
      id: "550e8400-e29b-41d4-a716-446655440051",
      title: "Tech Conference 2025",
      img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440052",
      title: "Music Festival",
      img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440053",
      title: "Startup Pitch Night",
      img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440054",
      title: "AI Summit",
      img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440055",
      title: "Art & Design Expo",
      img: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440056",
      title: "Business Networking",
      img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440057",
      title: "Sports Championship",
      img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440058",
      title: "Food & Wine Festival",
      img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440059",
      title: "Gaming Convention",
      img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440060",
      title: "Educational Workshop",
      img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440061",
      title: "Health & Wellness Expo",
      img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440062",
      title: "Environmental Summit",
      img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&crop=center",
    },
  ];

  // Create a truly infinite carousel by repeating the events multiple times
  const infiniteEvents = [
    ...sampleEvents, // First set
    ...sampleEvents, // Second set
    ...sampleEvents, // Third set
    ...sampleEvents, // Fourth set
    ...sampleEvents, // Fifth set
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // Don't redirect to login anymore - let tabs handle auth state
    // The tabs will show login screen when not authenticated
  }, [authLoading, currentUser, loading]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      
      // Fetch published events for the home page
      const eventsPromise = EventService.getPublishedEvents();
      
      const result = await Promise.race([eventsPromise, timeoutPromise]) as { events?: Event[]; error?: string };
      
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

  // Use the first event as the featured event, or fallback to default
  const featuredEvent = events[0] || {
    title: "Tech Conference 2025",
    start_date: "2024-06-15",
    end_date: "2024-06-15",
    start_time: "09:00:00",
    end_time: "17:00:00",
    venue: "Grand Convention Center, Cityville",
    sponsors: [
      { name: "TechCorp" },
      { name: "InnovateX" },
      { name: "Future Solutions" }
    ],
    guest_speakers: [
      { name: "Dr. Jane Smith" },
      { name: "Mr. John Doe" },
      { name: "Prof. Emily Johnson" }
    ],
    rationale: "The Tech Conference 2025 aims to foster collaboration and innovation among technology professionals by providing a platform for sharing knowledge, networking, and showcasing the latest advancements in the industry.",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center"
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

  // Helper function to handle image loading with fallback
  const handleImageError = (fallbackSrc: string) => {
    return fallbackSrc;
  };

  // Navigation functions for carousel - truly infinite
  const scrollLeft = () => {
    setCurrentEventIndex((prev) => prev - 1);
    translateX.value = withSpring(-(currentEventIndex - 1) * (cardWidth + 24));
  };

  const scrollRight = () => {
    setCurrentEventIndex((prev) => prev + 1);
    translateX.value = withSpring(-(currentEventIndex + 1) * (cardWidth + 24));
  };

  // Swipe functionality
  const minSwipeDistance = 50;

  const onTouchStart = (e: any) => {
    setTouchEnd(null);
    setTouchStart(e.nativeEvent.locationX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const onTouchMove = (e: any) => {
    if (!touchStart) return;
    
    const currentTouch = e.nativeEvent.locationX;
    const diff = touchStart - currentTouch;
    setDragOffset(diff);
    setTouchEnd(currentTouch);
  };

  const onTouchEnd = () => {
    if (!touchStart) return;
    
    const distance = touchStart - (touchEnd || touchStart);
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
    setIsDragging(false);
    setDragOffset(0);
  };

  // Gesture handler for swipe
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      translateX.value = -(currentEventIndex * (cardWidth + 24)) + translationX;
    } else if (state === State.END) {
      const threshold = 50;
      if (translationX > threshold) {
        scrollLeft();
      } else if (translationX < -threshold) {
        scrollRight();
      } else {
        translateX.value = withSpring(-currentEventIndex * (cardWidth + 24));
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              Alert.alert('Success', 'You have been signed out successfully');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
        <View className="flex-1 items-center justify-center">
          <View className="text-center">
            <View className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6" />
            <Text className="text-slate-600 text-lg">Loading events...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
        <View className="flex-1 items-center justify-center">
          <View className="text-center">
            <View className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
              <View className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 items-center justify-center">
                <Text className="text-red-600 text-2xl">⚠️</Text>
              </View>
              <Text className="text-lg font-semibold text-slate-800 mb-2 text-center">Error Loading Events</Text>
              <Text className="text-slate-600 mb-4 text-center">{error}</Text>
              <TouchableOpacity
                onPress={loadEvents}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg self-center"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading screen if auth is still loading
  if (authLoading) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  // If not authenticated, show a welcome screen with login prompt
  if (!currentUser) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
        <View className="flex-1 items-center justify-center px-6">
          <View className="text-center">
            <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mx-auto mb-6">
              <Ionicons name="person" size={48} color="white" />
            </View>
            <Text className="text-3xl font-bold text-slate-800 mb-4">Welcome to GanApp</Text>
            <Text className="text-lg text-slate-600 mb-8 text-center">
              Please sign in to access your events and features
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              className="bg-blue-600 px-8 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-lg">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* Welcome Message with Sign Out */}
          <View className="mb-12">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1" />
              <TouchableOpacity
                onPress={handleSignOut}
                className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
              >
                <Ionicons name="log-out" size={16} color="white" />
                <Text className="text-white font-medium ml-2">Sign Out</Text>
              </TouchableOpacity>
            </View>
            <View className="text-center">
              <Text className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-800 mb-4">
                Welcome to GanApp
              </Text>
              <Text className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">
                Manage your events and surveys with ease
              </Text>
            </View>
          </View>
          
          {/* Single Event Card */}
          <View className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden mb-12">
            
            {/* Banner Image */}
            <View className="w-full overflow-hidden h-48 sm:h-64 md:h-80 lg:h-96">
              <Image
                source={{ uri: featuredEvent.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            
            {/* Event Content */}
            <View className="p-8">
              {/* Event Title */}
              <View className="text-center mb-6">
                <Text className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                  {featuredEvent.title}
                </Text>
              </View>

              {/* Event Rationale */}
              {featuredEvent.rationale && (
                <View className="mb-8">
                  <View className="flex-row items-center space-x-3 mb-4">
                    <View className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 items-center justify-center">
                      <Text className="text-white text-xl">💡</Text>
                    </View>
                    <Text className="text-xl font-semibold text-slate-800">Event Rationale</Text>
                  </View>
                  <Text className="text-slate-600">{featuredEvent.rationale}</Text>
                </View>
              )}

              {/* View Details Button */}
              <View className="text-center">
                <TouchableOpacity
                  onPress={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 py-3 px-8 rounded-xl items-center self-center"
                >
                  <Text className="text-white font-medium">View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Events Carousel Card */}
          <View className="mb-12">
            {/* Section Header with Title and Navigation */}
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-2xl font-bold text-slate-800 mb-1">Upcoming Events</Text>
                <Text className="text-slate-600 text-base">Discover and explore our upcoming events</Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  onPress={scrollLeft}
                  className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                >
                  <Text className="text-white text-lg">‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={scrollRight}
                  className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                >
                  <Text className="text-white text-lg">›</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Carousel Container */}
            <PanGestureHandler onGestureEvent={onGestureEvent}>
              <Animated.View className="relative overflow-hidden">
                <Animated.View 
                  className="flex-row"
                  style={[
                    {
                      transform: [{ translateX }],
                      width: infiniteEvents.length * cardWidth + (infiniteEvents.length - 1) * 24,
                    }
                  ]}
                >
                  {infiniteEvents.map((event, index) => (
                    <View
                      key={`${event.id}-${index}`}
                      className="rounded-lg overflow-hidden bg-white shadow-sm mr-6"
                      style={{ width: cardWidth }}
                    >
                      <Image
                        source={{ uri: event.img }}
                        className="w-full h-48"
                        resizeMode="cover"
                      />
                      <View className="p-4">
                        <Text className="font-semibold text-lg text-gray-800">{event.title}</Text>
                        <Text className="text-gray-600 text-sm mt-2">Experience something amazing</Text>
                      </View>
                    </View>
                  ))}
                </Animated.View>
              </Animated.View>
            </PanGestureHandler>
            
            {/* See All Button */}
            <View className="flex-row justify-end mt-6">
              <TouchableOpacity
                onPress={() => router.push('/events')}
                className="bg-gradient-to-r from-blue-600 to-blue-800 py-3 px-6 rounded-xl items-center flex-row"
              >
                <Text className="text-white font-medium mr-2">See All</Text>
                <Text className="text-white text-lg">›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Event Modal */}
        <Modal
          visible={isModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-800">Event Details</Text>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Text className="text-2xl text-slate-600">×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView className="flex-1">
                <View className="mb-6">
                  <Image
                    source={{ uri: featuredEvent.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                    className="w-full h-64 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
                
                <Text className="text-3xl font-bold text-slate-800 mb-4">{featuredEvent.title}</Text>
                
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-slate-700 mb-2">Date & Time</Text>
                  <Text className="text-slate-600">
                    {formatDate(featuredEvent.start_date || '2024-06-15')} • {formatTime(featuredEvent.start_time || '09:00:00')} - {formatTime(featuredEvent.end_time || '17:00:00')}
                  </Text>
                </View>
                
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-slate-700 mb-2">Venue</Text>
                  <Text className="text-slate-600">{featuredEvent.venue || 'Grand Convention Center, Cityville'}</Text>
                </View>
                
                {featuredEvent.rationale && (
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-slate-700 mb-2">About This Event</Text>
                    <Text className="text-slate-600">{featuredEvent.rationale}</Text>
                  </View>
                )}
                
                {featuredEvent.sponsors && featuredEvent.sponsors.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-slate-700 mb-2">Sponsors</Text>
                    {featuredEvent.sponsors.map((sponsor: any, index: number) => (
                      <Text key={index} className="text-slate-600">• {sponsor.name}</Text>
                    ))}
                  </View>
                )}
                
                {featuredEvent.guest_speakers && featuredEvent.guest_speakers.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-slate-700 mb-2">Guest Speakers</Text>
                    {featuredEvent.guest_speakers.map((speaker: any, index: number) => (
                      <Text key={index} className="text-slate-600">• {speaker.name}</Text>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}