import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConflictResolutionService, DataType } from './conflictResolution';

export enum SyncPriority {
  CRITICAL = 1, // Attendance, check-ins
  HIGH = 2, // Event registrations, evaluations
  MEDIUM = 3, // Event metadata updates
  LOW = 4, // Images, certificates (can be cached)
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

export interface SyncOperation {
  id: string;
  dataType: DataType;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  priority: SyncPriority;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  conflictData?: {
    local: any;
    server: any;
  };
}

const SYNC_QUEUE_KEY = '@sync_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Sync Queue Service
 * Manages offline operations queue with priority ordering
 */
export class SyncQueueService {
  private static queue: SyncOperation[] = [];
  private static isProcessing = false;
  private static listeners: Set<(queue: SyncOperation[]) => void> = new Set();

  /**
   * Initialize sync queue from storage
   */
  static async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error initializing sync queue:', error);
      this.queue = [];
    }
  }

  /**
   * Add operation to sync queue
   */
  static async enqueue(
    dataType: DataType,
    operation: 'create' | 'update' | 'delete',
    table: string,
    data: any,
    priority: SyncPriority = SyncPriority.MEDIUM
  ): Promise<string> {
    const syncOp: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataType,
      operation,
      table,
      data,
      priority,
      status: SyncStatus.PENDING,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.queue.push(syncOp);
    this.queue.sort((a, b) => a.priority - b.priority); // Sort by priority

    await this.persistQueue();
    this.notifyListeners();

    return syncOp.id;
  }

  /**
   * Get all pending operations
   */
  static getPendingOperations(): SyncOperation[] {
    return this.queue.filter((op) => op.status === SyncStatus.PENDING);
  }

  /**
   * Get operations by status
   */
  static getOperationsByStatus(status: SyncStatus): SyncOperation[] {
    return this.queue.filter((op) => op.status === status);
  }

  /**
   * Get queue count
   */
  static getQueueCount(): number {
    return this.queue.filter(
      (op) => op.status === SyncStatus.PENDING || op.status === SyncStatus.FAILED
    ).length;
  }

  /**
   * Get all operations (for display)
   */
  static getAllOperations(): SyncOperation[] {
    return [...this.queue];
  }

  /**
   * Update operation status
   */
  static async updateOperationStatus(
    id: string,
    status: SyncStatus,
    error?: string,
    conflictData?: { local: any; server: any }
  ): Promise<void> {
    const operation = this.queue.find((op) => op.id === id);
    if (operation) {
      operation.status = status;
      operation.updatedAt = new Date().toISOString();
      if (error) {
        operation.error = error;
      }
      if (conflictData) {
        operation.conflictData = conflictData;
        operation.status = SyncStatus.CONFLICT;
      }
      if (status === SyncStatus.FAILED) {
        operation.retryCount++;
      }

      await this.persistQueue();
      this.notifyListeners();
    }
  }

  /**
   * Remove completed operation
   */
  static async removeOperation(id: string): Promise<void> {
    this.queue = this.queue.filter((op) => op.id !== id);
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Clear completed operations
   */
  static async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter(
      (op) => op.status !== SyncStatus.COMPLETED
    );
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Retry failed operations
   */
  static async retryFailedOperations(): Promise<void> {
    const failed = this.queue.filter(
      (op) => op.status === SyncStatus.FAILED && op.retryCount < op.maxRetries
    );

    for (const op of failed) {
      op.status = SyncStatus.PENDING;
      op.updatedAt = new Date().toISOString();
    }

    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes
   */
  static subscribe(callback: (queue: SyncOperation[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.queue]);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Process sync queue (called by sync service)
   */
  static async processNext(): Promise<SyncOperation | null> {
    if (this.isProcessing) {
      return null;
    }

    const pending = this.getPendingOperations();
    if (pending.length === 0) {
      return null;
    }

    // Get highest priority operation
    const nextOp = pending[0];
    this.isProcessing = true;

    try {
      await this.updateOperationStatus(nextOp.id, SyncStatus.IN_PROGRESS);
    } catch (error) {
      this.isProcessing = false;
    }

    return nextOp;
  }

  /**
   * Mark processing as complete
   */
  static markProcessingComplete(): void {
    this.isProcessing = false;
  }

  /**
   * Persist queue to storage
   */
  private static async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error persisting sync queue:', error);
    }
  }

  /**
   * Notify listeners of queue changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.queue]);
      } catch (error) {
        console.error('Error in sync queue listener:', error);
      }
    });
  }
}
