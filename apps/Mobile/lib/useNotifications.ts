import { useState, useEffect } from 'react';
import { NotificationService } from './notificationService';
import { useAuth } from './authContext';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    loadUnreadCount();

    // Subscribe to real-time notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.id,
      () => {
        // Reload count when new notification arrives
        loadUnreadCount();
      }
    );

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const result = await NotificationService.getUnreadCount(user.id);
      if (!result.error && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
    } finally {
      setLoading(false);
    }
  };

  return { unreadCount, loading, refresh: loadUnreadCount };
}

