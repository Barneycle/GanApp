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

  // Helper function to check if user profile is complete
  const isProfileComplete = (user: any): boolean => {
    if (!user) return false;
    
    const firstName = user.first_name;
    const lastName = user.last_name;
    const affiliatedOrg = user.affiliated_organization;
    
    const hasFirstName = firstName !== undefined && firstName !== null && String(firstName).trim() !== '';
    const hasLastName = lastName !== undefined && lastName !== null && String(lastName).trim() !== '';
    const hasAffiliatedOrg = affiliatedOrg !== undefined && affiliatedOrg !== null && String(affiliatedOrg).trim() !== '';
    
    return hasFirstName && hasLastName && hasAffiliatedOrg;
  };

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
        // Check if profile is complete before redirecting
        if (isProfileComplete(user)) {
          // Profile is complete, go directly to tabs
          router.replace('/(tabs)');
        } else {
          // Profile is incomplete, go to setup-profile
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
