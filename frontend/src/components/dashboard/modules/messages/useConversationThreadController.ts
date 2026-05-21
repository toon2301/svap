'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ConversationListItem, MessageItem, MessageListPage } from './types';
import {
  getMessagingErrorMessage,
  listConversations,
  listMessageRequests,
  listMessages,
  updateConversationPinnedMessage,
} from './messagingApi';
import { requestConversationsRefresh } from './messagesEvents';
import {
  MOBILE_LATEST_SCROLL_THRESHOLD_PX,
  MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX,
} from './conversationDetailConstants';
import { pickLatestTimestamp, timestampValue } from './conversationDetailUtils';
import {
  INITIAL_MESSAGES_PAGE_SIZE,
  mergeMessagesNewestFirst,
  OLDER_MESSAGES_SCROLL_THRESHOLD_PX,
} from './messageListUtils';
import { useConversationReadState } from './useConversationReadState';
import { useInitialBottomPin } from './useInitialBottomPin';
type Translate = (key: string, defaultValue?: string) => string;
export type ConversationRefreshOptions = {
  showError?: boolean;
  markAsRead?: boolean;
  syncConversations?: boolean;
  scrollBehavior?: 'none' | 'force_latest' | 'if_near_bottom';
};
type UseConversationThreadControllerArgs = {
  conversationId: number;
  currentUserId: number;
  isMobile: boolean;
  t: Translate;
  syncConversationReadState: (options: {
    conversationId: number;
    totalUnreadCount?: number | null;
  }) => void;
};
export function useConversationThreadController({
  conversationId,
  currentUserId,
  isMobile,
  t,
  syncConversationReadState,
}: UseConversationThreadControllerArgs) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextOlderPage, setNextOlderPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<MessageItem | null>(null);
  const [isUpdatingPinnedMessage, setIsUpdatingPinnedMessage] = useState(false);
  const [isLocatingPinnedMessage, setIsLocatingPinnedMessage] = useState(false);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const refreshInFlightRef = useRef<Promise<MessageListPage> | null>(null);
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const latestKnownMessageIdRef = useRef<number | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesStackRef = useRef<HTMLDivElement | null>(null);
  const pendingLatestScrollAfterRefreshRef = useRef(false);
  const shouldScrollToLatestOnRenderRef = useRef(false);
  const { maybeMarkConversationRead, resetReadStateSession } = useConversationReadState({
    conversationId,
    currentUserId,
    syncConversationReadState,
  });
  const markMessageDeletedLocally = useCallback((messageId: number) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              is_deleted: true,
              text: null,
              image_url: null,
              has_image: false,
            }
          : item,
      ),
    );
    setPinnedMessage((current) => (current?.id === messageId ? null : current));
  }, []);
  const findMessageRowElement = useCallback((messageId: number) => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer) return null;
    return scrollContainer.querySelector<HTMLElement>(`[data-message-row-id="${messageId}"]`);
  }, []);
  const waitForNextPaint = useCallback(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
    [],
  );
  const handleUpdatePinnedMessage = useCallback(
    async (messageId: number | null) => {
      if (isUpdatingPinnedMessage) return;
      const isUnpin = messageId === null;
      setIsUpdatingPinnedMessage(true);
      try {
        const result = await updateConversationPinnedMessage(conversationId, messageId);
        setPinnedMessage(result.pinned_message);
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: isUnpin
              ? t('messages.unpinFailed', 'Správu sa nepodarilo odopnúť. Skúste to znova.')
              : t('messages.pinFailed', 'Správu sa nepodarilo pripnúť. Skúste to znova.'),
          }),
        );
      } finally {
        setIsUpdatingPinnedMessage(false);
      }
    },
    [conversationId, isUpdatingPinnedMessage, t],
  );
  const handlePinnedMessageBannerClick = useCallback(async () => {
    const messageId = pinnedMessage?.id ?? null;
    if (messageId === null || isLocatingPinnedMessage) return;
    let target = findMessageRowElement(messageId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsLocatingPinnedMessage(true);
    try {
      let pageToLoad = nextOlderPage;
      while (!target && pageToLoad !== null) {
        const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE, pageToLoad);
        pageToLoad = page.nextPage;
        setMessages((current) => mergeMessagesNewestFirst(current, page.results));
        setNextOlderPage(page.nextPage);
        setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
        setPinnedMessage(page.pinnedMessage);
        await waitForNextPaint();
        target = findMessageRowElement(messageId);
      }

      if (!target) {
        toast.error(
          t(
            'messages.pinnedMessageUnavailable',
            'Pripnutú správu sa nepodarilo nájsť v histórii konverzácie.',
          ),
        );
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t(
            'messages.pinnedMessageUnavailable',
            'Pripnutú správu sa nepodarilo nájsť v histórii konverzácie.',
          ),
        }),
      );
    } finally {
      setIsLocatingPinnedMessage(false);
    }
  }, [
    conversationId,
    findMessageRowElement,
    isLocatingPinnedMessage,
    nextOlderPage,
    pinnedMessage,
    t,
    waitForNextPaint,
  ]);
  const handleUnpinPinnedMessage = useCallback(() => {
    if (!pinnedMessage) return;
    void handleUpdatePinnedMessage(null);
  }, [handleUpdatePinnedMessage, pinnedMessage]);
  const scrollMessagesToLatest = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      if (isMobile) {
        setShowScrollToBottomButton(false);
      }
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    if (isMobile) {
      setShowScrollToBottomButton(false);
    }
  }, [isMobile]);
  const getMessagesDistanceToBottom = useCallback((scrollContainer: HTMLDivElement | null) => {
    if (!scrollContainer) return null;
    return scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
  }, []);
  const updateScrollToBottomButtonVisibility = useCallback(
    (scrollContainer: HTMLDivElement | null) => {
      if (!isMobile || messages.length === 0) {
        setShowScrollToBottomButton(false);
        return false;
      }

      const distanceToBottom = getMessagesDistanceToBottom(scrollContainer);
      const shouldShow =
        distanceToBottom !== null &&
        distanceToBottom > MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX;
      setShowScrollToBottomButton((current) => (current === shouldShow ? current : shouldShow));
      return shouldShow;
    },
    [getMessagesDistanceToBottom, isMobile, messages.length],
  );
  const isNearMessagesBottom = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    const distanceToBottom = getMessagesDistanceToBottom(scrollContainer);
    if (distanceToBottom === null) return false;
    return distanceToBottom <= MOBILE_LATEST_SCROLL_THRESHOLD_PX;
  }, [getMessagesDistanceToBottom]);
  const ordered = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);
  const hasRenderedCurrentConversationMessages =
    !loading &&
    ordered.length > 0 &&
    ordered[ordered.length - 1]?.conversation === conversationId;

  useInitialBottomPin({
    conversationId,
    enabled: hasRenderedCurrentConversationMessages,
    scrollContainerRef: messagesScrollRef,
    contentRef: messagesStackRef,
    scrollToBottom: scrollMessagesToLatest,
  });
  const lastSeenMessageId = useMemo(() => {
    const peerReadTimestamp = timestampValue(peerLastReadAt);
    if (!Number.isFinite(peerReadTimestamp)) return null;

    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      const item = ordered[index];
      if (item.sender?.id !== currentUserId) continue;
      if (timestampValue(item.created_at) <= peerReadTimestamp) {
        return item.id;
      }
    }

    return null;
  }, [currentUserId, ordered, peerLastReadAt]);
  const showLoadErrorToast = useCallback(
    (error: unknown) => {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.loadFailed', 'Nepodarilo sa načítať správy. Skúste to znova.'),
          rateLimitFallback: t(
            'messages.loadRateLimited',
            'Správy načítavate príliš rýchlo. Skúste chvíľu počkať.',
          ),
        }),
      );
    },
    [t],
  );
  const refresh = useCallback(
    async ({
      showError = true,
      markAsRead = false,
      syncConversations = false,
      scrollBehavior = 'none',
    }: ConversationRefreshOptions = {}) => {
      if (scrollBehavior === 'force_latest') {
        pendingLatestScrollAfterRefreshRef.current = true;
      } else if (scrollBehavior === 'if_near_bottom') {
        pendingLatestScrollAfterRefreshRef.current =
          pendingLatestScrollAfterRefreshRef.current || !isMobile || isNearMessagesBottom();
      }

      if (refreshInFlightRef.current) {
        try {
          const sharedPage = await refreshInFlightRef.current;
          setPeerLastReadAt((current) =>
            pickLatestTimestamp(current, sharedPage.peerLastReadAt ?? null),
          );
          if (markAsRead) {
            await maybeMarkConversationRead(sharedPage.results);
          }
          return sharedPage.results;
        } catch (error) {
          pendingLatestScrollAfterRefreshRef.current = false;
          if (showError) {
            showLoadErrorToast(error);
          }
          throw error;
        }
      }

      const request = (async () => {
        const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE);
        const newestMessageId = page.results[0]?.id ?? null;
        const previousNewestMessageId = latestKnownMessageIdRef.current;
        const shouldScrollAfterRefresh = pendingLatestScrollAfterRefreshRef.current;
        pendingLatestScrollAfterRefreshRef.current = false;
        latestKnownMessageIdRef.current = newestMessageId;
        shouldScrollToLatestOnRenderRef.current =
          shouldScrollAfterRefresh && newestMessageId !== previousNewestMessageId;
        setMessages((current) => mergeMessagesNewestFirst(current, page.results));
        setNextOlderPage(page.nextPage);
        setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
        setPinnedMessage(page.pinnedMessage);
        if (page.conversation) {
          setOtherConversation(page.conversation);
        } else if (syncConversations) {
          try {
            const list = await listConversations();
            const found = Array.isArray(list) ? list.find((item) => item?.id === conversationId) : null;
            if (found) {
              setOtherConversation(found);
            } else {
              const requests = await listMessageRequests();
              const requestConversation = Array.isArray(requests)
                ? requests.find((item) => item?.id === conversationId)
                : null;
              setOtherConversation(requestConversation ?? null);
            }
          } catch {
            // Header/settings data is best-effort during message refresh.
          }
        }
        if (syncConversations && newestMessageId !== previousNewestMessageId) {
          requestConversationsRefresh();
        }
        return page;
      })();

      refreshInFlightRef.current = request;
      try {
        const page = await request;
        if (markAsRead) {
          await maybeMarkConversationRead(page.results);
        }
        return page.results;
      } catch (error) {
        pendingLatestScrollAfterRefreshRef.current = false;
        if (showError) {
          showLoadErrorToast(error);
        }
        throw error;
      } finally {
        if (refreshInFlightRef.current === request) {
          refreshInFlightRef.current = null;
        }
      }
    },
    [conversationId, isMobile, isNearMessagesBottom, maybeMarkConversationRead, showLoadErrorToast],
  );
  useEffect(() => {
    let cancelled = false;
    resetReadStateSession();
    latestKnownMessageIdRef.current = null;
    refreshInFlightRef.current = null;
    pendingScrollRestoreRef.current = null;
    pendingLatestScrollAfterRefreshRef.current = false;
    shouldScrollToLatestOnRenderRef.current = false;
    setMessages([]);
    setNextOlderPage(null);
    setPeerLastReadAt(null);
    setPinnedMessage(null);
    setOtherConversation(null);
    setLoadingOlder(false);
    setShowScrollToBottomButton(false);
    setIsUpdatingPinnedMessage(false);
    setIsLocatingPinnedMessage(false);
    void (async () => {
      try {
        setLoading(true);
        await refresh({ markAsRead: true });
      } catch {
        // refresh already surfaced a user-facing error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, refresh, resetReadStateSession]);
  useEffect(() => {
    const scrollContainer = messagesScrollRef.current;
    const pendingRestore = pendingScrollRestoreRef.current;
    if (pendingRestore && scrollContainer) {
      pendingScrollRestoreRef.current = null;
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight - pendingRestore.scrollHeight + pendingRestore.scrollTop;
      updateScrollToBottomButtonVisibility(scrollContainer);
      return;
    }

    if (!shouldScrollToLatestOnRenderRef.current) {
      return;
    }
    shouldScrollToLatestOnRenderRef.current = false;
    scrollMessagesToLatest();
  }, [ordered.length, scrollMessagesToLatest, updateScrollToBottomButtonVisibility]);
  const loadOlderMessages = useCallback(async () => {
    if (loading || loadingOlder || nextOlderPage === null) return;
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer) {
      pendingScrollRestoreRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };
    }

    setLoadingOlder(true);
    try {
      const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE, nextOlderPage);
      setMessages((current) => mergeMessagesNewestFirst(current, page.results));
      setNextOlderPage(page.nextPage);
      setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
      setPinnedMessage(page.pinnedMessage);
    } catch (error) {
      pendingScrollRestoreRef.current = null;
      showLoadErrorToast(error);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loading, loadingOlder, nextOlderPage, showLoadErrorToast]);
  const handleMessagesScroll = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer) return;
    updateScrollToBottomButtonVisibility(scrollContainer);
    if (loading || loadingOlder || nextOlderPage === null) return;
    if (scrollContainer.scrollTop > OLDER_MESSAGES_SCROLL_THRESHOLD_PX) return;
    void loadOlderMessages();
  }, [
    loadOlderMessages,
    loading,
    loadingOlder,
    nextOlderPage,
    updateScrollToBottomButtonVisibility,
  ]);
  const handleScrollToBottomClick = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      scrollMessagesToLatest();
    }
    setShowScrollToBottomButton(false);
  }, [scrollMessagesToLatest]);
  return {
    messages,
    ordered,
    loading,
    loadingOlder,
    peerLastReadAt,
    pinnedMessage,
    isUpdatingPinnedMessage,
    isLocatingPinnedMessage,
    otherConversation,
    lastSeenMessageId,
    bottomRef,
    messagesScrollRef,
    messagesStackRef,
    showScrollToBottomButton,
    setPeerLastReadAt,
    setPinnedMessage,
    markMessageDeletedLocally,
    refresh,
    handleUpdatePinnedMessage,
    handlePinnedMessageBannerClick,
    handleUnpinPinnedMessage,
    isNearMessagesBottom,
    scrollMessagesToLatest,
    handleMessagesScroll,
    handleScrollToBottomClick,
  };
}
