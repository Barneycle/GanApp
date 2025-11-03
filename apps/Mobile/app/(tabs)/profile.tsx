import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  created_at?: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to get user profile from RPC function
      const { data: profileData, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: user.id });
      
      if (!rpcError && profileData) {
        // Parse the JSON response if it's a string
        const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        setUserProfile(profile);
      } else {
        // Fall back to auth metadata
        setUserProfile({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: '',
          avatar_url: '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fall back to auth metadata
      setUserProfile({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: '',
        avatar_url: '',
      });
    } finally {
      setIsLoading(false);
    }
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
                onPress={() => router.push('/registration')}
                className="bg-blue-600 py-3 px-6 rounded-xl items-center flex-row justify-center"
              >
                <Ionicons name="create-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">Update Profile</Text>
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
