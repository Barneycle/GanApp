import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EventService, Event } from '../../lib/eventService';
import { useAuth } from '../../lib/authContext';
import { stripHtmlTags } from '../../lib/htmlUtils';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
      <View className="bg-blue-900 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <View className="w-10" />
          
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
                <Text className="text-2xl font-bold text-slate-900">Upcoming Events</Text>
              </View>
            </View>
            
            {/* Card Content */}
            <View className="p-5">
          {events.length === 0 ? (
                <View className="py-12 items-center">
                  <View 
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <Ionicons name="calendar-outline" size={40} color="#64748b" />
                  </View>
                  <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
                No Events Available
              </Text>
                  <Text className="text-gray-500 text-center text-sm">
                Check back later for upcoming events.
              </Text>
            </View>
          ) : (
                events.map((event, index) => (
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
