import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/authContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="registration" options={{ title: 'Registration' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms' }} />
        <Stack.Screen name="events" options={{ title: 'Events' }} />
        <Stack.Screen name="survey" options={{ title: 'Survey' }} />
        <Stack.Screen name="certificate" options={{ title: 'Certificate' }} />
        <Stack.Screen name="loadingscreen" options={{ title: 'Loading' }} />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
