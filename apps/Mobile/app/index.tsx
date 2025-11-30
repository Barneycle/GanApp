import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../lib/authContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Don't redirect if we're already on registration or setup-profile screens
    const currentRoute = segments[0];
    if (currentRoute === 'registration' || currentRoute === 'setup-profile') {
      return;
    }

    // Hide splash screen and navigate
    SplashScreen.hideAsync().then(() => {
      if (user) {
        // Check if profile is complete
        const isProfileComplete = 
          user.first_name?.trim() && 
          user.last_name?.trim() && 
          user.affiliated_organization?.trim();
        
        if (isProfileComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/setup-profile');
        }
      } else {
        router.replace('/login');
      }
    });
  }, [user, isLoading, router, segments]);

  // Return null to keep splash screen visible
  return null;
}

