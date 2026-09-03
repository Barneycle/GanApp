import { ActivityLogService } from '../services/activityLogService';
import { LoggerService } from '../services/loggerService';

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
    // Get client IP if available (for server-side, this would come from request headers)
    const ipAddress = null; // In browser, we can't get real IP without backend
    
    await ActivityLogService.logActivity(userId, action, resourceType, {
      resourceId: options?.resourceId,
      resourceName: options?.resourceName,
      details: options?.details,
      ipAddress: ipAddress,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    });
  } catch (error) {
    // Silently fail - don't break the main flow if logging fails
    LoggerService.serviceError('ActivityLogger', 'Failed to log activity', error);
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

