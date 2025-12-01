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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { AlbumService, EventWithPhotos, EventPhoto } from '../../lib/albumService';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../components/TutorialOverlay';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [downloadedPhotoIds, setDownloadedPhotoIds] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0 });
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Load downloaded photo IDs from storage
  useEffect(() => {
    const loadDownloadedPhotos = async () => {
      try {
        const stored = await AsyncStorage.getItem('downloaded_photo_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          setDownloadedPhotoIds(new Set(ids));
        }
      } catch (error) {
        console.log('Error loading downloaded photos:', error);
      }
    };
    loadDownloadedPhotos();
  }, []);

  // Save downloaded photo ID to storage
  const markPhotoAsDownloaded = async (photoId: string) => {
    try {
      const newSet = new Set(downloadedPhotoIds);
      newSet.add(photoId);
      setDownloadedPhotoIds(newSet);
      await AsyncStorage.setItem('downloaded_photo_ids', JSON.stringify(Array.from(newSet)));
    } catch (error) {
      console.log('Error saving downloaded photo ID:', error);
    }
  };

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

  const downloadPhoto = async (photo: EventPhoto) => {
    if (downloadingPhotoId === photo.id) return;
    
    setDownloadingPhotoId(photo.id);
    try {
      // Download image to cache first
      const fileName = photo.file_name || `photo_${photo.id}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(photo.photo_url, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: HTTP ${downloadResult.status}`);
      }

      // For images, save to media library (Photos/Downloads)
      if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
        Alert.alert(
          'Error', 
          'Media library not available. Please rebuild the app with native modules enabled.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions - use readOnly: false to get write permission (for saving)
      // This shows "Save photos" instead of "Modify photos"
      const permissionResult = await MediaLibrary.requestPermissionsAsync(false);
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to save the image. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create asset in media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      // On Android, try to save to Downloads/GanApp folder
      if (Platform.OS === 'android') {
        try {
          const albumName = 'GanApp';
          let album = await MediaLibrary.getAlbumAsync(albumName);
          
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumError) {
          // Album creation failed, but asset is still saved to Photos
          console.log('Album creation error (asset still saved to Photos):', albumError);
        }
      }
      
      // Mark photo as downloaded
      await markPhotoAsDownloaded(photo.id);
      
      Alert.alert('Success', 'Photo downloaded to your Photos/Downloads folder!');
    } catch (error: any) {
      console.error('Error downloading photo:', error);
      Alert.alert('Error', `Failed to download photo: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  const downloadAllPhotos = async (event: EventWithPhotos) => {
    if (isDownloadingAll || !event.photos || event.photos.length === 0) return;

    setIsDownloadingAll(true);
    setDownloadAllProgress({ current: 0, total: event.photos.length });

    let successCount = 0;
    let failCount = 0;

    try {
      // Filter out already downloaded photos
      const photosToDownload = event.photos.filter(photo => !downloadedPhotoIds.has(photo.id));

      if (photosToDownload.length === 0) {
        Alert.alert('Info', 'All photos have already been downloaded!');
        setIsDownloadingAll(false);
        return;
      }

      // Request permissions once for all downloads
      if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
        Alert.alert(
          'Error', 
          'Media library not available. Please rebuild the app with native modules enabled.',
          [{ text: 'OK' }]
        );
        setIsDownloadingAll(false);
        return;
      }

      const permissionResult = await MediaLibrary.requestPermissionsAsync(false);
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to save the images. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
        setIsDownloadingAll(false);
        return;
      }

      // Download each photo sequentially
      for (let i = 0; i < photosToDownload.length; i++) {
        const photo = photosToDownload[i];
        setDownloadAllProgress({ current: i + 1, total: photosToDownload.length });
        setDownloadingPhotoId(photo.id);

        try {
          // Download image to cache
          const fileName = photo.file_name || `photo_${photo.id}.jpg`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          
          const downloadResult = await FileSystem.downloadAsync(photo.photo_url, fileUri);
          
          if (downloadResult.status === 200) {
            // Create asset in media library
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            
            // On Android, try to save to Downloads/GanApp folder
            if (Platform.OS === 'android') {
              try {
                const albumName = 'GanApp';
                let album = await MediaLibrary.getAlbumAsync(albumName);
                
                if (!album) {
                  album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
                } else {
                  await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                }
              } catch (albumError) {
                console.log('Album creation error (asset still saved to Photos):', albumError);
              }
            }
            
            // Mark as downloaded
            await markPhotoAsDownloaded(photo.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error: any) {
          console.error(`Error downloading photo ${photo.id}:`, error);
          failCount++;
        } finally {
          setDownloadingPhotoId(null);
        }
      }

      // Show completion message
      if (successCount > 0) {
        Alert.alert(
          'Download Complete',
          `Successfully downloaded ${successCount} photo${successCount === 1 ? '' : 's'}${failCount > 0 ? `\n\n${failCount} photo${failCount === 1 ? '' : 's'} failed to download.` : '.'}`
        );
      } else {
        Alert.alert('Download Failed', 'No photos were downloaded. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in downloadAllPhotos:', error);
      Alert.alert('Error', `Failed to download photos: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDownloadingAll(false);
      setDownloadAllProgress({ current: 0, total: 0 });
      setDownloadingPhotoId(null);
    }
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
      <TutorialOverlay
        screenId="albums"
        steps={[
          {
            id: '1',
            title: 'Event Albums',
            description: 'Browse photos uploaded by participants from different events. Each event has its own photo album.',
          },
          {
            id: '2',
            title: 'View & Download Photos',
            description: 'Tap "View All" to see all photos from an event. Tap any photo to view it full screen. Use the download button to save photos to your device.',
          },
          {
            id: '3',
            title: 'Download All',
            description: 'Use the "Download All" button to save all photos from an event at once to your Photos/Downloads folder.',
          },
        ]}
      />
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
                  {isDownloadingAll && downloadAllProgress.total > 0 && (
                    <Text className="text-sm text-blue-300 ml-2">
                      ({downloadAllProgress.current}/{downloadAllProgress.total})
                    </Text>
                  )}
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                {selectedEvent && selectedEvent.photos && selectedEvent.photos.length > 0 && (
                  <TouchableOpacity
                    onPress={() => downloadAllPhotos(selectedEvent)}
                    disabled={isDownloadingAll}
                    className="px-3 py-2 rounded-lg bg-green-600 active:bg-green-700"
                  >
                    {isDownloadingAll ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                        <Text className="text-white text-sm font-semibold">Downloading...</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons name="download" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text className="text-white text-sm font-semibold">Download All</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  className="w-10 h-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Photo Grid */}
            {selectedEvent && selectedEvent.photos.length > 0 ? (
              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
              >
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {selectedEvent.photos.map((photo) => (
                    <View
                      key={photo.id}
                      className="rounded-xl overflow-hidden bg-slate-200"
                      style={{
                        width: (SCREEN_WIDTH - 48 - 12) / 2,
                        height: (SCREEN_WIDTH - 48 - 12) / 2,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => openFullScreen(photo, selectedEvent)}
                        className="w-full h-full"
                      >
                        <Image
                          source={{ uri: photo.photo_url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (!downloadedPhotoIds.has(photo.id)) {
                            downloadPhoto(photo);
                          }
                        }}
                        disabled={downloadingPhotoId === photo.id}
                        className="absolute top-2 right-2 w-8 h-8 items-center justify-center rounded-full bg-black/60"
                      >
                        {downloadingPhotoId === photo.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : downloadedPhotoIds.has(photo.id) ? (
                          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                        ) : (
                          <Ionicons name="download" size={18} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>
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
              {selectedEvent && selectedEvent.photos[currentPhotoIndex] && (
                <TouchableOpacity
                  onPress={() => {
                    const currentPhoto = selectedEvent.photos[currentPhotoIndex];
                    if (!downloadedPhotoIds.has(currentPhoto.id)) {
                      downloadPhoto(currentPhoto);
                    }
                  }}
                  disabled={downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id}
                  className="w-10 h-10 items-center justify-center rounded-full bg-black/50"
                >
                  {downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : downloadedPhotoIds.has(selectedEvent.photos[currentPhotoIndex].id) ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  ) : (
                    <Ionicons name="download" size={24} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}
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
