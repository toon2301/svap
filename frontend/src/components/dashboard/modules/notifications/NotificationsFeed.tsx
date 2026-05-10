'use client';

import { BellIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';

import NotificationItem from './NotificationItem';
import { useNotificationsFeed } from './useNotificationsFeed';

interface NotificationsFeedProps {
  variant?: 'page' | 'panel';
  onNavigate?: (targetUrl: string) => void;
}

export default function NotificationsFeed({
  variant = 'page',
  onNavigate,
}: NotificationsFeedProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const {
    items,
    loading,
    refreshing,
    markingRead,
    error,
    refresh,
    markAllRead,
    markItemRead,
  } = useNotificationsFeed();
  const hasUnread = items.some((item) => !item.is_read);
  const isPanel = variant === 'panel';

  return (
    <section
      className={
        isPanel
          ? 'h-full w-full overflow-y-auto px-5 py-8 elegant-scrollbar'
          : 'mx-auto w-full max-w-3xl'
      }
    >
      {isMobile && !isPanel ? (
        <div className="mx-3 mt-4 mb-1">
          <button
            type="button"
            onClick={() => {
              if (hasUnread) void markAllRead();
            }}
            disabled={!hasUnread || markingRead}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:bg-white disabled:hover:text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-purple-200 dark:disabled:hover:bg-black dark:disabled:hover:text-gray-400"
          >
            {t('notifications.markAllRead', 'Označiť ako prečítané')}
          </button>
        </div>
      ) : null}
      <div className={isPanel ? 'mb-5 space-y-3' : 'mb-5 px-4 lg:px-0'}>
        <div>
          {!isMobile || isPanel ? (
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('notifications.feedTitle', 'Upozornenia')}
            </h1>
          ) : null}
          {!isPanel && !isMobile ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'notifications.feedDescription',
                'Najnovšie udalosti a pozvánky, ktoré si vyžadujú vašu pozornosť.',
              )}
            </p>
          ) : null}
        </div>
        {!isMobile || isPanel ? (
          <div className="mt-1 w-full">
            <button
              type="button"
              onClick={() => {
                if (hasUnread) void markAllRead();
              }}
              disabled={!hasUnread || markingRead}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:bg-white disabled:hover:text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-purple-200 dark:disabled:hover:bg-black dark:disabled:hover:text-gray-400"
            >
              {t('notifications.markAllRead', 'Označiť ako prečítané')}
            </button>
          </div>
        ) : null}
      </div>

      <div className={isPanel ? '' : 'px-4 lg:px-0'}>
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            {t(error, 'Upozornenia sa nepodarilo načítať.')}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-2 font-semibold underline"
            >
              {t('notifications.retry', 'Skúsiť znova')}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-black dark:text-gray-400">
            {t('notifications.loadingFeed', 'Načítavam upozornenia...')}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-black">
            <BellIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
            <h2 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t('notifications.emptyTitle', 'Zatiaľ nemáte žiadne upozornenia')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(
                'notifications.emptyDescription',
                'Keď sa stane niečo dôležité, zobrazí sa to tu.',
              )}
            </p>
          </div>
        ) : (
          <div
            className="space-y-0"
            aria-busy={refreshing || markingRead}
          >
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={onNavigate}
                onMarkRead={markItemRead}
              />
            ))}
          </div>
        )}
        </div>
    </section>
  );
}
