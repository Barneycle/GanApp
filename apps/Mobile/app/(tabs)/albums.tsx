import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { AlbumService, EventWithPhotos, EventPhoto } from '../../lib/albumService';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../components/TutorialOverlay';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAttributionToImage } from '../../lib/imageAttribution';
import { saveFileToGanApp } from '../../lib/mediaStoreSaver';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DateFilter = 'all' | 'upcoming' | 'past';
type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'photos-asc' | 'photos-desc';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showFilters, setShowFilters] = useState(false);
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

  // Get unique venues from events
  const uniqueVenues = useMemo(() => {
    const venues = events
      .map(event => event.venue)
      .filter((venue): venue is string => !!venue && venue !== 'Location TBD' && venue.trim() !== '');
    return Array.from(new Set(venues)).sort();
  }, [events]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query))
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.start_date) >= now);
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.end_date) < now);
    }

    // Venue filter
    if (venueFilter !== 'all') {
      filtered = filtered.filter(event => event.venue === venueFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'date-desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'photos-asc':
          return (a.photo_count || 0) - (b.photo_count || 0);
        case 'photos-desc':
          return (b.photo_count || 0) - (a.photo_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, searchQuery, dateFilter, venueFilter, sortOption]);

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

  // Helper function to request media permissions only when needed (iOS)
  const requestMediaPermissionsIfNeeded = async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      // Android doesn't need permissions (uses MediaStore API)
      return true;
    }

    try {
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      
      if (status === 'granted') {
        return true;
      }
      
      if (status === 'denied' && !canAskAgain) {
        // Permission permanently denied
        return false;
      }
      
      // Request permission
      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync(false);
      return newStatus === 'granted';
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      return false;
    }
  };

  const downloadPhoto = async (photo: EventPhoto) => {
    if (downloadingPhotoId === photo.id) return;
    
    // Check if already downloaded and show warning
    const isAlreadyDownloaded = downloadedPhotoIds.has(photo.id);
    if (isAlreadyDownloaded) {
      Alert.alert(
        'Photo Already Downloaded',
        'This photo has already been downloaded. Do you want to download it again?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Download Again',
            onPress: async () => {
              await performDownload(photo);
            },
          },
        ]
      );
      return;
    }
    
    await performDownload(photo);
  };

  const performDownload = async (photo: EventPhoto) => {
    setDownloadingPhotoId(photo.id);
    try {
      // Request permissions if needed (iOS only)
      const hasPermission = await requestMediaPermissionsIfNeeded();
      if (!hasPermission) {
        throw new Error('Media library permission is required to save photos');
      }

      // Download image to cache first
      const fileName = photo.file_name || `photo_${photo.id}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(photo.photo_url, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: HTTP ${downloadResult.status}`);
      }

      // Add attribution watermark (Reddit-style)
      let finalImageUri = fileUri;
      try {
        // Get uploader's user ID from filename (format: userId_timestamp.jpg)
        let uploaderUserId = photo.uploaded_by;
        if (!uploaderUserId && photo.file_name) {
          // Extract userId from filename: userId_timestamp.jpg
          const fileNameParts = photo.file_name.split('_');
          if (fileNameParts.length >= 2) {
            uploaderUserId = fileNameParts[0];
          }
        }
        
        // Get uploader's full name for attribution
        let userName = 'User';
        if (uploaderUserId) {
          // Try to get user profile from RPC function
          const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: uploaderUserId });
          
          if (!rpcError && userProfile) {
            const profile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
            const firstName = profile.first_name || '';
            const lastName = profile.last_name || '';
            
            if (firstName && lastName) {
              userName = `${firstName} ${lastName}`;
            } else if (firstName) {
              userName = firstName;
            } else if (lastName) {
              userName = lastName;
            } else if (profile.email) {
              userName = profile.email.split('@')[0];
            }
          } else {
            // Fallback: use filename pattern
            userName = uploaderUserId.substring(0, 8) + '...';
          }
        }
        
        // Add attribution overlay to the image
        finalImageUri = await addAttributionToImage(fileUri, userName);
        
        // Verify the attributed image exists
        if (finalImageUri !== fileUri) {
          const checkPath = finalImageUri.startsWith('file://') 
            ? finalImageUri 
            : `file://${finalImageUri}`;
          
          const fileInfo = await FileSystem.getInfoAsync(checkPath);
          if (!fileInfo.exists) {
            finalImageUri = fileUri;
          }
        }
      } catch (attributionError) {
        console.error('Error adding attribution, using original image:', attributionError);
        finalImageUri = fileUri;
      }

      // Ensure URI has file:// prefix
      const assetUri = finalImageUri.startsWith('file://') 
        ? finalImageUri 
        : `file://${finalImageUri}`;
      
      // Generate filename for saved file
      const savedFileName = photo.file_name || `GanApp_${photo.id}_${Date.now()}.jpg`;
      const fileType = savedFileName.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Save to Pictures/GanApp/
      if (Platform.OS === 'android') {
        // Android: Use MediaStore API (no permissions needed on Android 10+)
        await saveFileToGanApp(assetUri, savedFileName, fileType);
      } else {
        // iOS: Use MediaLibrary (permissions already checked above)
        const asset = await MediaLibrary.createAssetAsync(assetUri);
        const album = await MediaLibrary.getAlbumAsync('GanApp');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('GanApp', asset, false);
        }
      }
      
      await markPhotoAsDownloaded(photo.id);
    } catch (error: any) {
      console.error('Error downloading photo:', error);
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  const downloadAllPhotos = async (event: EventWithPhotos) => {
    if (isDownloadingAll || !event.photos || event.photos.length === 0) return;

    // Check if there are already downloaded photos and show warning
    const alreadyDownloaded = event.photos.filter(photo => downloadedPhotoIds.has(photo.id));
    if (alreadyDownloaded.length > 0) {
      Alert.alert(
        'Some Photos Already Downloaded',
        `${alreadyDownloaded.length} photo(s) have already been downloaded. Do you want to download all photos again (including already downloaded ones)?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Download All',
            onPress: async () => {
              await performDownloadAll(event);
            },
          },
        ]
      );
      return;
    }

    await performDownloadAll(event);
  };

  const performDownloadAll = async (event: EventWithPhotos) => {
    setIsDownloadingAll(true);
    setDownloadAllProgress({ current: 0, total: event.photos.length });

    let successCount = 0;
    let failCount = 0;

    try {
      // Request permissions if needed (iOS only) - check once at the start
      const hasPermission = await requestMediaPermissionsIfNeeded();
      if (!hasPermission) {
        setIsDownloadingAll(false);
        throw new Error('Media library permission is required to save photos');
      }

      // Download all photos (including already downloaded ones)
      const photosToDownload = event.photos;

      // Download each photo sequentially
      // Note: On Android, we use MediaStore API (no permissions needed)
      // On iOS, permissions are already checked above
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
            // Add attribution watermark (Reddit-style)
            let finalImageUri = fileUri;
            try {
              // Get uploader's user ID from filename (format: userId_timestamp.jpg)
              let uploaderUserId = photo.uploaded_by;
              if (!uploaderUserId && photo.file_name) {
                // Extract userId from filename: userId_timestamp.jpg
                const fileNameParts = photo.file_name.split('_');
                if (fileNameParts.length >= 2) {
                  uploaderUserId = fileNameParts[0];
                }
              }
              
              // Get uploader's full name for attribution
              let userName = 'User';
              if (uploaderUserId) {
                // Try to get user profile from RPC function
                const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: uploaderUserId });
                
                if (!rpcError && userProfile) {
                  const profile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
                  const firstName = profile.first_name || '';
                  const lastName = profile.last_name || '';
                  
                  if (firstName && lastName) {
                    userName = `${firstName} ${lastName}`;
                  } else if (firstName) {
                    userName = firstName;
                  } else if (lastName) {
                    userName = lastName;
                  } else if (profile.email) {
                    userName = profile.email.split('@')[0];
                  }
                } else {
                  // Fallback: use filename pattern
                  userName = uploaderUserId.substring(0, 8) + '...';
                }
              }
              
              // Add attribution overlay to the image
              finalImageUri = await addAttributionToImage(fileUri, userName);
              
              // Verify the attributed image exists
              if (finalImageUri !== fileUri) {
                const checkPath = finalImageUri.startsWith('file://') 
                  ? finalImageUri 
                  : `file://${finalImageUri}`;
                
                const fileInfo = await FileSystem.getInfoAsync(checkPath);
                if (!fileInfo.exists) {
                  finalImageUri = fileUri;
                }
              }
            } catch (attributionError) {
              console.error('Error adding attribution (bulk), using original image:', attributionError);
              finalImageUri = fileUri;
            }
            
            // Ensure URI has file:// prefix
            const assetUri = finalImageUri.startsWith('file://') 
              ? finalImageUri 
              : `file://${finalImageUri}`;
            
            // Generate filename for saved file
            const savedFileName = photo.file_name || `GanApp_${photo.id}_${Date.now()}.jpg`;
            const fileType = savedFileName.split('.').pop()?.toLowerCase() || 'jpg';
            
            // Save to Pictures/GanApp/
            if (Platform.OS === 'android') {
              // Android: Use MediaStore API (no permissions needed on Android 10+)
              await saveFileToGanApp(assetUri, savedFileName, fileType);
            } else {
              // iOS: Use MediaLibrary (requires permissions)
              const asset = await MediaLibrary.createAssetAsync(assetUri);
              const album = await MediaLibrary.getAlbumAsync('GanApp');
              if (album) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              } else {
                await MediaLibrary.createAlbumAsync('GanApp', asset, false);
              }
            }
            
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

    } catch (error: any) {
      console.error('Error in downloadAllPhotos:', error);
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
    <View style={{ flex: 1 }}>
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
          paddingTop: 16,
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
        {/* Search Bar */}
        <View className="mb-4">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-md">
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-slate-800"
              placeholder="Search events..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter and Sort Controls */}
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-1 flex-row items-center justify-center bg-white rounded-xl px-4 py-3 shadow-md"
          >
            <Ionicons name="filter" size={18} color="#1e40af" />
            <Text className="ml-2 text-slate-800 font-medium">Filters</Text>
            {(dateFilter !== 'all' || venueFilter !== 'all') && (
              <View className="ml-2 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-white rounded-xl px-4 py-3 shadow-md"
            onPress={() => {
              // Cycle through sort options
              const sortOptions: SortOption[] = ['date-asc', 'date-desc', 'title-asc', 'title-desc', 'photos-asc', 'photos-desc'];
              const currentIndex = sortOptions.indexOf(sortOption);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortOption(sortOptions[nextIndex]);
            }}
          >
            <Ionicons name="swap-vertical" size={18} color="#1e40af" />
            <Text className="ml-2 text-slate-800 font-medium">
              {sortOption === 'date-asc' ? 'Date ↑' :
               sortOption === 'date-desc' ? 'Date ↓' :
               sortOption === 'title-asc' ? 'Title A-Z' :
               sortOption === 'title-desc' ? 'Title Z-A' :
               sortOption === 'photos-asc' ? 'Photos ↑' :
               'Photos ↓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
        {showFilters && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <Text className="text-lg font-bold text-slate-800 mb-3">Date Filter</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(['all', 'upcoming', 'past'] as DateFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setDateFilter(filter)}
                  className={`px-4 py-2 rounded-lg ${
                    dateFilter === filter ? 'bg-blue-600' : 'bg-slate-100'
                  }`}
                >
                  <Text className={`font-medium ${
                    dateFilter === filter ? 'text-white' : 'text-slate-700'
                  }`}>
                    {filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : 'Past'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {uniqueVenues.length > 0 && (
              <>
                <Text className="text-lg font-bold text-slate-800 mb-3">Venue</Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => setVenueFilter('all')}
                    className={`px-4 py-2 rounded-lg ${
                      venueFilter === 'all' ? 'bg-blue-600' : 'bg-slate-100'
                    }`}
                  >
                    <Text className={`font-medium ${
                      venueFilter === 'all' ? 'text-white' : 'text-slate-700'
                    }`}>
                      All Venues
                    </Text>
                  </TouchableOpacity>
                  {uniqueVenues.map((venue) => (
                    <TouchableOpacity
                      key={venue}
                      onPress={() => setVenueFilter(venue)}
                      className={`px-4 py-2 rounded-lg ${
                        venueFilter === venue ? 'bg-blue-600' : 'bg-slate-100'
                      }`}
                    >
                      <Text className={`font-medium ${
                        venueFilter === venue ? 'text-white' : 'text-slate-700'
                      }`}>
                        {venue}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {filteredAndSortedEvents.length === 0 ? (
          events.length === 0 ? (
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
          <View className="bg-white rounded-3xl p-8 shadow-xl items-center" style={styles.card}>
            <Ionicons name="search-outline" size={64} color="#94a3b8" className="mb-4" />
            <Text className="text-slate-600 text-center text-lg font-medium mb-2">
              No Results Found
            </Text>
            <Text className="text-slate-500 text-center">
              Try adjusting your search or filters
            </Text>
          </View>
        )) : (
          <View>
            {filteredAndSortedEvents.map((event, index) => (
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
              style={{ paddingTop: 8, paddingBottom: 12 }}
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
                      <View className="absolute top-2 right-2 flex-row items-center gap-1">
                        {downloadedPhotoIds.has(photo.id) && (
                          <View className="w-2 h-2 bg-green-400 rounded-full" />
                        )}
                        <TouchableOpacity
                          onPress={() => downloadPhoto(photo)}
                          disabled={downloadingPhotoId === photo.id}
                          className="w-8 h-8 items-center justify-center rounded-full bg-black/60"
                        >
                          {downloadingPhotoId === photo.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Ionicons name="download" size={18} color="#ffffff" />
                          )}
                        </TouchableOpacity>
                      </View>
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
              style={{ paddingTop: 8 }}
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
                    downloadPhoto(currentPhoto);
                  }}
                  disabled={downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id}
                  className="w-10 h-10 items-center justify-center rounded-full bg-black/50"
                >
                  {downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
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
    </View>
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
