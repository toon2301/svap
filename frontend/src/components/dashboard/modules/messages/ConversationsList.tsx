'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { syncMessageUnreadCountFromConversations } from '@/components/dashboard/contexts/messageUnreadStore';
import type { ConversationListItem } from './types';
import { listConversations } from './messagingApi';
import { MESSAGING_CONVERSATIONS_REFRESH_EVENT } from './messagesEvents';
import { buildMessagesUrl } from './messagesRouting';

const IDLE_CONVERSATIONS_POLL_INTERVAL_MS = 30_000;

export function ConversationsList({
  currentUserId,
  selectedConversationId = null,
  variant = 'default',
  className = '',
}: {
  currentUserId: number;
  selectedConversationId?: number | null;
  variant?: 'default' | 'sidebar' | 'rail';
  className?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshInFlightRef = useRef<Promise<ConversationListItem[]> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSidebar = variant === 'sidebar';
  const isRail = variant === 'rail';
  const isCompact = isSidebar || isRail;
  const showHoverAction = isRail;
  const shouldUseIntervalPolling = selectedConversationId == null;

  const refresh = useCallback(
    async ({
      showLoader = false,
      clearOnError = false,
    }: {
      showLoader?: boolean;
      clearOnError?: boolean;
    } = {}) => {
      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      if (showLoader) {
        setLoading(true);
      }

      const request = (async () => {
        const data = await listConversations();
        const safeItems = Array.isArray(data) ? data : [];
        syncMessageUnreadCountFromConversations(safeItems);
        setItems(safeItems);
        return safeItems;
      })();

      refreshInFlightRef.current = request;

      try {
        return await request;
      } catch (error) {
        if (clearOnError) {
          setItems([]);
        }
        throw error;
      } finally {
        if (refreshInFlightRef.current === request) {
          refreshInFlightRef.current = null;
        }
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void refresh({ showLoader: true, clearOnError: true }).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh().catch(() => undefined);
    };

    if (shouldUseIntervalPolling) {
      pollIntervalRef.current = setInterval(() => {
        refreshIfVisible();
      }, IDLE_CONVERSATIONS_POLL_INTERVAL_MS);
    }

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, refreshIfVisible);

    return () => {
      stopPolling();
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, refreshIfVisible);
    };
  }, [refresh, shouldUseIntervalPolling]);

  if (loading) {
    return (
      <div className={className || (isCompact ? '' : 'max-w-4xl mx-auto')}>
        {isRail ? (
          <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            {t('messages.loading', 'Loading...')}
          </div>
        ) : (
          <div
            className={`bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 ${
              isSidebar ? 'p-3' : 'p-4'
            }`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('messages.loading', 'Loading...')}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={className || (isCompact ? '' : 'max-w-4xl mx-auto')}>
        {isRail ? (
          <div className="px-3 py-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {t('messages.none', 'No messages')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('messages.hint', 'When someone sends you a message, it will appear here.')}
            </div>
          </div>
        ) : (
          <div
            className={`bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 text-center ${
              isSidebar ? 'p-4' : 'p-8'
            }`}
          >
            <div className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t('messages.none', 'No messages')}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('messages.hint', 'When someone sends you a message, it will appear here.')}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className || (isCompact ? 'space-y-2' : 'max-w-4xl mx-auto space-y-2')}>
      {items.map((conversation) => {
        const other = conversation.other_user;
        const title = other?.display_name || t('messages.unknownUser', 'User');
        const rawPreview =
          conversation.last_message_preview ||
          (conversation.last_message_at
            ? t('messages.noPreview', 'Message')
            : t('messages.noMessagesYet', 'No messages yet'));
        const isMine =
          typeof conversation.last_message_sender_id === 'number' &&
          conversation.last_message_sender_id === currentUserId;
        const preview = isMine ? `Ty: ${rawPreview}` : rawPreview;
        const isSelected = selectedConversationId === conversation.id;
        const unreadCount =
          typeof conversation.unread_count === 'number'
            ? conversation.unread_count
            : conversation.has_unread
              ? 1
              : 0;
        const isUnread = unreadCount > 0 && !isSelected && !isMine;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => {
              // Optimistic UI: after opening the conversation, stop highlighting it as unread.
              setItems((prev) =>
                prev.map((item) =>
                  item.id === conversation.id
                    ? { ...item, has_unread: false, unread_count: 0 }
                    : item,
                ),
              );
              router.push(buildMessagesUrl(conversation.id));
            }}
            className={`group relative w-full text-left flex items-center gap-3 transition-colors ${
              isRail
                ? `rounded-2xl border ${
                    isSelected
                      ? 'border-purple-300 bg-purple-50/90 text-purple-900 dark:border-purple-700 dark:bg-purple-900/25 dark:text-white'
                      : 'border-transparent bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                  }`
                : `${
                    isSelected
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/25 dark:text-white'
                      : 'bg-transparent text-gray-700 dark:text-gray-300'
                  }`
            } ${isCompact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
          >
            <div
              className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                isCompact ? 'w-9 h-9' : 'w-10 h-10'
              } ${
                isSelected
                  ? 'bg-purple-200 dark:bg-purple-800/70'
                  : 'bg-purple-100 dark:bg-purple-900/40'
              }`}
            >
              {other?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatar_url} alt={title} className="w-full h-full object-cover" />
              ) : (
                <span
                  className={`font-bold ${
                    isCompact ? 'text-[11px]' : 'text-xs'
                  } ${
                    isSelected
                      ? 'text-purple-800 dark:text-purple-100'
                      : 'text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {(title || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div
              className={`min-w-0 flex-1 transition-[padding-right] duration-150 ${
                showHoverAction ? 'group-hover:pr-7 group-focus-visible:pr-7' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  data-testid={showHoverAction ? `conversation-title-${conversation.id}` : undefined}
                  className={`truncate ${
                    isCompact ? 'text-xs' : 'text-sm'
                  } font-semibold ${isSelected ? 'text-purple-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {title}
                </span>
                {isUnread ? (
                  <span
                    className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white flex-shrink-0"
                    aria-label={`${unreadCount} unread messages`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </div>
              <div
                className={`truncate ${
                  isCompact ? 'text-[11px]' : 'text-xs'
                } ${
                  isSelected
                    ? 'text-purple-700/90 dark:text-purple-200/90'
                    : 'text-gray-600 dark:text-gray-400'
                } ${isUnread ? 'font-extrabold text-gray-900 dark:text-white' : 'font-normal'}`}
              >
                {preview}
              </div>
            </div>

            {showHoverAction ? (
              <span
                aria-hidden="true"
                data-testid={`conversation-hover-action-${conversation.id}`}
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                  isSelected
                    ? 'text-purple-700 dark:text-purple-200'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Bars3Icon className="h-4 w-4" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
