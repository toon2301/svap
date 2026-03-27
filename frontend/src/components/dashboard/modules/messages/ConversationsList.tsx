'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ConversationListItem } from './types';
import { listConversations } from './messagingApi';
import { MESSAGING_CONVERSATIONS_REFRESH_EVENT } from './messagesEvents';
import { buildMessagesUrl } from './messagesRouting';

const IDLE_CONVERSATIONS_POLL_INTERVAL_MS = 30_000;

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

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
    void refresh({ showLoader: true, clearOnError: true });
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
      void refresh();
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
        const when = formatDate(conversation.last_message_at);
        const isSelected = selectedConversationId === conversation.id;
        const isUnread = conversation.has_unread && !isSelected;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => {
              // Optimistic UI: after opening the conversation, stop highlighting it as unread.
              setItems((prev) =>
                prev.map((item) =>
                  item.id === conversation.id ? { ...item, has_unread: false } : item,
                ),
              );
              router.push(buildMessagesUrl(conversation.id));
            }}
            className={`w-full text-left flex items-center gap-3 rounded-2xl border transition-colors ${
              isSelected
                ? 'border-purple-300 bg-purple-50/90 text-purple-900 dark:border-purple-700 dark:bg-purple-900/25 dark:text-white'
                : isRail
                  ? 'border-transparent bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                  : 'border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] hover:bg-white/80 dark:hover:bg-[#141416]'
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

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`truncate ${
                    isCompact ? 'text-xs' : 'text-sm'
                  } font-semibold ${isSelected ? 'text-purple-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {title}
                </span>
                {conversation.has_unread ? (
                  <span
                    className="h-2 w-2 rounded-full bg-purple-600 flex-shrink-0"
                    aria-label="Unread"
                  />
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

            <div
              className={`flex-shrink-0 tabular-nums ${
                isCompact ? 'text-[10px]' : 'text-[11px]'
              } ${
                isSelected
                  ? 'text-purple-700/80 dark:text-purple-200/80'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {when}
            </div>
          </button>
        );
      })}
    </div>
  );
}
