import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../lib/authContext';
import './global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
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
              name="certificate"
              options={{
                title: 'Certificate',
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
          </Stack>
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
