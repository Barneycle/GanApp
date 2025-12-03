import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../lib/authContext';

interface GlobalNavbarProps {
  onAvatarPress?: () => void;
}

export default function GlobalNavbar({ onAvatarPress }: GlobalNavbarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't show navbar if no user
  if (!user) {
    return null;
  }

  // Only show navbar on major tab screens: index, my-events, events, albums, notifications
  // Hide on profile and qrscanner
  const hideNavbarScreens = ['/(tabs)/profile', '/(tabs)/qrscanner'];
  
  // Hide navbar on specific screens
  if (pathname && hideNavbarScreens.includes(pathname)) {
    return null;
  }

  // Show navbar on all tab screens except the ones we hide
  // If pathname doesn't exist or is empty, show it (will be filtered by tab screens)

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  // Get avatar or initials
  const getAvatarContent = () => {
    if (user.avatar_url) {
      return (
        <Image
          source={{ uri: user.avatar_url }}
          className="w-10 h-10 rounded-full"
          resizeMode="cover"
        />
      );
    } else {
      const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
      return (
        <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center">
          <Text className="text-white text-sm font-bold">{initials}</Text>
        </View>
      );
    }
  };

  return (
    <View
      className="bg-blue-900 flex-row items-center justify-between px-4"
      style={{
        paddingTop: insets.top,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        position: 'relative',
      }}
    >
      {/* Left: GanApp Title */}
      <View className="flex-row items-center">
        <Text className="text-white text-xl font-bold">GanApp</Text>
      </View>

      {/* Right: User Avatar */}
      <TouchableOpacity
        onPress={handleAvatarPress}
        className="items-center justify-center"
      >
        {getAvatarContent()}
      </TouchableOpacity>
    </View>
  );
}

