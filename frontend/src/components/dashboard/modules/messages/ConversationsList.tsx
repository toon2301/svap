'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';
import {
  publishMessageUnreadCount,
  syncMessageUnreadCountFromConversations,
} from '@/components/dashboard/contexts/messageUnreadStore';
import toast from 'react-hot-toast';
import type { ConversationListItem } from './types';
import {
  getMessagingErrorMessage,
  hideConversation,
  listConversations,
  updateConversationPinnedState,
} from './messagingApi';
import { ConversationActionsMenu } from './ConversationActionsMenu';
import { ConversationsListSkeleton } from './ConversationsListSkeleton';
import { DeleteConversationConfirmModal } from './DeleteConversationConfirmModal';
import {
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  requestConversationsRefresh,
} from './messagesEvents';
import { navigateMessagesUrl } from './messagesRouting';
import { ConversationsListRow } from './ConversationsListRow';
import { ConversationsListSearchInput } from './ConversationsListSearchInput';
import { ReportUserModal } from '../profile/ReportUserModal';
import { CreateGroupConversationModal } from './CreateGroupConversationModal';

const IDLE_CONVERSATIONS_POLL_INTERVAL_MS = 30_000;
const CONVERSATION_SEARCH_DEBOUNCE_MS = 300;
const MAX_CONVERSATION_SEARCH_LENGTH = 100;
export const MESSAGING_CREATE_GROUP_OPEN_EVENT = 'messaging:create-group:open';

function normalizeConversationSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toSortableTimestamp(value?: string | null): number {
  if (!value) return -1;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

function sortConversations(items: ConversationListItem[]): ConversationListItem[] {
  return [...items].sort((left, right) => {
    const leftPinned = Boolean(left.is_pinned);
    const rightPinned = Boolean(right.is_pinned);
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    const lastMessageDiff =
      toSortableTimestamp(right.last_message_at) - toSortableTimestamp(left.last_message_at);
    if (lastMessageDiff !== 0) {
      return lastMessageDiff;
    }

    const updatedDiff = toSortableTimestamp(right.updated_at) - toSortableTimestamp(left.updated_at);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return right.id - left.id;
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
  const isMobile = useIsMobile();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [conversationActionsTarget, setConversationActionsTarget] = useState<{
    conversationId: number;
    anchorRect: DOMRect | null;
  } | null>(null);
  const [conversationPendingDeleteId, setConversationPendingDeleteId] = useState<number | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [conversationPinUpdateId, setConversationPinUpdateId] = useState<number | null>(null);
  const [reportUserId, setReportUserId] = useState<number | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const refreshInFlightRef = useRef<{
    key: string;
    promise: Promise<ConversationListItem[]>;
  } | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isSidebar = variant === 'sidebar';
  const isRail = variant === 'rail';
  const isCompact = isSidebar || isRail;
  const showHoverAction = isRail;
  const shouldUseIntervalPolling = selectedConversationId == null;
  const defaultWrapperClassName = isCompact ? 'space-y-2' : 'max-w-4xl mx-auto space-y-2';
  const wrapperClassName = className || defaultWrapperClassName;
  const normalizedSearchQuery = normalizeConversationSearchQuery(searchQuery);
  const isSearchActive = activeSearchQuery.length > 0;
  const shouldRenderSearch =
    items.length > 0 || normalizedSearchQuery.length > 0 || activeSearchQuery.length > 0;
  const activeConversationActionItem = conversationActionsTarget
    ? items.find((item) => item.id === conversationActionsTarget.conversationId) ?? null
    : null;
  const activeConversationReportUserId = activeConversationActionItem?.other_user?.id ?? null;

  const commitSearchQuery = useCallback((nextQuery: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setActiveSearchQuery((current) => (current === nextQuery ? current : nextQuery));
  }, []);

  const refresh = useCallback(
    async ({
      showLoader = false,
      clearOnError = false,
    }: {
      showLoader?: boolean;
      clearOnError?: boolean;
    } = {}) => {
      const search = activeSearchQuery;
      const inFlight = refreshInFlightRef.current;
      if (inFlight && inFlight.key === search) {
        return inFlight.promise;
      }

      if (showLoader) {
        setLoading(true);
      }

      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      const request = (async () => {
        const data = await listConversations({ search });
        const safeItems = sortConversations(Array.isArray(data) ? data : []);
        if (latestRequestIdRef.current === requestId) {
          setItems(safeItems);
          if (!search) {
            syncMessageUnreadCountFromConversations(safeItems);
          }
        }
        return safeItems;
      })();

      refreshInFlightRef.current = {
        key: search,
        promise: request,
      };

      try {
        return await request;
      } catch (error) {
        if (clearOnError && latestRequestIdRef.current === requestId) {
          setItems([]);
        }
        throw error;
      } finally {
        if (refreshInFlightRef.current?.promise === request) {
          refreshInFlightRef.current = null;
        }
        if (latestRequestIdRef.current === requestId) {
          hasLoadedOnceRef.current = true;
          if (showLoader) {
            setLoading(false);
          }
        }
      }
    },
    [activeSearchQuery],
  );

  const closeConversationActions = useCallback(() => {
    setConversationActionsTarget(null);
  }, []);

  const removeConversationLocally = useCallback(
    (conversationId: number, totalUnreadCount?: number) => {
      setItems((current) => {
        const next = current.filter((item) => item.id !== conversationId);
        if (isSearchActive) {
          if (typeof totalUnreadCount === 'number') {
            publishMessageUnreadCount(totalUnreadCount);
          }
        } else {
          syncMessageUnreadCountFromConversations(next);
        }
        return next;
      });
    },
    [isSearchActive],
  );

  const openConversation = useCallback((conversationId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === conversationId ? { ...item, has_unread: false, unread_count: 0 } : item,
      ),
    );
    navigateMessagesUrl(conversationId);
  }, []);

  const updateConversationPinLocally = useCallback((conversationId: number, isPinned: boolean) => {
    setItems((current) =>
      sortConversations(
        current.map((item) =>
          item.id === conversationId ? { ...item, is_pinned: isPinned } : item,
        ),
      ),
    );
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    const conversationId = conversationPendingDeleteId;
    if (conversationId === null || isDeletingConversation) return;

    setIsDeletingConversation(true);
    try {
      const result = await hideConversation(conversationId);
      removeConversationLocally(conversationId, result.total_unread_count);
      setConversationPendingDeleteId(null);
      closeConversationActions();
      requestConversationsRefresh();
      if (selectedConversationId === conversationId) {
        navigateMessagesUrl();
      }
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t(
            'messages.deleteConversationFailed',
            'Konverzáciu sa nepodarilo vymazať. Skúste to znova.',
          ),
          unavailableFallback: t(
            'messages.deleteConversationUnavailable',
            'Konverzáciu už nie je možné vymazať.',
          ),
        }),
      );
    } finally {
      setIsDeletingConversation(false);
    }
  }, [
    closeConversationActions,
    conversationPendingDeleteId,
    isDeletingConversation,
    removeConversationLocally,
    selectedConversationId,
    t,
  ]);

  const handleToggleConversationPinned = useCallback(
    async (conversationId: number, nextPinned: boolean) => {
      if (conversationPinUpdateId === conversationId) return;

      setConversationPinUpdateId(conversationId);
      try {
        const result = await updateConversationPinnedState(conversationId, nextPinned);
        updateConversationPinLocally(conversationId, result.is_pinned);
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t(
              nextPinned ? 'messages.pinConversationFailed' : 'messages.unpinConversationFailed',
              nextPinned
                ? 'Konverzáciu sa nepodarilo pripnúť. Skúste to znova.'
                : 'Konverzáciu sa nepodarilo odopnúť. Skúste to znova.',
            ),
          }),
        );
      } finally {
        setConversationPinUpdateId((current) => (current === conversationId ? null : current));
      }
    },
    [conversationPinUpdateId, t, updateConversationPinLocally],
  );

  useEffect(() => {
    if (normalizedSearchQuery === activeSearchQuery) {
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setActiveSearchQuery((current) =>
        current === normalizedSearchQuery ? current : normalizedSearchQuery,
      );
      searchDebounceRef.current = null;
    }, CONVERSATION_SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [activeSearchQuery, normalizedSearchQuery]);

  useEffect(() => {
    void refresh({
      showLoader: !hasLoadedOnceRef.current,
      clearOnError: true,
    }).catch(() => undefined);
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
      void (async () => {
        const sessionState = await ensureFreshSessionForBackgroundWork({
          minValidityMs: IDLE_CONVERSATIONS_POLL_INTERVAL_MS + 5_000,
        });
        if (sessionState === 'invalid_session' || sessionState === 'transient_failure') {
          return;
        }
        await refresh().catch(() => undefined);
      })();
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

  useEffect(() => {
    const openCreateGroup = () => setIsCreateGroupOpen(true);
    window.addEventListener(MESSAGING_CREATE_GROUP_OPEN_EVENT, openCreateGroup);
    return () => window.removeEventListener(MESSAGING_CREATE_GROUP_OPEN_EVENT, openCreateGroup);
  }, []);

  if (loading) {
    return <ConversationsListSkeleton variant={variant} className={wrapperClassName} />;
  }

  if (items.length === 0 && !isSearchActive) {
    return (
      <div className={className || (isCompact ? '' : 'max-w-4xl mx-auto')}>
        {isRail ? (
          <div className="px-3 py-3">
            <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
              {t('messages.none', 'No messages')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('messages.hint', 'When someone sends you a message, it will appear here.')}
            </div>
          </div>
        ) : (
          <>
            <div
              className={
                isMobile && !isCompact
                  ? 'mx-3 mt-4 mb-1'
                  : 'mb-3 flex justify-end px-3'
              }
            >
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className={
                  isMobile && !isCompact
                    ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-gray-700 dark:bg-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-purple-200'
                    : 'inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/35'
                }
              >
                {isMobile && !isCompact ? (
                  <>
                    <PlusIcon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    <UserGroupIcon className="h-5 w-5 shrink-0" />
                    {t('messages.createGroupMobileCta', 'Vytvoriť skupinový chat')}
                  </>
                ) : (
                  <>
                    <UserGroupIcon className="h-4 w-4" />
                    {t('messages.createGroupShort', 'Skupina')}
                  </>
                )}
              </button>
            </div>
            <div className="flex h-full min-h-[calc(100dvh-12rem)] items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <ChatBubbleLeftRightIcon className="mb-4 h-20 w-20 text-black dark:text-white" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {t('messages.title', 'Vaše správy')}
                </h2>
              </div>
            </div>
          </>
        )}
        <CreateGroupConversationModal
          open={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreated={(conversation) => {
            setItems((current) => sortConversations([conversation, ...current]));
            navigateMessagesUrl(conversation.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      {!isRail ? (
        <div
          className={
            isMobile && !isCompact
              ? 'mx-3 mt-4 mb-1'
              : 'mb-3 flex justify-end px-3'
          }
        >
          <button
            type="button"
            onClick={() => setIsCreateGroupOpen(true)}
            className={
              isMobile && !isCompact
                ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-gray-700 dark:bg-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-purple-200'
                : 'inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/35'
            }
          >
            {isMobile && !isCompact ? (
              <>
                <PlusIcon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <UserGroupIcon className="h-5 w-5 shrink-0" />
                {t('messages.createGroupMobileCta', 'Vytvoriť skupinový chat')}
              </>
            ) : (
              <>
                <UserGroupIcon className="h-4 w-4" />
                {t('messages.createGroupShort', 'Skupina')}
              </>
            )}
          </button>
        </div>
      ) : null}
      {shouldRenderSearch ? (
        <ConversationsListSearchInput
          value={searchQuery}
          maxLength={MAX_CONVERSATION_SEARCH_LENGTH}
          placeholder={t('messages.searchPlaceholder', 'Hľadať podľa mena...')}
          clearLabel={t('search.clearSearch', 'Vyčistiť vyhľadávanie')}
          className={
            isMobile && !isCompact
              ? 'sticky top-0 z-20 mx-3 pt-1 pb-2 bg-white/95 backdrop-blur dark:bg-black/95'
              : ''
          }
          inputRef={searchInputRef}
          onChange={setSearchQuery}
          onClear={() => {
            setSearchQuery('');
            commitSearchQuery('');
            searchInputRef.current?.focus();
          }}
          onEnter={() => {
            commitSearchQuery(normalizedSearchQuery);
          }}
        />
      ) : null}

      {items.length === 0 ? (
        <div className={isRail ? 'px-3 py-3' : 'px-4 py-12 text-center'}>
          <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
            {t('messages.searchNoResultsTitle', 'Nenašli sa žiadne konverzácie')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t(
              'messages.searchNoResultsHint',
              'Skúste zmeniť meno používateľa alebo vymazať vyhľadávanie.',
            )}
          </div>
        </div>
      ) : (
        items.map((conversation) => {
          return (
            <ConversationsListRow
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              selectedConversationId={selectedConversationId}
              isCompact={isCompact}
              isRail={isRail}
              showHoverAction={showHoverAction}
              onOpenConversation={openConversation}
              onOpenActions={(conversationId, anchorRect) => {
                setConversationActionsTarget({
                  conversationId,
                  anchorRect,
                });
              }}
              t={t}
            />
          );
        })
      )}

      <ConversationActionsMenu
        open={conversationActionsTarget !== null}
        isMobile={false}
        anchorRect={conversationActionsTarget?.anchorRect ?? null}
        isPinned={Boolean(activeConversationActionItem?.is_pinned)}
        onClose={closeConversationActions}
        onTogglePinned={() => {
          if (!activeConversationActionItem) return;
          const conversationId = activeConversationActionItem.id;
          const nextPinned = !Boolean(activeConversationActionItem.is_pinned);
          closeConversationActions();
          void handleToggleConversationPinned(conversationId, nextPinned);
        }}
        onReportUser={
          activeConversationReportUserId === null
            ? undefined
            : () => {
                setReportUserId(activeConversationReportUserId);
                closeConversationActions();
              }
        }
        onDeleteConversation={() => {
          if (!conversationActionsTarget) return;
          setConversationPendingDeleteId(conversationActionsTarget.conversationId);
          closeConversationActions();
        }}
      />
      <DeleteConversationConfirmModal
        open={conversationPendingDeleteId !== null}
        isDeleting={isDeletingConversation}
        onClose={() => {
          if (isDeletingConversation) return;
          setConversationPendingDeleteId(null);
        }}
        onConfirm={() => void handleDeleteConversation()}
      />
      {reportUserId !== null ? (
        <ReportUserModal
          open
          userId={reportUserId}
          onClose={() => setReportUserId(null)} onSuccess={() => setReportUserId(null)}
        />
      ) : null}
      <CreateGroupConversationModal
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={(conversation) => {
          setItems((current) => sortConversations([conversation, ...current]));
          requestConversationsRefresh();
          navigateMessagesUrl(conversation.id);
        }}
      />
    </div>
  );
}
