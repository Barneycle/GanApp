import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/authContext';
import './global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="registration" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="events" />
          <Stack.Screen name="survey" />
          <Stack.Screen name="certificate" />
          <Stack.Screen name="loadingscreen" />
        </Stack>
        <StatusBar style="dark" backgroundColor="rgba(0,0,0,0.1)" translucent={false} hidden={false} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
