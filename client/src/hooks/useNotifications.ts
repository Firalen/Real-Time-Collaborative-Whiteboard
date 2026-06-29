import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { Notification } from '../types/saas';

export function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [items, countRes] = await Promise.all([
      api.getNotifications(token),
      api.getUnreadCount(token),
    ]);
    setNotifications(items);
    setUnreadCount(countRes.count);
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = async (id: string) => {
    if (!token) return;
    await api.markNotificationRead(token, id);
    await refresh();
  };

  const markAllRead = async () => {
    if (!token) return;
    await api.markAllNotificationsRead(token);
    await refresh();
  };

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
