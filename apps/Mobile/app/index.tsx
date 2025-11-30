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
  const lastCheckedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Don't redirect if we're already on registration or setup-profile screens
    const currentRoute = segments[0];
    if (currentRoute === 'registration' || currentRoute === 'setup-profile') {
      return;
    }

    // Don't redirect if we're already on tabs (to prevent redirect loops)
    if (currentRoute === '(tabs)') {
      return;
    }

    // Prevent double check for the same user
    if (user && lastCheckedUserIdRef.current === user.id) {
      return;
    }

    // Hide splash screen and navigate
    SplashScreen.hideAsync().then(() => {
      if (user) {
        // Mark this user as checked
        lastCheckedUserIdRef.current = user.id;
        
        // Check if profile is complete
        const isProfileComplete = Boolean(
          user.first_name?.trim() && 
          user.last_name?.trim() && 
          user.affiliated_organization?.trim()
        );
        
        console.log('Profile check:', {
          first_name: user.first_name,
          last_name: user.last_name,
          affiliated_organization: user.affiliated_organization,
          isProfileComplete
        });
        
        if (isProfileComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/setup-profile');
        }
      } else {
        lastCheckedUserIdRef.current = null;
        router.replace('/login');
      }
    });
  }, [user, isLoading, router, segments]);

  // Return null to keep splash screen visible
  return null;
}

