import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/authContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Check if user is a participant
  const isParticipant = user?.role === 'participant';
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#bfdbfe',
        tabBarStyle: {
          backgroundColor: '#1e3a8a',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 70 + Math.max(insets.bottom, 8),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      {/* Show My Events for participants */}
      <Tabs.Screen
        name="my-events"
        options={{
          title: 'My Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          href: isParticipant ? '/(tabs)/my-events' : null,
        }}
      />
      {/* Show QR Scanner for organizers/admins */}
      <Tabs.Screen
        name="qrscanner"
        options={{
          title: 'QR Scanner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
          href: !isParticipant ? '/(tabs)/qrscanner' : null,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}