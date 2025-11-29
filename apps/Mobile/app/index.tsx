import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading indicator while checking auth state - match splash screen background
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#212121' }} className="items-center justify-center">
      <ActivityIndicator size="large" color="#ffffff" />
    </SafeAreaView>
  );
}

