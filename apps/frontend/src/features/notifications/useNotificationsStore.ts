import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppNotification, PortalTab } from '@/types';
import { INITIAL_NOTIFICATIONS } from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';
import {
  clearUserNotificationsApi,
  createUserNotificationApi,
  fetchUserNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/features/notifications/notificationApiClient';

export function useNotificationsStore(isAuthenticated: boolean) {
  const isGuestUser = !isAuthenticated;
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStoredData('NOTIFICATIONS', INITIAL_NOTIFICATIONS)
  );

  useEffect(() => {
    saveStoredData('NOTIFICATIONS', notifications);
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetchUserNotificationsApi().then((serverNotifs) => {
      if (!active || !serverNotifs || serverNotifs.length === 0) return;
      setNotifications(serverNotifs);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const visibleNotifications = useMemo(() => {
    if (!isGuestUser) return notifications;
    return notifications.filter((n) => n.type === 'system').slice(0, 3);
  }, [notifications, isGuestUser]);

  const unreadNotificationsCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );

  const addNotification = useCallback(
    (
      type: AppNotification['type'],
      title: string,
      message: string,
      actionTab?: PortalTab,
      avatar?: string
    ) => {
      if (isGuestUser && type !== 'system') {
        return;
      }
      const optimisticId = `notif_${Date.now()}`;
      const newNotif: AppNotification = {
        id: optimisticId,
        type,
        title,
        message,
        timestamp: 'Just now',
        read: false,
        actionTab,
        avatar,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      if (!isGuestUser) {
        void createUserNotificationApi({ type, title, message, actionTab, avatar }).then(
          (saved) => {
            if (saved && saved.id) {
              setNotifications((prev) =>
                prev.map((item) => (item.id === optimisticId ? saved : item))
              );
            }
          }
        );
      }
    },
    [isGuestUser]
  );

  const handleMarkNotificationAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (!isGuestUser) {
        void markNotificationReadApi(id);
      }
    },
    [isGuestUser]
  );

  const handleMarkAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isGuestUser) {
      void markAllNotificationsReadApi();
    }
  }, [isGuestUser]);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
    if (!isGuestUser) {
      void clearUserNotificationsApi();
    }
  }, [isGuestUser]);

  return {
    notifications,
    visibleNotifications,
    unreadNotificationsCount,
    addNotification,
    handleMarkNotificationAsRead,
    handleMarkAllNotificationsAsRead,
    handleClearAllNotifications,
  };
}
