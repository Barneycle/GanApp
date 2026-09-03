import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAuth } from '../../lib/authContext';
import { useNotifications } from '../../lib/useNotifications';
import GlobalNavbar from '../../components/GlobalNavbar';
import Sidebar from '../../components/Sidebar';
import { OfflineIndicator } from '../../components/OfflineIndicator';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if user is a participant
  const isParticipant = user?.role === 'participant';
  // Check if user is an organizer
  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  return (
    <View style={{ flex: 1 }}>
      <GlobalNavbar onAvatarPress={() => setIsSidebarOpen(true)} />
      <Sidebar visible={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <View style={{ flex: 1 }}>
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
              zIndex: 999, // Below offline indicator
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
          {/* Show My Certificates for participants */}
          <Tabs.Screen
            name="my-certificates"
            options={{
              title: 'Certificates',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="document-text-outline" size={size} color={color} />
              ),
              href: isParticipant ? '/(tabs)/my-certificates' : null,
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
              href: !isOrganizer ? '/(tabs)/events' : null,
            }}
          />
          {/* Show Albums for all users */}
          <Tabs.Screen
            name="albums"
            options={{
              title: 'Albums',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="images" size={size} color={color} />
              ),
            }}
          />
          {/* Show Notifications for all users */}
          <Tabs.Screen
            name="notifications"
            options={{
              title: 'Notifications',
              tabBarIcon: ({ color, size }) => (
                <View>
                  <Ionicons name="notifications" size={size} color={color} />
                  {unreadCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -6,
                        top: -2,
                        backgroundColor: '#ef4444',
                        borderRadius: 10,
                        minWidth: 18,
                        height: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              href: null, // Hide from tab bar
            }}
          />
        </Tabs>
      </View>
      {/* Offline indicator - positioned above tab bar */}
      <OfflineIndicator />
    </View>
  );
}