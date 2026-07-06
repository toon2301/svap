import { api, endpoints } from '@/lib/api';

import type { DashboardNotification } from './types';

interface MarkNotificationReadResult {
  id: number;
  is_read: boolean;
  read_at: string | null;
  unread_count?: number;
}

export interface NotificationsPage {
  results: DashboardNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface NotificationsPageApiPayload {
  results?: DashboardNotification[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

// Spätne kompatibilné (bez ?page vracia backend ploché pole).
export async function listNotifications(limit = 15): Promise<DashboardNotification[]> {
  const response = await api.get<DashboardNotification[]>(endpoints.notifications.list, {
    params: {
      type: 'all',
      limit,
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

// Stránkovaná verzia (opt-in cez ?page) – umožňuje "Zobraziť ďalšie".
export async function listNotificationsPage(
  page = 1,
  pageSize = 15,
): Promise<NotificationsPage> {
  const response = await api.get<NotificationsPageApiPayload>(endpoints.notifications.list, {
    params: {
      type: 'all',
      page,
      page_size: pageSize,
    },
  });
  const data = response.data ?? {};
  return {
    results: Array.isArray(data.results) ? data.results : [],
    total: typeof data.total === 'number' ? data.total : 0,
    page: typeof data.page === 'number' ? data.page : page,
    pageSize: typeof data.page_size === 'number' ? data.page_size : pageSize,
    totalPages: typeof data.total_pages === 'number' ? data.total_pages : 0,
  };
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
