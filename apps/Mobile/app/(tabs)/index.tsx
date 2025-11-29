import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LoadingScreen } from '../loadingscreen';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const { user: currentUser, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadEvents();
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
      
      // Fetch published events for the home page (same as participants page)
      const result = await EventService.getPublishedEvents();
      
      if (result.error) {
        setError(result.error);
        setEvents([]);
      } else {
        // Use events directly from database, no placeholders
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events from database');
      setEvents([]);
    } finally {
      setLoading(false);
    }
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

  if (loading || authLoading) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  // If not authenticated, show loading while redirecting
  if (!currentUser) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  // Get the featured event (first event)
  const displayEvent = events[0];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          padding: 20, 
          paddingTop: insets.top + 20,
          paddingBottom: Math.max(insets.bottom, 20)
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-md mx-auto">
          {/* Welcome Message */}
          <View className="text-center mb-16">
            <Text className="text-5xl font-black text-slate-900 mb-6 tracking-tight">
              GanApp
            </Text>
            <Text className="text-lg text-slate-600 font-medium">
              Your gateway to seamless event management
            </Text>
          </View>
          
          {/* Single Featured Event Card */}
          {displayEvent && (
            <View className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-16 border border-slate-100">
              {/* Banner Image */}
              <View className="h-56 overflow-hidden">
                <Image
                  source={{ uri: displayEvent.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              
              {/* Event Content */}
              <View className="p-8">
                {/* Event Title */}
                <Text className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{displayEvent.title}</Text>
                
                {/* Event Description */}
                <Text className="text-slate-600 mb-6 leading-relaxed">
                  {displayEvent.rationale || 'No rationale available'}
                </Text>
                
                {/* Event Details */}
                <View className="mb-8 space-y-3">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="calendar" size={16} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 font-medium">
                      {formatDate(displayEvent.start_date)}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="time" size={16} color="#10b981" />
                    </View>
                    <Text className="text-gray-700 font-medium">
                      {formatTime(displayEvent.start_time)} - {formatTime(displayEvent.end_time)}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="location" size={16} color="#8b5cf6" />
                    </View>
                    <Text className="text-gray-700 font-medium">{displayEvent.venue}</Text>
                  </View>
                </View>
                
                {/* Action Button */}
                <TouchableOpacity
                  onPress={() => router.push(`/event-details?eventId=${displayEvent.id}`)}
                  className="bg-slate-900 py-4 px-8 rounded-2xl items-center shadow-lg"
                >
                  <Text className="text-white font-bold text-lg">View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Events Carousel */}
          {events.length > 0 ? (
            <View className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 mb-12">
              {/* Section Header */}
              <View className="mb-8">
                <Text className="text-3xl font-bold text-slate-900 mb-2">Upcoming Events</Text>
                <Text className="text-slate-600 text-lg font-medium">Discover and explore our upcoming events</Text>
              </View>
              
              {/* Carousel Container */}
              <View className="relative">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                  decelerationRate="fast"
                  snapToInterval={screenWidth - 32}
                  snapToAlignment="start"
                >
                {events.map((event, index) => (
                  <TouchableOpacity
                    key={event.id}
                    className="w-80 rounded-2xl overflow-hidden bg-white shadow-xl mr-6 border border-slate-100"
                    onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                  >
                    <Image
                      source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
                      className="w-full h-48"
                      resizeMode="cover"
                    />
                    <View className="p-6">
                      <Text className="font-bold text-xl text-slate-900 mb-3 leading-tight">{event.title}</Text>
                      <Text className="text-slate-600 text-sm mb-4 leading-relaxed">
                        {event.rationale || 'No rationale available'}
                      </Text>
                      <View className="space-y-2">
                        <View className="flex-row items-center">
                          <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-2">
                            <Ionicons name="calendar" size={12} color="#3b82f6" />
                          </View>
                          <Text className="text-xs text-gray-600 font-medium">
                            {formatDate(event.start_date)}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-2">
                            <Ionicons name="time" size={12} color="#10b981" />
                          </View>
                          <Text className="text-xs text-gray-600 font-medium">
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                </ScrollView>
                
                {/* Subtle scroll indicator */}
                {events.length > 1 && (
                  <View className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <View className="w-1 h-8 bg-slate-300 rounded-full opacity-50" />
                  </View>
                )}
              </View>
              
              {/* Subtle More Events Link */}
              <View className="flex-row justify-center mt-6">
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/events')}
                  className="flex-row items-center"
                >
                  <Text className="text-slate-600 text-base font-medium mr-2">View all events</Text>
                  <Ionicons name="arrow-forward" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            !loading && (
              <View className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 mb-12">
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-blue-100 mb-4 items-center justify-center">
                    <Ionicons name="calendar-outline" size={32} color="#2563eb" />
                  </View>
                  <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">No Upcoming Events</Text>
                  <Text className="text-gray-600 mb-6 text-center">
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