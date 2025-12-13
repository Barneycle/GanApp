import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { showError, showSuccess, showConfirm } from '../../lib/sweetAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { NotificationService, Notification } from '../../lib/notificationService';
import { useAuth } from '../../lib/authContext';
import TutorialOverlay from '../../components/TutorialOverlay';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      // Subscribe to real-time notifications
      const unsubscribe = NotificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
        }
      );
      return unsubscribe;
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await NotificationService.getNotifications(user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setNotifications(result.notifications || []);
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      // Parse the URL and navigate
      const url = notification.action_url;
      if (url.startsWith('/')) {
        router.push(url as any);
      } else if (url.startsWith('ganapp://')) {
        // Handle deep link
        router.push(url.replace('ganapp://', '/') as any);
      }
    }
  };

  const handleSelectAll = () => {
    // Select all notifications
    const allIds = new Set(notifications.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const result = await NotificationService.markAllAsRead(user.id);
      if (result.error) {
        showError('Error', `Failed to mark all as read: ${result.error}`);
      } else {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      showError('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const result = await NotificationService.deleteNotification(notificationId);
      if (result.error) {
        showError('Error', `Failed to delete notification: ${result.error}`);
      } else {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setSelectedNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }
    } catch (err) {
      showError('Error', 'Failed to delete notification');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    showConfirm(
      'Delete Notifications',
      `Are you sure you want to delete ${selectedNotifications.size} notification(s)?`,
      async () => {
        try {
          const deletePromises = Array.from(selectedNotifications).map(id =>
            NotificationService.deleteNotification(id)
          );
          const results = await Promise.all(deletePromises);
          
          const errors = results.filter(r => r.error);
          if (errors.length > 0) {
            showError('Error', `Failed to delete ${errors.length} notification(s)`);
          }
          
          setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
          setSelectedNotifications(new Set());
          setIsSelectionMode(false);
        } catch (err) {
          showError('Error', 'Failed to delete notifications');
        }
      }
    );
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;

    showConfirm(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      async () => {
        try {
          const result = await NotificationService.deleteAllNotifications(user.id);
          if (result.error) {
            showError('Error', `Failed to delete all notifications: ${result.error}`);
          } else {
            setNotifications([]);
            setSelectedNotifications(new Set());
            setIsSelectionMode(false);
            showSuccess('Success', 'All notifications deleted');
          }
        } catch (err) {
          showError('Error', 'Failed to delete all notifications');
        }
      }
    );
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedNotifications(new Set());
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      default:
        return 'information-circle';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 mt-4">Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-white text-lg font-semibold mb-4">Error Loading Notifications</Text>
          <Text className="text-blue-100 text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={loadNotifications}
            className="bg-blue-700 px-6 py-3 rounded-md"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="notifications"
        steps={[
          {
            id: '1',
            title: 'Notifications',
            description: 'Stay updated with event reminders, registration confirmations, survey availability, and certificate notifications.',
          },
        ]}
      />
      {/* Header */}
      {isSelectionMode && (
        <View className="bg-blue-900 px-3 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={toggleSelectionMode}>
              <Text className="text-blue-200 text-base font-medium">Cancel</Text>
            </TouchableOpacity>
            
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-white">
                {selectedNotifications.size > 0 
                  ? `${selectedNotifications.size} selected`
                  : 'Select notifications'}
              </Text>
            </View>
            
            <View className="flex-row items-center gap-2">
              <TouchableOpacity 
                onPress={handleDeleteSelected}
                disabled={selectedNotifications.size === 0}
                className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${
                  selectedNotifications.size > 0 ? 'bg-red-600' : 'bg-gray-500 opacity-50'
                }`}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text className="text-white text-base font-medium">Delete Selected</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSelectAll}
                className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text className="text-white text-base font-medium">Mark All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            paddingTop: 8,
            paddingBottom: 70 + Math.max(insets.bottom, 8) + 20
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={["#ffffff"]}
            />
          }
        >
          {notifications.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center mt-4">
              <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
                <Ionicons name="notifications-outline" size={40} color="#2563eb" />
              </View>
              <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
                No Notifications
              </Text>
              <Text className="text-gray-500 text-center text-sm">
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          ) : (
            <>
              {!isSelectionMode && notifications.some(n => !n.read) && (
                <TouchableOpacity 
                  onPress={handleMarkAllAsRead}
                  className="mb-3 mt-4"
                >
                  <Text className="text-white text-sm font-medium text-right">Mark All as Read</Text>
                </TouchableOpacity>
              )}
              <View className="bg-white rounded-3xl overflow-hidden mt-4">
              {notifications.map((notification, index) => {
                const iconName = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                const isSelected = selectedNotifications.has(notification.id);
                
                return (
                  <TouchableOpacity
                    key={notification.id}
                    onPress={() => {
                      if (isSelectionMode) {
                        toggleSelection(notification.id);
                      } else {
                        handleNotificationPress(notification);
                      }
                    }}
                    onLongPress={() => {
                      if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        toggleSelection(notification.id);
                      }
                    }}
                    className={`p-4 border-b border-gray-100 ${
                      isSelected ? 'bg-blue-100' : !notification.read ? 'bg-blue-50' : 'bg-white'
                    }`}
                    style={{
                      borderBottomWidth: index < notifications.length - 1 ? 1 : 0,
                    }}
                  >
                    <View className="flex-row">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <TouchableOpacity
                          onPress={() => toggleSelection(notification.id)}
                          className="mr-3 justify-center"
                        >
                          <Ionicons 
                            name={isSelected ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={isSelected ? "#2563eb" : "#9ca3af"} 
                          />
                        </TouchableOpacity>
                      )}
                      
                      {/* Icon */}
                      <View 
                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${iconColor}20` }}
                      >
                        <Ionicons name={iconName} size={24} color={iconColor} />
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <View className="flex-row items-start justify-between mb-1">
                          <Text className="text-base font-bold text-gray-800 flex-1">
                            {notification.title}
                          </Text>
                          {!notification.read && !isSelectionMode && (
                            <View className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1" />
                          )}
                        </View>
                        <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                          {notification.message}
                        </Text>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-gray-400">
                            {formatTime(notification.created_at)}
                          </Text>
                          {notification.action_text && !isSelectionMode && (
                            <View className="flex-row items-center">
                              <Text className="text-xs text-blue-600 font-medium mr-1">
                                {notification.action_text}
                              </Text>
                              <Ionicons name="chevron-forward" size={12} color="#2563eb" />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

