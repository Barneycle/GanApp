import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../lib/authContext';
import { ToastProvider } from '../components/Toast';
import { SweetAlertProvider, SweetAlertRef } from '../components/SweetAlertProvider';
import { setSweetAlertRef } from '../lib/sweetAlert';
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
  const sweetAlertRef = useRef<SweetAlertRef>(null);

  useEffect(() => {
    console.log('RootLayout: Setting sweetAlertRef', { hasRef: !!sweetAlertRef, hasCurrent: !!sweetAlertRef.current });
    setSweetAlertRef(sweetAlertRef);
    // Also check after a delay to see if ref.current is set
    setTimeout(() => {
      console.log('RootLayout: Ref check after delay', { hasRef: !!sweetAlertRef, hasCurrent: !!sweetAlertRef.current });
    }, 1000);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <SweetAlertProvider ref={sweetAlertRef}>
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
                <Stack.Screen
                  name="support"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
              <StatusBar style="light" />
            </AuthProvider>
          </SweetAlertProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
