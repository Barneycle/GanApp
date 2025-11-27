import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { UserService } from '../../lib/userService';

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
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    affiliated_organization: ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailConfirmationMessage, setEmailConfirmationMessage] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  // Sync form data with userProfile when it changes (only when not in edit mode)
  useEffect(() => {
    if (userProfile && !isEditMode) {
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
        affiliated_organization: userProfile.affiliated_organization || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
    }
  }, [userProfile, isEditMode]);

  // When entering edit mode, populate form with current userProfile data
  useEffect(() => {
    if (isEditMode && userProfile) {
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
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
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload an avatar.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Image size must be less than 5MB');
          return;
        }

        setAvatarUri(asset.uri);
        setAvatarPreview(asset.uri);
        if (error) setError(null);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUri(null);
    setAvatarPreview(null);
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
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let avatarUrl = userProfile?.avatar_url || '';

      // Upload avatar if a new file was selected
      if (avatarUri) {
        const uploadResult = await UserService.uploadAvatar(user.id, avatarUri);
        if (uploadResult.error) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }
        avatarUrl = uploadResult.url || '';
      }

      // Prepare update data
      const updateData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        affiliated_organization: formData.affiliated_organization.trim(),
        originalEmail: userProfile?.email || user.email
      };

      // Add avatar URL if changed or removed
      if (avatarUri) {
        // New avatar uploaded
        updateData.avatar_url = avatarUrl;
      } else if (!avatarPreview && userProfile?.avatar_url) {
        // Avatar was removed
        updateData.avatar_url = '';
      }

      // Add email if changed
      if (formData.email.trim() !== (userProfile?.email || user.email)) {
        updateData.email = formData.email.trim();
      }

      const result = await UserService.updateProfile(user.id, updateData);

      if (result.error) {
        setError(result.error);
      } else {
        if (result.needsEmailConfirmation) {
          setSuccess(true);
          setError(null);
          setEmailConfirmationMessage(true);
          // Reload after showing message
          setTimeout(async () => {
            await refreshUser();
            await loadUserProfile();
            setIsEditMode(false);
          }, 3000);
        } else {
          setSuccess(true);
          // Refresh user data
          setTimeout(async () => {
            await refreshUser();
            await loadUserProfile();
            setIsEditMode(false);
          }, 1500);
        }
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
    setEmailConfirmationMessage(false);
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
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
        affiliated_organization: userProfile.affiliated_organization || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
    }
    setAvatarUri(null);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              // Navigate back to login screen
              router.replace('/login');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          flexGrow: 1,
          padding: 16,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16)
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-slate-800 mb-2">Profile</Text>
            <Text className="text-slate-600">Manage your account</Text>
          </View>

          {/* Profile Card */}
          <View className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-6">
            {!isEditMode ? (
              <>
            <View className="items-center mb-6">
              {/* Avatar */}
              {userProfile?.avatar_url ? (
                <View className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-gray-200">
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View className="w-24 h-24 bg-blue-600 rounded-full items-center justify-center mx-auto mb-4">
                  <Ionicons name="person" size={50} color="white" />
                </View>
              )}
              
              <Text className="text-2xl font-bold text-slate-800 mb-1">
                {userProfile?.first_name} {userProfile?.last_name}
              </Text>
              <Text className="text-slate-600 mb-2 capitalize">{userProfile?.role}</Text>
              <Text className="text-slate-500 text-sm">{userProfile?.email}</Text>
            </View>

            {/* Profile Information */}
            <View className="border-t border-slate-200 pt-6 mb-6">
              <Text className="text-lg font-semibold text-slate-800 mb-4">Account Information</Text>
              
              <View className="space-y-3">
                    {/* Affiliated Organization */}
                    {userProfile?.affiliated_organization && (
                      <View className="flex-row items-center">
                        <Ionicons name="business-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                        <Text className="text-slate-700 flex-1">{userProfile.affiliated_organization}</Text>
                      </View>
                    )}
                    
                {/* Phone */}
                {userProfile?.phone && (
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={20} color="#64748b" style={{ marginRight: 12 }} />
                    <Text className="text-slate-700 flex-1">{userProfile.phone}</Text>
                  </View>
                )}
                
                {/* Member Since */}
                {userProfile?.created_at && (
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={20} color="#64748b" style={{ marginRight: 12 }} />
                    <Text className="text-slate-700 flex-1">
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

              <TouchableOpacity
                onPress={() => router.push('/terms')}
                className="bg-slate-600 py-3 px-6 rounded-xl items-center flex-row justify-center"
              >
                <Ionicons name="document-text-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">Terms & Conditions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignOut}
                className="bg-red-600 py-3 px-6 rounded-xl items-center flex-row justify-center"
              >
                <Ionicons name="log-out-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">Sign Out</Text>
              </TouchableOpacity>
            </View>
              </>
            ) : (
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
              >
                {/* Success Message */}
                {success && !emailConfirmationMessage && (
                  <View className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <Text className="text-green-700 text-sm">Profile updated successfully!</Text>
                  </View>
                )}

                {/* Email Confirmation Message */}
                {emailConfirmationMessage && (
                  <View className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <Text className="text-blue-700 text-sm font-semibold mb-1">Profile updated successfully!</Text>
                    <Text className="text-blue-700 text-sm">
                      Please check your new email address ({formData.email}) to confirm the email change.
                    </Text>
                  </View>
                )}

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
                          className="w-32 h-32 rounded-full"
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
                      <View className="w-32 h-32 bg-blue-600 rounded-full items-center justify-center">
                        <Text className="text-white text-4xl font-bold">
                          {formData.first_name?.[0] || formData.email?.[0] || 'U'}
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
                  {/* First Name */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">First Name *</Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                      <TextInput
                        value={formData.first_name}
                        onChangeText={(value) => handleInputChange('first_name', value)}
                        placeholder="Enter your first name"
                        placeholderTextColor="#999"
                        className="flex-1 h-12 text-sm text-slate-800"
                        editable={!loading}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Last Name */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">Last Name *</Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                      <TextInput
                        value={formData.last_name}
                        onChangeText={(value) => handleInputChange('last_name', value)}
                        placeholder="Enter your last name"
                        placeholderTextColor="#999"
                        className="flex-1 h-12 text-sm text-slate-800"
                        editable={!loading}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-slate-700 mb-2">Email *</Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-4 bg-white">
                      <TextInput
                        value={formData.email}
                        onChangeText={(value) => handleInputChange('email', value)}
                        placeholder="Enter your email address"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="flex-1 h-12 text-sm text-slate-800"
                        editable={!loading}
                      />
                    </View>
                  </View>

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
                      <View className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50">
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
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
