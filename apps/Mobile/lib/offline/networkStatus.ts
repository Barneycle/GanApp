import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Network Status Monitor
 * Monitors network connectivity and provides reactive updates
 */
export class NetworkStatusMonitor {
  private static listeners: Set<(status: NetworkStatus) => void> = new Set();
  private static currentStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: null,
  };

  /**
   * Initialize network monitoring
   */
  static async initialize(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type,
    };
    this.notifyListeners();
    return this.currentStatus;
  }

  /**
   * Start listening to network changes
   */
  static startListening(): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      this.currentStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      };
      this.notifyListeners();
    });

    return unsubscribe;
  }

  /**
   * Get current network status
   */
  static getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return this.currentStatus.isConnected &&
      (this.currentStatus.isInternetReachable ?? true);
  }

  /**
   * Subscribe to network status changes
   */
  static subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);
    // Immediately call with current status
    callback(this.currentStatus);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }
}

/**
 * React Hook for network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    NetworkStatusMonitor.getStatus()
  );

  useEffect(() => {
    // Initialize and get current status
    NetworkStatusMonitor.initialize().then(setStatus);

    // Subscribe to changes
    const unsubscribe = NetworkStatusMonitor.subscribe(setStatus);

    // Start listening
    const stopListening = NetworkStatusMonitor.startListening();

    return () => {
      unsubscribe();
      stopListening();
    };
  }, []);

  return status;
}
