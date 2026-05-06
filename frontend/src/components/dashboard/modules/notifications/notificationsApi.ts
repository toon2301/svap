import { api, endpoints } from '@/lib/api';

import type { DashboardNotification } from './types';

interface MarkNotificationReadResult {
  id: number;
  is_read: boolean;
  read_at: string | null;
  unread_count?: number;
}

export async function listNotifications(limit = 15): Promise<DashboardNotification[]> {
  const response = await api.get<DashboardNotification[]>(endpoints.notifications.list, {
    params: {
      type: 'all',
      limit,
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post(endpoints.notifications.markAllRead, { type: 'all' });
}

export async function markNotificationRead(
  notificationId: number,
): Promise<MarkNotificationReadResult> {
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    throw new Error('Invalid notification id');
  }

  const response = await api.post<MarkNotificationReadResult>(
    `/auth/notifications/${notificationId}/mark-read/`,
  );
  return response.data;
}
