import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { EventService } from '../lib/eventService';
import { useAuth } from '../lib/authContext';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const result = await EventService.getPublishedEvents();
      if (result.success) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-600">Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      <ScrollView 
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="py-6">
          <Text className="text-3xl font-bold text-slate-800 mb-2">Events</Text>
          <Text className="text-slate-600 mb-6">Discover upcoming events</Text>

          {events.length === 0 ? (
            <View className="bg-white rounded-2xl shadow-lg p-8 items-center">
              <Text className="text-slate-600 text-center">No events available at the moment</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  {event.banner_url && (
                    <Image
                      source={{ uri: event.banner_url }}
                      className="w-full h-48"
                      resizeMode="cover"
                    />
                  )}
                  <View className="p-6">
                    <Text className="text-xl font-bold text-slate-800 mb-2">{event.title}</Text>
                    {event.rationale && (
                      <Text className="text-slate-600 mb-4" numberOfLines={3}>
                        {event.rationale}
                      </Text>
                    )}
                    <View className="space-y-2">
                      <Text className="text-slate-600">
                        📅 {formatDate(event.start_date)}
                      </Text>
                      {event.venue && (
                        <Text className="text-slate-600">
                          📍 {event.venue}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
