import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../lib/offline/networkStatus';
import { SyncQueueService, SyncOperation } from '../lib/offline/syncQueue';

interface OfflineIndicatorProps {
  onPress?: () => void;
}

/**
 * Offline Indicator Component
 * Shows offline status and pending sync operations count
 */
export function OfflineIndicator({ onPress }: OfflineIndicatorProps) {
  const networkStatus = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const [queueCount, setQueueCount] = useState(0);
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([]);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = SyncQueueService.subscribe((queue) => {
      const pending = queue.filter(
        (op) => op.status === 'pending' || op.status === 'failed'
      );
      setQueueCount(pending.length);
      setPendingOperations(pending);
    });

    // Get initial count
    setQueueCount(SyncQueueService.getQueueCount());

    return unsubscribe;
  }, []);

  const isOnline = networkStatus.isConnected &&
    (networkStatus.isInternetReachable ?? true);

  // Don't show if online and no pending operations
  if (isOnline && queueCount === 0) {
    return null;
  }

  // Calculate position above tab bar (tab bar height is 70 + safe area bottom)
  const tabBarHeight = 70 + Math.max(insets.bottom, 8);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !isOnline && styles.offlineContainer,
        queueCount > 0 && styles.pendingContainer,
        { bottom: tabBarHeight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.dot,
              !isOnline ? styles.dotOffline : styles.dotOnline,
            ]}
          />
        </View>
        <Text style={styles.text}>
          {!isOnline
            ? 'Offline – changes will sync later'
            : queueCount > 0
              ? `${queueCount} change${queueCount !== 1 ? 's' : ''} pending sync`
              : 'Syncing...'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Above content but below modals
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  offlineContainer: {
    backgroundColor: '#fff3cd',
    borderBottomColor: '#ffc107',
  },
  pendingContainer: {
    backgroundColor: '#d1ecf1',
    borderBottomColor: '#17a2b8',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#28a745',
  },
  dotOffline: {
    backgroundColor: '#dc3545',
  },
  text: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
});
