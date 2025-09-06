import React, { useEffect } from 'react';
import { View, Text, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';

export default function LoadingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Navigate based on authentication status
      if (user) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, user]);

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-blue-600 to-blue-800">
      <View className="flex-1 justify-center items-center px-6">
        {/* Logo */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-4">
            <Text className="text-blue-600 font-bold text-2xl">GA</Text>
          </View>
          <Text className="text-white text-3xl font-bold">GanApp</Text>
          <Text className="text-blue-100 text-lg">Event Management</Text>
        </View>

        {/* Loading Animation */}
        <View className="items-center mb-8">
          <View className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4"></View>
          <Text className="text-white text-lg">Loading...</Text>
        </View>

        {/* App Description */}
        <View className="items-center">
          <Text className="text-blue-100 text-center text-sm">
            Manage your events and surveys with ease
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
