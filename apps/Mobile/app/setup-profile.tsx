import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  Modal,
  FlatList,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import { UserService } from '../lib/userService';
import TutorialOverlay from '../components/TutorialOverlay';

interface SetupProfileFormData {
  prefix: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  affix: string;
  affiliatedOrganization: string;
}

export default function SetupProfileScreen() {
  const [formData, setFormData] = useState<SetupProfileFormData>({
    prefix: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    affix: '',
    affiliatedOrganization: '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarOriginalUri, setAvatarOriginalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<MediaLibrary.Album | null>(null);
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser, setUser: setAuthUser, isLoading: authLoading } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Refs for form inputs
  const prefixRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const middleInitialRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const affixRef = useRef<TextInput>(null);
  const orgRef = useRef<TextInput>(null);
  
  // Dropdown states
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
  const [showAffixDropdown, setShowAffixDropdown] = useState(false);

  // Store input Y positions for scrolling
  const inputYPositions = useRef<{ [key: string]: number }>({});
  const buttonYPosition = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper function to check if user profile is complete
  const isProfileComplete = (user: any): boolean => {
    if (!user) return false;
    
    // Handle both undefined and empty string cases - be very explicit
    const firstName = user.first_name;
    const lastName = user.last_name;
    const affiliatedOrg = user.affiliated_organization;
    
    const hasFirstName = firstName !== undefined && firstName !== null && String(firstName).trim() !== '';
    const hasLastName = lastName !== undefined && lastName !== null && String(lastName).trim() !== '';
    const hasAffiliatedOrg = affiliatedOrg !== undefined && affiliatedOrg !== null && String(affiliatedOrg).trim() !== '';
    
    const isComplete = hasFirstName && hasLastName && hasAffiliatedOrg;
    
    return isComplete;
  };

  // Wait for user to be loaded, redirect to login if not authenticated after loading
  // Also redirect to tabs if profile is already complete
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      // User not authenticated, redirect to login
      router.replace('/login');
      return;
    }
    
    // Immediately check if profile is complete and redirect if so
    // This prevents any flash of the setup-profile screen
    if (isProfileComplete(user)) {
      router.replace('/(tabs)');
      return;
    }
  }, [user, authLoading, router]);

  // Handle keyboard show/hide and scroll to focused input
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Find which input is focused and scroll to it
        let focusedField: string | null = null;
        if (firstNameRef.current?.isFocused()) {
          focusedField = 'firstName';
        } else if (lastNameRef.current?.isFocused()) {
          focusedField = 'lastName';
        } else if (orgRef.current?.isFocused()) {
          focusedField = 'org';
        }

        if (focusedField && inputYPositions.current[focusedField] !== undefined) {
          const keyboardHeight = e.endCoordinates.height;
          const inputY = inputYPositions.current[focusedField];
          
          // For the last field (org), scroll enough to show the button as well
          if (focusedField === 'org') {
            const screenHeight = Dimensions.get('window').height;
            const availableHeight = screenHeight - keyboardHeight;
            
            if (buttonYPosition.current > 0) {
              const buttonBottom = buttonYPosition.current + 60;
              const scrollY = Math.max(0, buttonBottom - availableHeight + 20);
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: scrollY,
                  animated: true,
                });
              }, 150);
            } else {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, inputY - 250),
                  animated: true,
                });
              }, 150);
            }
          } else {
            // For other fields, scroll to position input above keyboard with padding
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, inputY - 120),
                animated: true,
              });
            }, 100);
          }
        }
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Helper to store input Y position when layout changes
  const handleInputLayout = (field: string) => (event: any) => {
    const { y } = event.nativeEvent.layout;
    event.target.measureInWindow((x: number, yPos: number, width: number, height: number) => {
      inputYPositions.current[field] = yPos;
    });
  };

  const handleInputChange = (field: keyof SetupProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'android') {
        // On Android, use expo-media-library to show device albums directly
        const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
              Alert.alert('Permission Required', 'Please grant media library permissions to upload a profile photo.');
            }
          });
          return;
        }

        // Show modal immediately for instant response
        if (isMountedRef.current) {
          setShowGalleryPicker(true);
          setSelectedAlbum(null); // null means "All Photos"
          setLoadingAlbums(true);
          setLoadingPhotos(true);
        }
        
        // Load photos and albums in parallel in the background
        Promise.all([
          // Load recent photos (reduced for faster loading)
          MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: MediaLibrary.SortBy.creationTime,
            first: 50, // Reduced from 200 for faster initial load
          }),
          // Load albums
          MediaLibrary.getAlbumsAsync(),
        ]).then(([allPhotos, albumsList]) => {
          if (isMountedRef.current) {
            setPhotos(allPhotos.assets);
            setAlbums(albumsList);
            setLoadingPhotos(false);
            setLoadingAlbums(false);
          }
        }).catch((err) => {
          console.error('Error loading photos/albums:', err);
          if (isMountedRef.current) {
            setLoadingPhotos(false);
            setLoadingAlbums(false);
          }
        });
      } else {
        // On iOS, use the standard expo-image-picker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
              Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile photo.');
            }
          });
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          selectionLimit: 1,
        });

        if (!result.canceled && result.assets[0]) {
          // Store original URI for upload (uploadAvatar will handle compression)
          setAvatarOriginalUri(result.assets[0].uri);
          setAvatarUri(result.assets[0].uri);
          setAvatarPreview(result.assets[0].uri);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
      });
      setLoadingAlbums(false);
    }
  };

  const loadPhotosFromAlbum = async (albumId: string | null) => {
    try {
      setLoadingPhotos(true);
      let assets;
      if (albumId === null) {
        // Load all photos
        assets = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: MediaLibrary.SortBy.creationTime,
          first: 100, // Reduced for faster loading
        });
      } else {
        // Load photos from specific album
        assets = await MediaLibrary.getAssetsAsync({
          album: albumId,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: MediaLibrary.SortBy.creationTime,
          first: 100, // Reduced for faster loading
        });
      }
      setPhotos(assets.assets);
      setLoadingPhotos(false);
    } catch (err) {
      console.error('Error loading photos from album:', err);
      setLoadingPhotos(false);
    }
  };

  const handleSelectAlbum = async (album: MediaLibrary.Album | null) => {
    setSelectedAlbum(album);
    await loadPhotosFromAlbum(album?.id || null);
  };

  // Memoize image size calculation
  const imageSize = useMemo(() => {
    const { width } = Dimensions.get('window');
    return (width - 6) / 3;
  }, []);

  const handleSelectPhoto = useCallback(async (photo: MediaLibrary.Asset) => {
    try {
      setShowGalleryPicker(false);
      
      // Try to get the full asset info, but fallback to photo.uri if it fails
      let imageUri = photo.uri;
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(photo);
        imageUri = assetInfo.localUri || assetInfo.uri || photo.uri;
      } catch (infoErr) {
        // If getAssetInfoAsync fails (e.g., missing ACCESS_MEDIA_LOCATION), use photo.uri directly
        // This is expected behavior and doesn't affect functionality
        imageUri = photo.uri;
      }
      
      if (!imageUri) {
        Alert.alert('Error', 'Failed to get image URI');
        return;
      }

      // Store original URI for upload (uploadAvatar will handle compression)
      setAvatarOriginalUri(imageUri);
      
      // Resize and compress using ImageManipulator for preview only
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            { resize: { width: 800 } }, // Resize to reasonable size for preview
          ],
          { 
            compress: 0.8, 
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        
        // Use compressed version for preview, but keep original for upload
        setAvatarUri(manipulatedImage.uri);
        setAvatarPreview(manipulatedImage.uri);
      } catch (manipulateErr) {
        // If manipulation fails, use original for both
        console.error('Error manipulating image:', manipulateErr);
        setAvatarUri(imageUri);
        setAvatarPreview(imageUri);
      }
    } catch (err) {
      console.error('Error selecting photo:', err);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    }
  }, []);

  // Memoized PhotoItem component for better performance
  const PhotoItem = React.memo(({ item, onPress, size }: { 
    item: MediaLibrary.Asset; 
    onPress: (item: MediaLibrary.Asset) => void;
    size: number;
  }) => (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={{ 
        width: size, 
        height: size, 
        margin: 1,
      }}
    >
      <Image
        source={{ uri: item.uri }}
        style={{ 
          width: '100%', 
          height: '100%',
        }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  ));

  // Optimized renderItem for FlatList
  const renderPhotoItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => {
    return <PhotoItem item={item} onPress={handleSelectPhoto} size={imageSize} />;
  }, [imageSize, handleSelectPhoto]);

  // Optimized keyExtractor
  const keyExtractor = useCallback((item: MediaLibrary.Asset) => item.id, []);

  // Optimized getItemLayout for better performance (3-column grid)
  const getItemLayout = useCallback((data: any, index: number) => {
    const itemSize = imageSize + 2; // width + margin
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      length: itemSize,
      offset: row * itemSize * 3 + col * itemSize,
      index,
    };
  }, [imageSize]);

  const handleRemoveAvatar = () => {
    setAvatarUri(null);
    setAvatarPreview(null);
    setAvatarOriginalUri(null);
  };

  const validateForm = () => {
    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedOrg = formData.affiliatedOrganization.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      return 'First name and last name are required';
    }

    if (!trimmedOrg) {
      return 'Affiliated organization is required';
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      router.replace('/login');
      return;
    }

    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      let avatarUrl = '';

      // Upload avatar if selected
      // Use original URI if available (uploadAvatar will handle compression)
      const uriToUpload = avatarOriginalUri || avatarUri;
      if (uriToUpload) {
        const uploadResult = await UserService.uploadAvatar(user.id, uriToUpload);
        if (uploadResult.error) {
          setError(uploadResult.error);
          setIsLoading(false);
          return;
        }
        avatarUrl = uploadResult.url || '';
      }

      // Prepare update data
      const updateData: any = {
        prefix: formData.prefix.trim() || '',
        first_name: formData.firstName.trim(),
        middle_initial: formData.middleInitial.trim() || '',
        last_name: formData.lastName.trim(),
        affix: formData.affix.trim() || '',
        affiliated_organization: formData.affiliatedOrganization.trim(),
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      // Update user profile
      const result = await UserService.updateProfile(user.id, updateData);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // If updateProfile returned the updated user, use it directly
      // This ensures we have the latest data immediately without waiting for metadata sync
      if (result.user) {
        console.log('Profile updated, setting user directly:', {
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          affiliated_organization: result.user.affiliated_organization
        });
        setAuthUser(result.user);
      } else {
        // Fallback: refresh user data
        await refreshUser();
        // Wait a bit for metadata to sync in Supabase
        await new Promise(resolve => setTimeout(resolve, 500));
        // Force another refresh to get the latest data
        await refreshUser();
      }

      // Show success and redirect to main app
      Alert.alert(
        'Profile Setup Complete!',
        'Your profile has been set up successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading while auth is being checked
  if (authLoading || !user) {
    return (
      <>
        <StatusBar style="light" />
        <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </SafeAreaView>
      </>
    );
  }

  // Don't render anything if profile is complete or still loading auth
  // This prevents any flash of the setup-profile screen
  if (authLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (isProfileComplete(user)) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 bg-blue-900">
        <TutorialOverlay
          screenId="setup-profile"
          steps={[
            {
              id: '1',
              title: 'Complete Your Profile',
              description: 'Fill in your personal information to complete your profile setup. This information will be used for event registrations.',
            },
            {
              id: '2',
              title: 'Profile Picture',
              description: 'Add a profile picture by tapping on the camera icon to select a photo from your gallery.',
            },
            {
              id: '3',
              title: 'Save Your Profile',
              description: 'After filling in all required fields, tap "Complete Setup" to complete your setup and start using the app.',
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20) + 300,
              paddingHorizontal: 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            keyboardDismissMode="interactive"
          >
            <View className="flex-1 justify-center max-w-md mx-auto w-full">
              {/* Header */}
              <View className="mb-8">
                <Text className="text-4xl font-bold text-white mb-2 text-center">
                  Set Up Your Profile
                </Text>
                <Text className="text-lg text-blue-200 text-center mb-3">
                  Complete your profile to get started
                </Text>
                <View className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 mt-2">
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle" size={20} color="#fbbf24" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="text-amber-200 text-sm flex-1">
                      Make sure to use your real name as you can't change it later.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Profile Card */}
              <View className="bg-white rounded-2xl p-6 shadow-xl">
                {/* Error Messages */}
                {error && (
                  <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Text className="text-red-700 text-base">{error}</Text>
                  </View>
                )}

                {/* Avatar Upload */}
                <View className="items-center mb-6">
                  <View className="relative">
                    {avatarPreview ? (
                      <View className="relative">
                        <Image
                          source={{ uri: avatarPreview }}
                          style={{ 
                            width: 128, 
                            height: 128, 
                            borderRadius: 64,
                            borderWidth: 4, 
                            borderColor: '#1e3a8a' 
                          }}
                        />
                        <TouchableOpacity
                          onPress={handleRemoveAvatar}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center"
                          disabled={isLoading}
                        >
                          <Ionicons name="close" size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View 
                        style={{ 
                          width: 128, 
                          height: 128, 
                          borderRadius: 64,
                          borderWidth: 4, 
                          borderColor: '#1e3a8a',
                          backgroundColor: '#dbeafe',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Ionicons name="person" size={48} color="#1e3a8a" />
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={handlePickImage}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
                      style={{ borderWidth: 3, borderColor: '#ffffff' }}
                      disabled={isLoading}
                    >
                      <Ionicons name="camera" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-base text-slate-600 mt-3 text-center">
                    Tap the camera icon to select a photo from your gallery
                  </Text>
                </View>

                {/* Prefix Dropdown */}
                <View className="mb-4">
                  <Text className="text-base font-semibold text-black mb-2">Prefix</Text>
                  <TouchableOpacity
                    onPress={() => setShowPrefixDropdown(!showPrefixDropdown)}
                    className="flex-row items-center justify-between border border-gray-300 rounded-xl px-3 bg-gray-50 h-12"
                  >
                    <Text className={`text-base ${formData.prefix ? 'text-black' : 'text-gray-500'}`}>
                      {formData.prefix || 'Select...'}
                    </Text>
                    <Ionicons 
                      name={showPrefixDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#1e3a8a" 
                    />
                  </TouchableOpacity>
                  {showPrefixDropdown && (
                    <View className="mt-1 border border-gray-300 rounded-xl bg-white shadow-lg">
                      {['', 'Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Engr.', 'Atty.', 'Rev.', 'Hon.'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            handleInputChange('prefix', option);
                            setShowPrefixDropdown(false);
                          }}
                          className={`p-3 border-b border-gray-200 last:border-b-0 ${
                            formData.prefix === option ? 'bg-blue-50' : ''
                          }`}
                        >
                          <Text className={`text-base ${formData.prefix === option ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                            {option || 'None'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* First Name Input */}
                <View 
                  className="mb-4"
                  onLayout={handleInputLayout('firstName')}
                >
                  <Text className="text-base font-semibold text-black mb-2">First Name *</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                    <Ionicons name="person-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={firstNameRef}
                      className="flex-1 h-12 text-base text-black"
                      placeholder="Enter your first name"
                      placeholderTextColor="#666"
                      value={formData.firstName}
                      onChangeText={(text) => handleInputChange('firstName', text)}
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => middleInitialRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Middle Initial Input */}
                <View 
                  className="mb-4"
                  onLayout={handleInputLayout('middleInitial')}
                >
                  <Text className="text-base font-semibold text-black mb-2">Middle Initial</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                    <Ionicons name="person-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={middleInitialRef}
                      className="flex-1 h-12 text-base text-black"
                      placeholder="A"
                      placeholderTextColor="#666"
                      value={formData.middleInitial}
                      onChangeText={(text) => {
                        // Convert to uppercase and only add period if user is typing (value has a letter at the end, not a period)
                        // This allows the period to be deleted but will reappear when typing
                        let value = text.toUpperCase();
                        if (value && value.length > 0) {
                          const lastChar = value[value.length - 1];
                          // If last character is a letter (not period, not space), add period
                          if (/[A-Za-z]/.test(lastChar)) {
                            value = value + '.';
                          }
                        }
                        handleInputChange('middleInitial', value);
                      }}
                      maxLength={2}
                      autoCapitalize="characters"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Last Name Input */}
                <View 
                  className="mb-4"
                  onLayout={handleInputLayout('lastName')}
                >
                  <Text className="text-base font-semibold text-black mb-2">Last Name *</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                    <Ionicons name="person-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={lastNameRef}
                      className="flex-1 h-12 text-base text-black"
                      placeholder="Enter your last name"
                      placeholderTextColor="#666"
                      value={formData.lastName}
                      onChangeText={(text) => handleInputChange('lastName', text)}
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => affixRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Affix Dropdown */}
                <View className="mb-4">
                  <Text className="text-base font-semibold text-black mb-2">Affix</Text>
                  <TouchableOpacity
                    onPress={() => setShowAffixDropdown(!showAffixDropdown)}
                    className="flex-row items-center justify-between border border-gray-300 rounded-xl px-3 bg-gray-50 h-12"
                  >
                    <Text className={`text-base ${formData.affix ? 'text-black' : 'text-gray-500'}`}>
                      {formData.affix || 'Select...'}
                    </Text>
                    <Ionicons 
                      name={showAffixDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#1e3a8a" 
                    />
                  </TouchableOpacity>
                  {showAffixDropdown && (
                    <View className="mt-1 border border-gray-300 rounded-xl bg-white shadow-lg">
                      {['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            handleInputChange('affix', option);
                            setShowAffixDropdown(false);
                          }}
                          className={`p-3 border-b border-gray-200 last:border-b-0 ${
                            formData.affix === option ? 'bg-blue-50' : ''
                          }`}
                        >
                          <Text className={`text-base ${formData.affix === option ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                            {option || 'None'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Affiliated Organization Input */}
                <View 
                  className="mb-6"
                  onLayout={handleInputLayout('org')}
                >
                  <Text className="text-base font-semibold text-black mb-2">Affiliated Organization *</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                    <Ionicons name="business-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={orgRef}
                      className="flex-1 h-12 text-base text-black"
                      placeholder="Enter your organization"
                      placeholderTextColor="#666"
                      value={formData.affiliatedOrganization}
                      onChangeText={(text) => handleInputChange('affiliatedOrganization', text)}
                      autoCapitalize="words"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        orgRef.current?.blur();
                        Keyboard.dismiss();
                        // Submit form if all fields are filled
                        if (formData.firstName.trim() && formData.lastName.trim() && formData.affiliatedOrganization.trim()) {
                          handleSubmit();
                        }
                      }}
                    />
                  </View>
                </View>

                {/* Required Fields Legend */}
                <View className="mb-4">
                  <Text className="text-base text-gray-600">
                    <Text className="text-red-500 text-lg font-bold">*</Text> Required fields
                  </Text>
                </View>

                {/* Submit Button */}
                <View
                  onLayout={(e) => {
                    e.target.measureInWindow((x: number, y: number, width: number, height: number) => {
                      buttonYPosition.current = y;
                    });
                  }}
                >
                  <TouchableOpacity
                    className="bg-blue-800 rounded-xl py-3 items-center"
                    style={isLoading ? { backgroundColor: '#9ca3af' } : undefined}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white text-base font-bold">
                      Complete Setup
                    </Text>
                  )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Gallery Picker Modal - Facebook Messenger Style */}
        <Modal
          visible={showGalleryPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowGalleryPicker(false);
            setShowAlbumDropdown(false);
          }}
        >
          <SafeAreaView className="flex-1 bg-blue-900">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-blue-700 bg-blue-900">
              <Text className="text-xl font-semibold text-white">Select Photo</Text>
              <TouchableOpacity
                onPress={() => setShowGalleryPicker(false)}
                className="w-10 h-10 items-center justify-center rounded-full active:bg-blue-800"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Album Selector - Dropdown */}
            {!loadingAlbums && albums.length > 0 && (
              <View className="bg-blue-900 border-b border-blue-700 px-4 py-3">
                <TouchableOpacity
                  onPress={() => setShowAlbumDropdown(!showAlbumDropdown)}
                  className="flex-row items-center justify-between bg-blue-800 rounded-lg px-4 py-3"
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="folder" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text className="text-white text-base font-medium">
                      {selectedAlbum === null ? 'All Photos' : selectedAlbum.title}
                    </Text>
                  </View>
                  <Ionicons 
                    name={showAlbumDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#ffffff" 
                  />
                </TouchableOpacity>
                
                {/* Dropdown Menu */}
                {showAlbumDropdown && (
                  <View className="absolute top-full left-4 right-4 mt-1 bg-blue-800 rounded-lg border border-blue-700 z-50" style={{ maxHeight: 300 }}>
                    <ScrollView nestedScrollEnabled>
                      <TouchableOpacity
                        onPress={() => {
                          handleSelectAlbum(null);
                          setShowAlbumDropdown(false);
                        }}
                        className={`px-4 py-3 border-b border-blue-700 ${
                          selectedAlbum === null ? 'bg-blue-700' : ''
                        }`}
                      >
                        <Text className={`text-base ${
                          selectedAlbum === null ? 'text-white font-semibold' : 'text-blue-200'
                        }`}>
                          All Photos
                        </Text>
                      </TouchableOpacity>
                      {albums.map((album) => (
                        <TouchableOpacity
                          key={album.id}
                          onPress={() => {
                            handleSelectAlbum(album);
                            setShowAlbumDropdown(false);
                          }}
                          className={`px-4 py-3 border-b border-blue-700 ${
                            selectedAlbum?.id === album.id ? 'bg-blue-700' : ''
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className={`text-base flex-1 ${
                              selectedAlbum?.id === album.id ? 'text-white font-semibold' : 'text-blue-200'
                            }`}>
                              {album.title}
                            </Text>
                            <Text className={`text-sm ml-2 ${
                              selectedAlbum?.id === album.id ? 'text-blue-200' : 'text-blue-400'
                            }`}>
                              {album.assetCount}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Photos Grid */}
            {loadingPhotos || loadingAlbums ? (
              <View className="flex-1 items-center justify-center bg-blue-900">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-blue-200 mt-4">Loading photos...</Text>
              </View>
            ) : photos.length === 0 ? (
              <View className="flex-1 items-center justify-center bg-blue-900">
                <Ionicons name="images-outline" size={64} color="#64748b" />
                <Text className="text-slate-400 mt-4 text-lg">No photos found</Text>
              </View>
            ) : (
              <FlatList
                data={photos}
                numColumns={3}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                contentContainerStyle={{ padding: 2 }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={5}
                renderItem={renderPhotoItem}
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}


