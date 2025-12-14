/**
 * Offline-First Architecture
 * Main entry point for offline functionality
 */

// Network Status
export { NetworkStatusMonitor, useNetworkStatus } from './networkStatus';
export type { NetworkStatus } from './networkStatus';

// Conflict Resolution
export { ConflictResolutionService, ConflictStrategy, DataType } from './conflictResolution';
export type { ConflictData, ConflictResolution } from './conflictResolution';

// Sync Queue
export { SyncQueueService, SyncPriority, SyncStatus } from './syncQueue';
export type { SyncOperation } from './syncQueue';

// Local Database
export { LocalDatabaseService } from './localDatabase';

// Sync Service
export { SyncService } from './syncService';

/**
 * Initialize offline-first architecture
 * Call this when app starts
 */
export const initializeOfflineFirst = async (): Promise<void> => {
  try {
    // Use dynamic import to avoid circular dependency issues
    const { SyncService } = await import('./syncService');
    await SyncService.initialize();
    console.log('Offline-first architecture initialized');
  } catch (error) {
    console.error('Error initializing offline-first architecture:', error);
    throw error;
  }
};
