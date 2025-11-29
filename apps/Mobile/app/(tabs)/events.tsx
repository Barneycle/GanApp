import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { user: currentUser } = useAuth();

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
      {/* Header */}
      <View className="bg-blue-900 px-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-blue-800 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={18} color="#ffffff" />
            <Text className="text-lg font-bold text-white ml-2">Events</Text>
          </View>
          
          <View className="w-10" />
        </View>
      </View>

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            paddingVertical: 20,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 20)
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Upcoming Events</Text>
          
          {events.length === 0 ? (
            <View className="rounded-xl p-6 items-center" style={{ backgroundColor: '#FAFAFA' }}>
              <Ionicons name="calendar-outline" size={48} color="#6b7280" />
              <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
                No Events Available
              </Text>
              <Text className="text-gray-600 mt-2 text-center">
                Check back later for upcoming events.
              </Text>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                className="rounded-xl shadow-md mb-4 overflow-hidden"
                style={{ backgroundColor: '#FAFAFA' }}
                onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              >
                <Image 
                  source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }} 
                  className="w-full h-32 sm:h-40"
                  resizeMode="cover"
                />
                
                <View className="p-3 sm:p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Event
                    </Text>
                    <Text className="text-sm text-slate-600">Free</Text>
                  </View>
                  
                  <Text className="text-base sm:text-lg font-bold text-slate-800 mb-2">{event.title}</Text>
                  
                  <View className="space-y-1 mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-slate-600 ml-2">
                        {formatDate(event.start_date)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-slate-600 ml-2">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-slate-600 ml-2">
                        {event.venue || 'Location TBD'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-sm text-slate-600 mb-3">
                    {event.rationale || 'No rationale available'}
                  </Text>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-slate-500">
                      {event.current_participants || 0} / {event.max_participants || '∞'} participants
                    </Text>
                    <Text className="text-sm font-semibold text-blue-600">View Details</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          
          <View className="h-6" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
