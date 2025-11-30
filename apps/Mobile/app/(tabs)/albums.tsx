import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { AlbumService, EventWithPhotos, EventPhoto } from '../../lib/albumService';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Albums() {
  const [events, setEvents] = useState<EventWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithPhotos | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
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

  const openFullScreen = (photo: EventPhoto, event: EventWithPhotos) => {
    const index = event.photos.findIndex(p => p.id === photo.id);
    const photoIndex = index >= 0 ? index : 0;
    setCurrentPhotoIndex(photoIndex);
    setSelectedEvent(event);
    setSelectedPhoto(photo);
    setIsFullScreenVisible(true);
    // Scroll to the selected photo after a short delay to ensure FlatList is rendered
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: photoIndex, animated: false });
    }, 100);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

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
          <View className="bg-white rounded-3xl p-8 shadow-xl items-center" style={styles.card}>
            <Ionicons name="images-outline" size={64} color="#94a3b8" className="mb-4" />
            <Text className="text-slate-600 text-center text-lg font-medium mb-2">
              No Albums Yet
            </Text>
            <Text className="text-slate-500 text-center">
              Photos uploaded by participants will appear here
            </Text>
          </View>
        ) : (
          <View>
            {events.map((event, index) => (
              <View
                key={event.id}
                className="bg-white rounded-3xl shadow-xl overflow-hidden"
                style={[
                  styles.card,
                  { marginBottom: index < events.length - 1 ? 20 : 0 }
                ]}
              >
                {/* Event Header */}
                <View className="p-5 border-b border-slate-100">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-slate-800 mb-1" numberOfLines={2}>
                        {event.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedEvent(event);
                        setIsModalVisible(true);
                      }}
                      className="ml-3 px-3 py-1.5 bg-blue-600 rounded-lg"
                    >
                      <Text className="text-white text-sm font-semibold">View All</Text>
                    </TouchableOpacity>
                  </View>
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
                        <TouchableOpacity
                          key={photo.id}
                          onPress={() => openFullScreen(photo, event)}
                          className="rounded-xl overflow-hidden"
                          style={{
                            width: (SCREEN_WIDTH - 64 - 24) / 4,
                            height: (SCREEN_WIDTH - 64 - 24) / 4,
                          }}
                        >
                          <Image
                            source={{ uri: photo.photo_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                          {index === 3 && event.photos.length > 4 && (
                            <View className="absolute inset-0 bg-black/60 items-center justify-center">
                              <Text className="text-white font-bold text-base">
                                +{event.photos.length - 4}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
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
        <SafeAreaView className="flex-1 bg-blue-900">
          <View className="flex-1">
            {/* Header */}
            <View 
              className="flex-row items-center justify-between px-4 bg-blue-900"
              style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
            >
              <View className="flex-1 mr-3">
                <Text className="text-2xl font-bold text-white" numberOfLines={1}>
                  {selectedEvent?.title}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="images" size={16} color="#bfdbfe" />
                  <Text className="text-base text-blue-200 ml-1.5">
                    {selectedEvent?.photo_count} {selectedEvent?.photo_count === 1 ? 'photo' : 'photos'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Photo Grid */}
            {selectedEvent && selectedEvent.photos.length > 0 ? (
              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
              >
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {selectedEvent.photos.map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => openFullScreen(photo, selectedEvent)}
                      className="rounded-xl overflow-hidden bg-slate-200"
                      style={{
                        width: (SCREEN_WIDTH - 48 - 12) / 2,
                        height: (SCREEN_WIDTH - 48 - 12) / 2,
                      }}
                    >
                      <Image
                        source={{ uri: photo.photo_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center p-8">
                <Ionicons name="images-outline" size={64} color="#ffffff" className="mb-4" />
                <Text className="text-white text-center">
                  No photos available
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={isFullScreenVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullScreenVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-1">
            {/* Header */}
            <View 
              className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-4 py-3"
              style={{ paddingTop: insets.top + 8 }}
            >
              <TouchableOpacity
                onPress={() => setIsFullScreenVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-black/50"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              {selectedEvent && (
                <View className="flex-1 items-center px-4">
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                    {selectedEvent.title}
                  </Text>
                  <Text className="text-white/70 text-xs mt-1">
                    {currentPhotoIndex + 1} of {selectedEvent.photos.length}
                  </Text>
                </View>
              )}
              <View className="w-10" />
            </View>

            {/* Image Carousel */}
            {selectedEvent && selectedEvent.photos.length > 0 && (
              <FlatList
                ref={flatListRef}
                data={selectedEvent.photos}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                getItemLayout={(data, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScrollToIndexFailed={(info) => {
                  // Fallback if scroll fails
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                  });
                }}
                renderItem={({ item }) => (
                  <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
                    <Image
                      source={{ uri: item.photo_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
