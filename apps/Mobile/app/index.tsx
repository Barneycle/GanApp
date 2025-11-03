import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';
import { LoadingScreen } from './loadingscreen';

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

  // Show loading screen while checking auth state
  return <LoadingScreen onComplete={() => {}} />;
}

