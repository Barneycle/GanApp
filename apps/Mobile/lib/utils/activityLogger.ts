import { ActivityLogService } from '../services/activityLogService';

/**
 * Utility function to log activities easily
 * This can be called from anywhere in the app to log user actions
 */
export const logActivity = async (
  userId: string,
  action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | string,
  resourceType: 'event' | 'survey' | 'user' | 'registration' | string,
  options?: {
    resourceId?: string;
    resourceName?: string;
    details?: any;
  }
) => {
  try {
    // Get client IP if available (for mobile, we can't get real IP without backend)
    const ipAddress: string | undefined = undefined;
    
    // Get user agent from React Native
    let userAgent: string | undefined = undefined;
    try {
      const { Platform } = require('react-native');
      userAgent = Platform.OS === 'ios' ? 'iOS' : 'Android';
    } catch (e) {
      // Platform not available
    }
    
    await ActivityLogService.logActivity(userId, action, resourceType, {
      resourceId: options?.resourceId,
      resourceName: options?.resourceName,
      details: options?.details,
      ipAddress: ipAddress,
      userAgent: userAgent
    });
  } catch (error) {
    // Silently fail - don't break the main flow if logging fails
    console.error('Failed to log activity:', error);
  }
};

/**
 * Helper to create activity log details from before/after states
 */
export const createActivityDetails = (before?: any, after?: any, changes?: string[]) => {
  const details: any = {};
  
  if (before) {
    details.before = before;
  }
  
  if (after) {
    details.after = after;
  }
  
  if (changes && changes.length > 0) {
    details.changes = changes;
  }
  
  return details;
};

