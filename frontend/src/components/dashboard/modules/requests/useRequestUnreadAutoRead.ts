import { useEffect } from 'react';

type UseRequestUnreadAutoReadArgs = {
  isLoading: boolean;
  unreadCount: number;
  tab: 'received' | 'sent';
  statusTab: 'pending' | 'active' | 'completed' | 'cancelled';
  markAllRead: () => Promise<void>;
};

export function useRequestUnreadAutoRead({
  isLoading,
  unreadCount,
  tab,
  statusTab,
  markAllRead,
}: UseRequestUnreadAutoReadArgs) {
  useEffect(() => {
    if (isLoading) return;
    if (unreadCount <= 0) return;
    if (tab !== 'received') return;
    if (statusTab !== 'pending') return;

    void markAllRead();
  }, [isLoading, markAllRead, statusTab, tab, unreadCount]);
}
