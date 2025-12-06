import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../lib/authContext';
import './global.css';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function NotificationHandler() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Handle notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.actionUrl) {
          // Navigate to the action URL
          router.push(data.actionUrl as any);
        } else {
          // Default to notifications tab
          router.push('/(tabs)/notifications' as any);
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationHandler />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* Initial auth routing screen */}
            <Stack.Screen 
              name="index" 
              options={{ headerShown: false }}
            />
            
            {/* Main app with tabs - handles authentication internally */}
            <Stack.Screen 
              name="(tabs)" 
              options={{ headerShown: false }}
            />
            
            {/* Login screen */}
            <Stack.Screen 
              name="login" 
              options={{ headerShown: false }}
            />
            
            {/* Auth flow screens - these will be stack screens */}
            <Stack.Screen
              name="registration"
              options={{
                title: 'Registration',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="setup-profile"
              options={{
                title: 'Setup Profile',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="survey"
              options={{
                title: 'Survey',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="evaluation"
              options={{
                title: 'Evaluation',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="terms"
              options={{
                title: 'Terms & Conditions',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="event-details"
              options={{
                title: 'Event Details',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="participant-details"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="reset-password"
              options={{
                title: 'Reset Password',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </Stack>
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
