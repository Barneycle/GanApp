import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { AlbumService, EventWithPhotos } from '../../lib/albumService';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Albums() {
  const [events, setEvents] = useState<EventWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithPhotos | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if not organizer/admin
  useEffect(() => {
    if (user && user.role !== 'organizer' && user.role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && (user.role === 'organizer' || user.role === 'admin')) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await AlbumService.getEventsWithPhotos();
      
      if (result.error) {
        setError(result.error);
        setEvents([]);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load event albums');
      setEvents([]);
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (error && events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-4">
        <View className="items-center">
          <Ionicons name="alert-circle" size={48} color="#dc2626" className="mb-4" />
          <Text className="text-lg font-semibold text-slate-800 mb-2 text-center">Error Loading Albums</Text>
          <Text className="text-slate-600 mb-4 text-center">{error}</Text>
          <TouchableOpacity
            onPress={loadEvents}
            className="bg-blue-600 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-blue-900"
      style={{
        paddingBottom: insets.bottom + 80, // Account for tab bar
      }}
    >
      <ScrollView 
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1e40af"
            colors={["#1e40af"]}
          />
        }
      >
        {events.length === 0 ? (
            <View className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 items-center">
              <Ionicons name="images-outline" size={64} color="#94a3b8" className="mb-4" />
              <Text className="text-slate-600 text-center text-lg font-medium mb-2">
                No Albums Yet
              </Text>
              <Text className="text-slate-500 text-center">
                Photos uploaded by participants will appear here
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  onPress={() => {
                    setSelectedEvent(event);
                    setIsModalVisible(true);
                  }}
                >
                  {/* Event Header */}
                  <View className="p-4 border-b border-slate-100">
                    <Text className="text-xl font-bold text-slate-800 mb-1" numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="calendar-outline" size={16} color="#64748b" />
                      <Text className="text-sm text-slate-600 ml-1">
                        {formatDate(event.start_date)}
                      </Text>
                      <View className="w-1 h-1 bg-slate-400 rounded-full mx-2" />
                      <Ionicons name="images" size={16} color="#64748b" />
                      <Text className="text-sm text-slate-600 ml-1">
                        {event.photo_count} {event.photo_count === 1 ? 'photo' : 'photos'}
                      </Text>
                    </View>
                  </View>

                  {/* Photo Grid Preview */}
                  {event.photos && event.photos.length > 0 && (
                    <View className="p-4">
                      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {event.photos.slice(0, 4).map((photo, index) => (
                          <View
                            key={photo.id}
                            className="rounded-lg overflow-hidden"
                            style={{
                              width: (SCREEN_WIDTH - 64 - 24) / 4, // Screen width - padding - gaps
                              height: (SCREEN_WIDTH - 64 - 24) / 4,
                            }}
                          >
                            <Image
                              source={{ uri: photo.photo_url }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                            {index === 3 && event.photos.length > 4 && (
                              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <Text className="text-white font-bold text-lg">
                                  +{event.photos.length - 4}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
      </ScrollView>

      {/* Photo Gallery Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
              <View className="flex-1">
                <Text className="text-xl font-bold text-slate-800" numberOfLines={1}>
                  {selectedEvent?.title}
                </Text>
                <Text className="text-sm text-slate-600 mt-1">
                  {selectedEvent?.photo_count} {selectedEvent?.photo_count === 1 ? 'photo' : 'photos'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Photo Grid */}
            {selectedEvent && selectedEvent.photos.length > 0 ? (
              <ScrollView className="flex-1 p-4">
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {selectedEvent.photos.map((photo) => (
                    <View
                      key={photo.id}
                      className="rounded-lg overflow-hidden bg-slate-200"
                      style={{
                        width: (SCREEN_WIDTH - 48 - 12) / 2, // Screen width - padding - gap
                        height: (SCREEN_WIDTH - 48 - 12) / 2,
                      }}
                    >
                      <Image
                        source={{ uri: photo.photo_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center p-8">
                <Ionicons name="images-outline" size={64} color="#94a3b8" className="mb-4" />
                <Text className="text-slate-600 text-center">
                  No photos available
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
