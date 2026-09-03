import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Animated, Dimensions } from 'react-native';
import { showConfirm } from '../lib/sweetAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';
import { Ionicons } from '@expo/vector-icons';
import HelpCenter from './HelpCenter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.5; // 50% of screen width

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const [isHelpCenterVisible, setIsHelpCenterVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 250);
  };

  const handleSignOut = async () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        onClose();
        setTimeout(async () => {
          await signOut();
        }, 250);
      }
    );
  };

  // Get avatar or initials
  const getAvatarContent = () => {
    if (user?.avatar_url) {
      return (
        <Image
          source={{ uri: user.avatar_url }}
          className="w-16 h-16 rounded-full"
          resizeMode="cover"
        />
      );
    } else {
      const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
      return (
        <View className="w-16 h-16 bg-blue-600 rounded-full items-center justify-center">
          <Text className="text-white text-xl font-bold">{initials}</Text>
        </View>
      );
    }
  };

  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
  const displayName = fullName || user?.email || 'User';

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      {/* Sidebar */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: '#1e3a8a', // Navy blue
          zIndex: 1000,
          transform: [{ translateX: slideAnim }],
          shadowColor: '#000',
          shadowOffset: { width: -2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 20 }}>
          {/* User Profile Section */}
          <View className="px-6 pb-6 border-b border-white/20">
            <View className="items-center mb-4">
              {getAvatarContent()}
              <View className="mt-4 items-center">
                <Text className="text-lg font-bold text-white text-center" numberOfLines={1}>
                  {displayName}
                </Text>
                {user?.email && (
                  <Text className="text-sm text-blue-200 mt-1 text-center" numberOfLines={1}>
                    {user.email}
                  </Text>
                )}
                {user?.affiliated_organization && (
                  <Text className="text-xs text-blue-300 mt-1 text-center" numberOfLines={1}>
                    {user.affiliated_organization}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleNavigate('/(tabs)/profile')}
              className="bg-blue-600 py-3 px-4 rounded-lg flex-row items-center justify-center"
            >
              <Ionicons name="person" size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">View Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer to push buttons to bottom */}
          <View style={{ flex: 1 }} />

          {/* Menu Items */}
          <View className="pb-6">
            <TouchableOpacity
              onPress={() => {
                onClose();
                setTimeout(() => {
                  router.push('/terms');
                }, 250);
              }}
              className="flex-row items-center py-4 px-6 active:bg-white/10"
            >
              <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
              <Text className="text-white text-lg ml-3 font-medium">Terms & Conditions</Text>
            </TouchableOpacity>
            <View className="border-b border-white/20" />

            <TouchableOpacity
              onPress={() => {
                onClose();
                setTimeout(() => {
                  router.push('/terms?type=privacy');
                }, 250);
              }}
              className="flex-row items-center py-4 px-6 active:bg-white/10"
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
              <Text className="text-white text-lg ml-3 font-medium">Privacy Policy</Text>
            </TouchableOpacity>
            <View className="border-b border-white/20" />

            <TouchableOpacity
              onPress={() => {
                setIsHelpCenterVisible(true);
              }}
              className="flex-row items-center py-4 px-6 active:bg-white/10"
            >
              <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
              <Text className="text-white text-lg ml-3 font-medium">Help Center</Text>
            </TouchableOpacity>
            <View className="border-b border-white/20" />

            <TouchableOpacity
              onPress={() => {
                onClose();
                setTimeout(() => {
                  router.push('/support' as any);
                }, 250);
              }}
              className="flex-row items-center py-4 px-6 active:bg-white/10"
            >
              <Ionicons name="chatbubbles-outline" size={22} color="#FFFFFF" />
              <Text className="text-white text-lg ml-3 font-medium">Support</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <View className="px-6 pb-6" style={{ paddingBottom: insets.bottom + 20 }}>
            <TouchableOpacity
              onPress={handleSignOut}
              className="bg-red-600 py-4 px-6 rounded-lg flex-row items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2 text-base">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      <HelpCenter
        visible={isHelpCenterVisible}
        onClose={() => setIsHelpCenterVisible(false)}
      />
    </>
  );
}

