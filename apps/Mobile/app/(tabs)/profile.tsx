import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput, Platform, RefreshControl, Modal, FlatList, Dimensions, InteractionManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import { UserService } from '../../lib/userService';
import TutorialOverlay from '../../components/TutorialOverlay';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  affiliated_organization?: string;
  created_at?: string;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    affiliated_organization: ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarOriginalUri, setAvatarOriginalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<MediaLibrary.Album | null>(null);
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  // Sync form data with userProfile when it changes (only when not in edit mode)
  useEffect(() => {
    if (userProfile && !isEditMode) {
      setFormData({
        affiliated_organization: userProfile.affiliated_organization || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
    }
  }, [userProfile, isEditMode]);

  // When entering edit mode, populate form with current userProfile data
  useEffect(() => {
    if (isEditMode && userProfile) {
      setFormData({
        affiliated_organization: userProfile.affiliated_organization || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
    }
  }, [isEditMode]);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user metadata directly from Supabase Auth to ensure we have all fields
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      // Try to get user profile from RPC function
      const { data: profileData, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: user.id });
      
      if (!rpcError && profileData) {
        // Parse the JSON response if it's a string
        const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        
        // Ensure affiliated_organization is included from auth metadata if not in RPC response
        if (!profile.affiliated_organization && authUser?.user_metadata?.affiliated_organization) {
          profile.affiliated_organization = authUser.user_metadata.affiliated_organization;
        }
        
        // Also ensure avatar_url is included if not in RPC response
        if (!profile.avatar_url && authUser?.user_metadata?.avatar_url) {
          profile.avatar_url = authUser.user_metadata.avatar_url;
        }
        
        setUserProfile(profile);
      } else {
        // Fall back to auth metadata
        const profile = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: authUser?.user_metadata?.phone || '',
          avatar_url: authUser?.user_metadata?.avatar_url || user.avatar_url || '',
          affiliated_organization: authUser?.user_metadata?.affiliated_organization || user.affiliated_organization || '',
        };
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fall back to auth metadata
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const profile = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: authUser?.user_metadata?.phone || '',
          avatar_url: authUser?.user_metadata?.avatar_url || user.avatar_url || '',
          affiliated_organization: authUser?.user_metadata?.affiliated_organization || user.affiliated_organization || '',
        };
        setUserProfile(profile);
      } catch (fallbackError) {
        console.error('Error in fallback:', fallbackError);
        // Last resort - use what we have from user context
        const profile = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: '',
          avatar_url: user.avatar_url || '',
          affiliated_organization: user.affiliated_organization || '',
        };
        setUserProfile(profile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    if (refreshUser) {
      await refreshUser();
    }
    setRefreshing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleAvatarChange = async () => {
    try {
      if (Platform.OS === 'android') {
        // On Android, use expo-media-library to show device albums directly
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
              toast.warning('Please grant media library permissions to upload an avatar.');
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
              toast.warning('Please grant photo library access to upload an avatar.');
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
          const asset = result.assets[0];
          
          // Validate file size (max 50MB)
          if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
            InteractionManager.runAfterInteractions(() => {
              if (isMountedRef.current) {
                toast.error('Image size must be less than 50MB');
              }
            });
            return;
          }

          setAvatarUri(asset.uri);
          setAvatarPreview(asset.uri);
          if (error) setError(null);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          toast.error('Failed to pick image. Please try again.');
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
        toast.error('Failed to get image URI');
        return;
      }

      // Validate file size (max 50MB) - approximate check
      if (photo.width && photo.height) {
        // Rough estimate: assume 3 bytes per pixel for uncompressed
        const estimatedSize = photo.width * photo.height * 3;
        if (estimatedSize > 50 * 1024 * 1024) {
          toast.error('Image size must be less than 50MB');
          return;
        }
      }

      // Store original URI for upload (uploadAvatar will handle compression)
      setAvatarOriginalUri(imageUri);
      
      // Resize and compress using ImageManipulator for preview only
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            { resize: { width: 800 } }, // Resize to reasonable size
          ],
          { 
            compress: 0.8, 
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        
        // Use compressed version for preview, but keep original for upload
        setAvatarUri(manipulatedImage.uri);
        setAvatarPreview(manipulatedImage.uri);
        if (error) setError(null);
      } catch (manipulateErr) {
        // If manipulation fails, use original for both
        console.error('Error manipulating image:', manipulateErr);
        setAvatarUri(imageUri);
        setAvatarPreview(imageUri);
        if (error) setError(null);
      }
    } catch (err) {
      console.error('Error selecting photo:', err);
      toast.error('Failed to process image. Please try again.');
    }
  }, [error]);

  // Memoize image size calculation
  const imageSize = useMemo(() => {
    const { width } = Dimensions.get('window');
    return (width - 6) / 3;
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

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    if (passwordError) setPasswordError(null);
    if (passwordSuccess) setPasswordSuccess(false);
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password');
      setChangingPassword(false);
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Please enter a new password');
      setChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setChangingPassword(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setChangingPassword(false);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      setChangingPassword(false);
      return;
    }

    try {
      const result = await UserService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Hide password change section after success
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('User not found. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let avatarUrl = userProfile?.avatar_url || '';

      // Upload avatar if a new file was selected
      // Use original URI if available (uploadAvatar will handle compression)
      const uriToUpload = avatarOriginalUri || avatarUri;
      if (uriToUpload) {
        const uploadResult = await UserService.uploadAvatar(user.id, uriToUpload);
        if (uploadResult.error) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }
        avatarUrl = uploadResult.url || '';
      }

      // Prepare update data
      const updateData: any = {
        affiliated_organization: formData.affiliated_organization.trim()
      };

      // Add avatar URL if changed or removed
      if (avatarUri) {
        // New avatar uploaded
        updateData.avatar_url = avatarUrl;
      } else if (!avatarPreview && userProfile?.avatar_url) {
        // Avatar was removed
        updateData.avatar_url = '';
      }

      const result = await UserService.updateProfile(user.id, updateData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSuccess(true);
        toast.success('Your profile has been updated successfully!');
        await refreshUser();
        await loadUserProfile();
        setIsEditMode(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setError(null);
    setSuccess(false);
    setShowPasswordChange(false);
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    if (userProfile) {
      setFormData({
        affiliated_organization: userProfile.affiliated_organization || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
    }
    setAvatarUri(null);
    setAvatarOriginalUri(null);
  };


  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="profile"
        steps={[
          {
            id: '1',
            title: 'Edit Your Profile',
            description: 'Update your personal information, change your profile picture, and manage your account settings.',
          },
          {
            id: '2',
            title: 'Profile Picture',
            description: 'Tap on your profile picture to change it. You can take a new photo or select one from your gallery.',
          },
          {
            id: '3',
            title: 'Save Changes',
            description: 'After making changes, tap "Save Changes" to update your profile. You\'ll receive a confirmation when changes are saved.',
          },
        ]}
      />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          flexGrow: 1,
          padding: 16,
          paddingTop: 16,
          // Add extra bottom padding when in edit mode to account for tab bar (typically 50-60px)
          paddingBottom: isEditMode ? Math.max(insets.bottom, 16) + 80 : Math.max(insets.bottom, 16)
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1e40af"
            colors={["#1e40af"]}
          />
        }
      >
        <View className="w-full max-w-md mx-auto">
          {/* Profile Card */}
          <View className="rounded-2xl shadow-xl border border-slate-200 p-8 mb-6" style={{ backgroundColor: '#FAFAFA' }}>
            {!isEditMode ? (
              <>
            <View className="items-center mb-6">
              {/* Avatar */}
              {userProfile?.avatar_url ? (
                <View className="w-40 h-40 rounded-full overflow-hidden mb-4 bg-gray-200">
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View className="w-40 h-40 bg-blue-600 rounded-full items-center justify-center mx-auto mb-4">
                  <Ionicons name="person" size={80} color="white" />
                </View>
              )}
            </View>

            {/* Profile Information */}
            <View className="border-t border-slate-200 pt-6 mb-6">
              <View className="space-y-3 items-center">
                    {/* Name */}
                    {(userProfile?.first_name || userProfile?.last_name) && (
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-slate-800 mb-1 text-center">
                          {userProfile?.first_name} {userProfile?.last_name}
                        </Text>
                      </View>
                    )}

                    {/* Role */}
                    {userProfile?.role && (
                      <View className="items-center">
                        <Text className="text-slate-600 mb-2 capitalize text-center">{userProfile.role}</Text>
                      </View>
                    )}

                    {/* Email */}
                    {userProfile?.email && (
                      <View className="items-center">
                        <Text className="text-slate-500 text-sm text-center">{userProfile.email}</Text>
                      </View>
                    )}

                    {/* Affiliated Organization */}
                    {userProfile?.affiliated_organization && (
                      <View className="items-center">
                        <Text className="text-slate-700 text-center">{userProfile.affiliated_organization}</Text>
                      </View>
                    )}
                    
                {/* Phone */}
                {userProfile?.phone && (
                  <View className="items-center">
                    <Text className="text-slate-700 text-center">{userProfile.phone}</Text>
                  </View>
                )}
                
                {/* Member Since */}
                {userProfile?.created_at && (
                  <View className="items-center">
                    <Text className="text-slate-700 text-center">
                      Member since {new Date(userProfile.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Profile Actions */}
            <View className="gap-3">
              <TouchableOpacity
                    onPress={() => setIsEditMode(true)}
                className="bg-blue-600 py-3 px-6 rounded-xl items-center flex-row justify-center"
              >
                <Ionicons name="create-outline" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">Edit Profile</Text>
              </TouchableOpacity>

            </View>
              </>
            ) : (
              <View>
                {/* Error Message */}
                {error && (
                  <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Text className="text-red-700 text-sm">{error}</Text>
                  </View>
                )}

                {/* Avatar Upload Section */}
                <View className="items-center mb-6">
                  <View className="relative">
                    {avatarPreview ? (
                      <View className="relative">
                        <Image
                          source={{ uri: avatarPreview }}
                          className="w-48 h-48 rounded-full"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={handleRemoveAvatar}
                          className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full items-center justify-center"
                          disabled={loading}
                        >
                          <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="w-48 h-48 bg-blue-600 rounded-full items-center justify-center">
                        <Text className="text-white text-6xl font-bold">
                          {userProfile?.first_name?.[0] || userProfile?.last_name?.[0] || userProfile?.email?.[0] || 'U'}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={handleAvatarChange}
                      className="absolute bottom-0 right-0 w-12 h-12 bg-blue-600 rounded-full items-center justify-center"
                      disabled={loading}
                    >
                      <Ionicons name="camera" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                  <Text className="mt-2 text-sm text-slate-600 text-center">
                    Tap camera icon to upload a profile picture
                  </Text>
                </View>

                {/* Form Fields */}
                <View className="mb-6">
                  {/* Affiliated Organization */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">Affiliated Organization *</Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                      <TextInput
                        value={formData.affiliated_organization}
                        onChangeText={(value) => handleInputChange('affiliated_organization', value)}
                        placeholder="Enter your affiliated organization"
                        placeholderTextColor="#999"
                        className="flex-1 h-12 text-sm text-slate-800"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Role Display (Read-only) */}
                  {userProfile?.role && (
                    <View>
                      <Text className="text-sm font-medium text-slate-700 mb-2">Role</Text>
                      <View className="px-4 py-3 border border-slate-300 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
                        <Text className="text-slate-700 capitalize">{userProfile.role}</Text>
                      </View>
                      <Text className="mt-1 text-xs text-slate-500">
                        Role cannot be changed. Contact support if you need to update your role.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Change Password Section */}
                <View className="border-t border-slate-200 pt-6 mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-slate-800">Change Password</Text>
                      <Text className="text-sm text-slate-600">Update your password to keep your account secure</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setShowPasswordChange(!showPasswordChange);
                        setPasswordError(null);
                        setPasswordSuccess(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      disabled={loading || changingPassword}
                    >
                      <Text className="text-blue-600 font-medium text-sm">
                        {showPasswordChange ? 'Cancel' : 'Change Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showPasswordChange && (
                    <View className="space-y-4">
                      {/* Password Success Message */}
                      {passwordSuccess && (
                        <View className="p-4 bg-green-50 border border-green-200 rounded-xl">
                          <Text className="text-green-700 text-sm">Password changed successfully!</Text>
                        </View>
                      )}

                      {/* Password Error Message */}
                      {passwordError && (
                        <View className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <Text className="text-red-700 text-sm">{passwordError}</Text>
                        </View>
                      )}

                      {/* Current Password */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-slate-700 mb-2">Current Password *</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                          <TextInput
                            value={passwordData.currentPassword}
                            onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                            placeholder="Enter your current password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            className="flex-1 h-12 text-sm text-slate-800"
                            editable={!changingPassword}
                          />
                        </View>
                      </View>

                      {/* New Password */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-slate-700 mb-2">New Password *</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                          <TextInput
                            value={passwordData.newPassword}
                            onChangeText={(value) => handlePasswordChange('newPassword', value)}
                            placeholder="Enter your new password (min. 6 characters)"
                            placeholderTextColor="#999"
                            secureTextEntry
                            className="flex-1 h-12 text-sm text-slate-800"
                            editable={!changingPassword}
                          />
                        </View>
                      </View>

                      {/* Confirm Password */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-slate-700 mb-2">Confirm New Password *</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                          <TextInput
                            value={passwordData.confirmPassword}
                            onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                            placeholder="Confirm your new password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            className="flex-1 h-12 text-sm text-slate-800"
                            editable={!changingPassword}
                          />
                        </View>
                      </View>

                      {/* Change Password Button */}
                      <TouchableOpacity
                        onPress={handleChangePassword}
                        disabled={changingPassword}
                        className="bg-green-600 py-3 px-6 rounded-xl items-center"
                      >
                        {changingPassword ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-white font-semibold">Change Password</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-blue-600 py-3 px-6 rounded-xl items-center"
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-semibold">Save Changes</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    disabled={loading}
                    className="flex-1 bg-slate-200 py-3 px-6 rounded-xl items-center"
                  >
                    <Text className="text-slate-700 font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
  );
}
