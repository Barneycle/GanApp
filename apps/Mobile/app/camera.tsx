import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { showError, showSuccess, showWarning, showInfo } from '../lib/sweetAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Camera,
  getCameraDevice,
  useCameraPermission,
  getCameraFormat,
} from 'react-native-vision-camera';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import TutorialOverlay from '../components/TutorialOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ASPECT_RATIO = 4 / 3;

interface CapturedPhoto {
  path: string;
  uri: string;
}

export default function CameraScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0 });

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const camera = useRef<Camera>(null);

  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraType);
  const activeDevice = device || devices.find(d => d.position === 'back') || devices[0];

  // Get camera format with 4:3 aspect ratio
  // Manually find a format with 4:3 aspect ratio
  const cameraFormat = activeDevice?.formats?.find(format => {
    if (format.photoHeight && format.photoWidth) {
      const aspectRatio = format.photoWidth / format.photoHeight;
      // Check if aspect ratio is approximately 4:3 (1.333)
      return Math.abs(aspectRatio - (4 / 3)) < 0.1;
    }
    return false;
  }) || activeDevice?.formats?.[0]; // Fallback to first available format

  // Add this function to refresh photo count
  const refreshPhotoCount = useCallback(async () => {
    if (eventId && user?.id) {
      const limitCheck = await checkPhotoLimit(eventId, user.id);
      setPhotoCount(limitCheck.count);
    }
  }, [eventId, user?.id]);

  // Refresh photo count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPhotoCount();
    }, [refreshPhotoCount])
  );

  useEffect(() => {
    const init = async () => {
      try {
        if (hasPermission === false) {
          const granted = await requestPermission();
          if (!granted) {
            setError('Camera permission is required to take photos.');
          }
        }
        // Check existing photo count when component loads
        await refreshPhotoCount();
      } catch (err) {
        setError('Failed to initialize camera.');
      } finally {
        setIsInitializing(false);
      }
    };

    if (activeDevice) {
      init();
    } else {
      setError('No camera available on this device.');
      setIsInitializing(false);
    }
  }, [hasPermission, requestPermission, activeDevice, eventId, user?.id, refreshPhotoCount]);

  const checkPhotoLimit = async (eventId: string, userId: string): Promise<{ allowed: boolean; count: number }> => {
    try {
      const PHOTO_LIMIT = 10;

      // Check storage bucket for user's photos
      // List all files in the event folder
      const { data: files, error: storageError } = await supabase.storage
        .from('event-photos')
        .list(`${eventId}`, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (storageError) {
        console.log('Could not check photo limit from storage:', storageError.message);
        // If we can't check, allow upload (fail open)
        return { allowed: true, count: 0 };
      }

      // Count files that match the user ID pattern (userId_timestamp.jpg)
      const userPhotoCount = files?.filter(file =>
        file.name.startsWith(`${userId}_`) && file.name.endsWith('.jpg')
      ).length || 0;

      return {
        allowed: userPhotoCount < PHOTO_LIMIT,
        count: userPhotoCount
      };
    } catch (err) {
      console.error('Error checking photo limit:', err);
      // Fail open - allow upload if we can't check
      return { allowed: true, count: 0 };
    }
  };

  const takePhoto = async () => {
    if (!camera.current || !activeDevice || !eventId || !user?.id) {
      showError('Error', 'Camera not ready or missing information.');
      return;
    }

    try {
      setIsCapturing(true);
      setError(null);

      // Check if user has reached the limit (existing photos + captured photos)
      const totalPhotos = photoCount + capturedPhotos.length;
      if (totalPhotos >= 10) {
        showWarning(
          'Photo Limit Reached',
          `You have reached the maximum limit of 10 photos for this event. You have ${photoCount} uploaded photos and ${capturedPhotos.length} photos ready to upload.`
        );
        setIsCapturing(false);
        return;
      }

      const photo = await camera.current.takePhoto({
        flash: 'off',
      });

      // Add photo to captured photos list (don't upload yet)
      const photoUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      setCapturedPhotos(prev => [...prev, { path: photo.path, uri: photoUri }]);
    } catch (err: any) {
      console.error('Error taking photo:', err);
      setError(err.message || 'Failed to take photo. Please try again.');
      showError('Error', err.message || 'Failed to take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const pickImagesFromLibrary = async () => {
    try {
      // Check photo limit
      const totalPhotos = photoCount + capturedPhotos.length;
      if (totalPhotos >= 10) {
        showWarning(
          'Photo Limit Reached',
          `You have reached the maximum limit of 10 photos for this event. You have ${photoCount} uploaded photos and ${capturedPhotos.length} photos ready to upload.`
        );
        return;
      }

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning(
          'Permission Required',
          'Please grant media library permissions to select photos.'
        );
        return;
      }

      // Calculate how many photos can still be added
      const remainingSlots = 10 - photoCount - capturedPhotos.length;
      const selectionLimit = Math.min(remainingSlots, 10);

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: selectionLimit,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Process selected images
        const newPhotos: CapturedPhoto[] = [];

        for (const asset of result.assets) {
          // Check if we've reached the limit
          if (photoCount + capturedPhotos.length + newPhotos.length >= 10) {
            showWarning(
              'Photo Limit Reached',
              `You can only add up to 10 photos. Added ${newPhotos.length} photo(s).`
            );
            break;
          }

          // Compress and resize the image
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1920 } }], // Resize to max width 1920px
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );

          newPhotos.push({
            path: manipulatedImage.uri.replace('file://', ''),
            uri: manipulatedImage.uri,
          });
        }

        if (newPhotos.length > 0) {
          setCapturedPhotos(prev => [...prev, ...newPhotos]);
        }
      }
    } catch (err: any) {
      console.error('Error picking images:', err);
      showError('Error', err.message || 'Failed to pick images. Please try again.');
    }
  };

  const uploadAllPhotos = async () => {
    if (!eventId || !user?.id) {
      showError('Error', 'Missing event or user information.');
      return;
    }

    if (capturedPhotos.length === 0) {
      showWarning('No Photos', 'Please take at least one photo before uploading.');
      return;
    }

    // Check final limit before uploading
    const totalPhotos = photoCount + capturedPhotos.length;
    if (totalPhotos > 10) {
      showWarning(
        'Photo Limit Exceeded',
        `You can only upload ${10 - photoCount} more photos. Please remove ${totalPhotos - 10} photo(s) before uploading.`
      );
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const total = capturedPhotos.length;
      setUploadProgress({ current: 0, total, percentage: 0 });

      // Track progress for each photo (0-100 for each)
      // Use an object to maintain reference across closures
      const progressState = { photoProgress: new Array(total).fill(0) };

      // Helper function to update progress
      const updateProgress = () => {
        const photoProgress = progressState.photoProgress;
        // Calculate overall percentage: average of all photo progress
        const totalProgress = photoProgress.reduce((sum, p) => sum + p, 0);
        const averageProgress = totalProgress / total;
        const percentage = Math.round(averageProgress);

        // Count completed photos (photos at 100%)
        const completedPhotos = photoProgress.filter(p => p >= 100).length;

        setUploadProgress({
          current: completedPhotos,
          total,
          percentage: Math.min(percentage, 100)
        });
      };

      // Upload all photos in parallel with progress tracking
      const uploadResults: { queued: boolean }[] = [];
      const uploadPromises = capturedPhotos.map((photo, index) =>
        uploadPhoto(photo.path, eventId, user.id, (progress) => {
          // Update this photo's progress (0-100), ensuring it only increases
          progressState.photoProgress[index] = Math.max(
            progressState.photoProgress[index],
            Math.min(progress, 100)
          );
          updateProgress();
        }).then((result) => {
          uploadResults[index] = { queued: result.queued || false };
        }).catch(() => {
          uploadResults[index] = { queued: false };
        })
      );

      await Promise.all(uploadPromises);

      // Store the count before clearing
      const uploadedCount = capturedPhotos.length;
      const queuedCount = uploadResults.filter(r => r.queued).length;
      const onlineUploadedCount = uploadedCount - queuedCount;

      // Update photo count (only count online uploads immediately)
      setPhotoCount(prev => prev + onlineUploadedCount);

      // Clear captured photos and reset progress
      setCapturedPhotos([]);
      setUploadProgress({ current: 0, total: 0, percentage: 0 });

      // Show appropriate success message
      if (queuedCount > 0 && onlineUploadedCount > 0) {
        showSuccess(
          'Photos Saved',
          `${onlineUploadedCount} photo(s) uploaded successfully. ${queuedCount} photo(s) saved offline and will upload when online.`
        );
      } else if (queuedCount > 0) {
        showSuccess(
          'Photos Saved Offline',
          `${queuedCount} photo(s) saved offline and will upload when online.`
        );
      } else {
        showSuccess(
          'Success',
          `Successfully uploaded ${uploadedCount} photo(s)!`
        );
      }
    } catch (err: any) {
      console.error('Error uploading photos:', err);
      setError(err.message || 'Failed to upload photos. Please try again.');
      showError('Error', err.message || 'Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  const uploadPhoto = async (
    photoPath: string,
    eventId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ queued?: boolean }> => {
    try {
      // Convert file path to URI format for React Native
      const fileUri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;

      // Compress image before upload (reduce file size for faster uploads)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        fileUri,
        [{ resize: { width: 1920 } }], // Resize to max width of 1920px (maintains aspect ratio)
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // 80% quality, JPEG format
      );

      // Report compression progress (10% of total)
      onProgress?.(10);

      // Use AlbumService which handles offline queueing
      const { AlbumService } = await import('../lib/albumService');
      const result = await AlbumService.uploadPhoto(
        manipulatedImage.uri,
        eventId,
        userId,
        (progress) => {
          // Map progress from 10-100% (since compression is done)
          onProgress?.(10 + (progress * 0.9));
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload photo');
      }

      // Report final progress
      onProgress?.(100);

      return { queued: result.queued || false };
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      throw new Error(err.message || 'Failed to upload photo.');
    }
  };

  const toggleCamera = () => {
    setCameraType(prev => prev === 'back' ? 'front' : 'back');
  };

  if (isInitializing) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4">Initializing camera...</Text>
      </SafeAreaView>
    );
  }

  if (error && !activeDevice) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-4">
        <View className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
          <View className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 items-center justify-center">
            <Ionicons name="alert-circle" size={32} color="#dc2626" />
          </View>
          <Text className="text-lg font-semibold text-slate-800 mb-2 text-center">Camera Error</Text>
          <Text className="text-slate-600 mb-4 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 py-3 px-4 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-4">
        <View className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md">
          <View className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 items-center justify-center">
            <Ionicons name="camera" size={32} color="#2563eb" />
          </View>
          <Text className="text-lg font-semibold text-slate-800 mb-2 text-center">Camera Permission Required</Text>
          <Text className="text-slate-600 mb-4 text-center">
            Please grant camera permission to take photos for this event.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-blue-600 py-3 px-4 rounded-lg items-center mb-3"
          >
            <Text className="text-white font-medium">Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-200 py-3 px-4 rounded-lg items-center"
          >
            <Text className="text-slate-700 font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate space for header and bottom controls
  const headerHeight = insets.top + 60;
  const bottomControlsHeight = 250; // Space for bottom controls

  return (
    <SafeAreaView className="flex-1 bg-black">
      <TutorialOverlay
        screenId="camera"
        steps={[
          {
            id: '1',
            title: 'Upload Event Photos',
            description: 'Take photos or select from your gallery to upload photos for this event. You can upload up to 10 photos per event.',
          },
          {
            id: '2',
            title: 'Photo Upload',
            description: 'After selecting photos, tap "Upload Photos" to share them with other participants. Photos will appear in the event album.',
          },
        ]}
      />
      {/* Camera View */}
      <View style={{ flex: 1 }}>
        {activeDevice && cameraFormat && (
          <Camera
            ref={camera}
            device={activeDevice}
            format={cameraFormat}
            isActive={true}
            photo={true}
            style={{
              position: 'absolute',
              top: headerHeight,
              left: 0,
              right: 0,
              bottom: bottomControlsHeight + Math.max(insets.bottom, 20),
            }}
            photoHdr={false}
          />
        )}

        {/* Overlay */}
        <View style={StyleSheet.absoluteFill} className="justify-between">
          {/* Top Bar */}
          <View
            className="flex-row items-center justify-between px-4 pt-4"
            style={{ paddingTop: insets.top + 16 }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            <View className="w-10" />
          </View>

          {/* Bottom Controls */}
          <View
            className="pb-8"
            style={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
          >
            {/* Photo Limit Info */}
            <View className="items-center mb-4">
              <Text className="text-white text-base font-medium">
                {photoCount} uploaded • {capturedPhotos.length} ready • {10 - photoCount - capturedPhotos.length} remaining
              </Text>
            </View>

            {/* Bottom Controls Row */}
            <View className="flex-row items-center justify-between px-1 relative">
              {/* Left Side - Spacer */}
              <View style={{ width: 64 }} />

              {/* Center - Camera Button */}
              <TouchableOpacity
                onPress={takePhoto}
                disabled={isCapturing || isUploading || (photoCount + capturedPhotos.length >= 10)}
                className="w-24 h-24 rounded-full border-4 border-white items-center justify-center bg-white/20"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  opacity: (photoCount + capturedPhotos.length >= 10) ? 0.5 : 1,
                }}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color="#ffffff" />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-white" />
                )}
              </TouchableOpacity>

              {/* Right Side - Spacer (same width as left for symmetry) */}
              <View style={{ width: 64 }} />

              {/* Photo Preview Button - Always visible */}
              <View style={{ position: 'absolute', left: '50%', marginLeft: -120 }}>
                <TouchableOpacity
                  onPress={() => setIsPhotoModalOpen(true)}
                  className="relative"
                >
                  <View className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white bg-black/30 items-center justify-center">
                    {capturedPhotos.length > 0 ? (
                      <>
                        <Image
                          source={{ uri: capturedPhotos[capturedPhotos.length - 1].uri }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        <View className="absolute inset-0 bg-black/30 items-center justify-center">
                          <Text className="text-white font-bold text-sm">{capturedPhotos.length}</Text>
                        </View>
                      </>
                    ) : (
                      <Ionicons name="add" size={24} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Flip Camera Button - Positioned close to snap button */}
              <View style={{ position: 'absolute', left: '50%', marginLeft: 60 }}>
                <TouchableOpacity
                  onPress={toggleCamera}
                  className="w-16 h-16 rounded-full bg-black/50 items-center justify-center"
                >
                  <Ionicons name="camera-reverse" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <Text className="text-red-400 mt-4 text-center px-4 text-base">{error}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Photo Gallery Modal */}
      <Modal
        visible={isPhotoModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsPhotoModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          {/* Modal Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4"
            style={{ paddingTop: insets.top + 16 }}
          >
            <TouchableOpacity
              onPress={() => setIsPhotoModalOpen(false)}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-white text-lg font-semibold">
              {capturedPhotos.length} Photo(s)
            </Text>

            <View className="w-10" />
          </View>

          {/* Photo Grid */}
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
          >
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {/* Add Images Button */}
              {photoCount + capturedPhotos.length < 10 && (
                <TouchableOpacity
                  onPress={pickImagesFromLibrary}
                  className="relative border-2 border-dashed border-white/50 items-center justify-center"
                  style={{
                    width: '30%',
                    aspectRatio: 1,
                    borderRadius: 12,
                    marginTop: 8,
                  }}
                >
                  <Ionicons name="add" size={32} color="#ffffff" />
                  <Text className="text-white/70 text-xs mt-2 text-center px-2">
                    Add Photos
                  </Text>
                </TouchableOpacity>
              )}

              {capturedPhotos.map((photo, index) => (
                <View key={index} className="relative" style={{ width: '30%', marginTop: 8 }}>
                  <Image
                    source={{ uri: photo.uri }}
                    className="w-full aspect-square rounded-xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-8 h-8 rounded-full bg-red-500 items-center justify-center"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 3,
                      elevation: 5,
                      zIndex: 10,
                    }}
                  >
                    <Ionicons name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View
            className="px-4 py-4 border-t border-white/20"
            style={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
          >
            <View className="mb-3">
              <Text className="text-white/70 text-sm text-center mb-1">
                {photoCount} uploaded • {capturedPhotos.length} ready • {10 - photoCount - capturedPhotos.length} remaining
              </Text>
            </View>

            {/* Upload Progress Bar */}
            {isUploading && uploadProgress.total > 0 && (
              <View className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white/70 text-sm">
                    Uploading...
                  </Text>
                  <Text className="text-white/70 text-sm font-semibold">
                    {uploadProgress.percentage}%
                  </Text>
                </View>
                <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </View>
              </View>
            )}

            {capturedPhotos.length > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  await uploadAllPhotos();
                  // Modal will stay open, but captured photos will be cleared
                }}
                disabled={isUploading || isCapturing}
                className="w-full py-4 rounded-full bg-green-600 items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 6,
                  opacity: (isUploading || isCapturing) ? 0.6 : 1,
                }}
              >
                {isUploading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white font-bold text-lg ml-2">
                      Uploading...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="cloud-upload" size={24} color="#ffffff" />
                    <Text className="text-white font-bold text-lg ml-2">
                      Upload {capturedPhotos.length} Photo(s)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

