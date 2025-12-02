import React, { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../lib/authContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    // Don't redirect if we're already on registration, setup-profile, reset-password, or tabs
    const currentRoute = segments[0];
    if (currentRoute === 'registration' || currentRoute === 'setup-profile' || currentRoute === 'reset-password' || currentRoute === '(tabs)') {
      return;
    }

    // Prevent multiple navigations
    if (hasNavigatedRef.current) {
      return;
    }

    // Hide splash screen and navigate
    SplashScreen.hideAsync().then(() => {
      hasNavigatedRef.current = true;
      
      if (user) {
        // Facebook's approach: Always send authenticated users to setup-profile
        // Setup-profile will check if already complete and redirect to tabs if needed
        router.replace('/setup-profile');
      } else {
        router.replace('/login');
      }
    });
  }, [user, isLoading, router, segments]);

  // Return null to keep splash screen visible
  return null;
}
