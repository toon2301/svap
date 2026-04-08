'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import {
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { ConversationListItem, MessageItem, MessageListPage } from './types';
import {
  deleteMessage,
  getMessagingErrorMessage,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from './messagingApi';
import { ChatRequestOfferPicker } from './ChatRequestOfferPicker';
import { DeleteMessageConfirmModal } from './DeleteMessageConfirmModal';
import { DesktopEmojiPickerButton } from './DesktopEmojiPickerButton';
import { MessageActionsMenu } from './MessageActionsMenu';
import {
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  requestConversationsRefresh,
  type MessagingRealtimeDeletedPayload,
  type MessagingRealtimeReadPayload,
  type MessagingRealtimeMessagePayload,
} from './messagesEvents';
import { useMobileViewportHeight } from '../../hooks/useMobileViewportHeight';
import {
  INITIAL_MESSAGES_PAGE_SIZE,
  mergeMessagesNewestFirst,
  OLDER_MESSAGES_SCROLL_THRESHOLD_PX,
} from './messageListUtils';
import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';

const MESSAGE_POLL_INTERVAL_MS = 10_000;
const MOBILE_LATEST_SCROLL_THRESHOLD_PX = 80;
const MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX = 300;
const MOBILE_MESSAGE_SIDE_PADDING_CLASS = 'px-1.5 pt-4 pb-2';
const DESKTOP_MESSAGE_SIDE_PADDING_CLASS = 'px-4 py-4 sm:px-5 lg:px-6';

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Kľúč minúty v lokálnom čase — na zoskupenie časových pečiatok pri viacerých správach za sebou. */
function minuteBucketKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

function timestampValue(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function pickLatestTimestamp(current: string | null, incoming: string | null): string | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return timestampValue(incoming) >= timestampValue(current) ? incoming : current;
}

export function ConversationDetail({
  conversationId,
  currentUserId,
  className = 'max-w-4xl mx-auto',
}: {
  conversationId: number;
  currentUserId: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { setActiveConversationId, syncConversationReadState } = useMessagesNotifications();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextOlderPage, setNextOlderPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [messageActionsTarget, setMessageActionsTarget] = useState<{
    messageId: number;
    anchorRect: DOMRect | null;
  } | null>(null);
  const [messagePendingDeleteId, setMessagePendingDeleteId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInFlightRef = useRef<Promise<MessageListPage> | null>(null);
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const lastMarkedIncomingMessageIdRef = useRef<number | null>(null);
  const pendingMarkReadIncomingMessageIdRef = useRef<number | null>(null);
  const markReadInFlightRef = useRef<Promise<void> | null>(null);
  const markReadSessionRef = useRef(0);
  const latestKnownMessageIdRef = useRef<number | null>(null);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const [isRequestPickerOpen, setIsRequestPickerOpen] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const pendingLatestScrollAfterRefreshRef = useRef(false);
  const shouldScrollToLatestOnRenderRef = useRef(false);
  const shouldPinFocusedViewportToBottomRef = useRef(false);
  const messageLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileViewportHeight = useMobileViewportHeight(isMobile && isComposerFocused);
  useConversationPresenceHeartbeat(conversationId);
  const targetUserId = otherConversation?.other_user?.id ?? null;
  const targetUserSlug = otherConversation?.other_user?.slug ?? null;
  const targetUserName =
    (otherConversation?.other_user?.display_name || '').trim() || t('messages.unknownUser', 'Používateľ');
  const targetUserAvatarUrl = otherConversation?.other_user?.avatar_url ?? null;
  const targetUserType = otherConversation?.other_user?.user_type ?? null;
  const canCreateRequestFromOffer =
    targetUserId !== null && otherConversation?.has_requestable_offers === true;

  const closeMessageActions = useCallback(() => {
    setMessageActionsTarget(null);
  }, []);

  const clearMessageLongPressTimer = useCallback(() => {
    if (!messageLongPressTimerRef.current) return;
    clearTimeout(messageLongPressTimerRef.current);
    messageLongPressTimerRef.current = null;
  }, []);

  const removeMessageLocally = useCallback((messageId: number) => {
    setMessages((current) => {
      const next = current.filter((item) => item.id !== messageId);
      latestKnownMessageIdRef.current = next[0]?.id ?? null;
      return next;
    });
  }, []);

  const focusComposer = useCallback(() => {
    if (isMobile) return;

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || input.disabled) return;

      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }

      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }, [isMobile]);

  const handleComposerFocus = useCallback(() => {
    setIsRequestPickerOpen(false);
    if (!isMobile) return;
    shouldPinFocusedViewportToBottomRef.current = true;
    setIsComposerFocused(true);
  }, [isMobile]);

  const handleComposerBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      const nextFocused = event.relatedTarget as Node | null;
      if (nextFocused && event.currentTarget.contains(nextFocused)) {
        return;
      }
      shouldPinFocusedViewportToBottomRef.current = false;
      setIsComposerFocused(false);
    },
    [isMobile],
  );

  const handleMobileSendPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // Keep the input focused so iOS does not consume the first tap by closing the keyboard.
      event.preventDefault();
    },
    [],
  );

  const handleOpenTargetUserProfile = useCallback(() => {
    const identifier =
      (targetUserSlug || '').trim() ||
      (typeof targetUserId === 'number' ? String(targetUserId) : '');
    if (!identifier || typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier },
      }),
    );
  }, [targetUserId, targetUserSlug]);

  const openMessageActions = useCallback((messageId: number, anchorRect: DOMRect | null) => {
    setMessageActionsTarget({ messageId, anchorRect });
  }, []);

  const handleDeleteMessage = useCallback(async () => {
    const messageId = messagePendingDeleteId;
    if (messageId === null || deletingMessageId !== null) return;

    setDeletingMessageId(messageId);
    try {
      const result = await deleteMessage(conversationId, messageId);
      removeMessageLocally(messageId);
      setMessagePendingDeleteId(null);
      setMessageActionsTarget(null);
      syncConversationReadState({
        conversationId,
        totalUnreadCount: result.total_unread_count,
      });
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.deleteFailed', 'Správu sa nepodarilo vymazať. Skúste to znova.'),
          unavailableFallback: t(
            'messages.deleteUnavailable',
            'Správu už nie je možné vymazať.',
          ),
        }),
      );
    } finally {
      setDeletingMessageId(null);
    }
  }, [
    conversationId,
    deletingMessageId,
    messagePendingDeleteId,
    removeMessageLocally,
    syncConversationReadState,
    t,
  ]);

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
    // API vracia najnovšie prvé – v UI chceme chronologicky
    return [...messages].reverse();
  }, [messages]);

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
          rateLimitFallback: t('messages.loadRateLimited', 'Správy načítavate príliš rýchlo. Skúste chvíľu počkať.'),
        }),
      );
    },
    [t],
  );

  const queueMarkConversationRead = useCallback(
    (list: MessageItem[]) => {
      const newestMessage =
        list.find((item) => item.sender?.id !== currentUserId && !item.is_deleted) ?? null;
      if (!newestMessage) return false;
      if (lastMarkedIncomingMessageIdRef.current === newestMessage.id) return false;

      const pendingMessageId = pendingMarkReadIncomingMessageIdRef.current;
      if (pendingMessageId === null || newestMessage.id > pendingMessageId) {
        pendingMarkReadIncomingMessageIdRef.current = newestMessage.id;
      }

      return true;
    },
    [currentUserId],
  );

  const flushPendingMarkConversationRead = useCallback(
    async (session: number) => {
      while (markReadSessionRef.current === session) {
        const messageId = pendingMarkReadIncomingMessageIdRef.current;
        if (messageId === null) return;

        pendingMarkReadIncomingMessageIdRef.current = null;
        if (lastMarkedIncomingMessageIdRef.current === messageId) {
          continue;
        }

        try {
          const result = await markConversationRead(conversationId);
          if (markReadSessionRef.current !== session) return;

          lastMarkedIncomingMessageIdRef.current = messageId;
          syncConversationReadState({
            conversationId,
            totalUnreadCount: result?.total_unread_count,
          });
        } catch {
          if (
            markReadSessionRef.current === session &&
            lastMarkedIncomingMessageIdRef.current !== messageId &&
            pendingMarkReadIncomingMessageIdRef.current === null
          ) {
            pendingMarkReadIncomingMessageIdRef.current = messageId;
          }
          return;
        }
      }
    },
    [conversationId, syncConversationReadState],
  );

  const maybeMarkConversationRead = useCallback(
    async (list: MessageItem[]) => {
      if (!queueMarkConversationRead(list)) return;

      if (!markReadInFlightRef.current) {
        const session = markReadSessionRef.current;
        let request: Promise<void> | null = null;
        request = (async () => {
          try {
            await flushPendingMarkConversationRead(session);
          } finally {
            if (markReadInFlightRef.current === request) {
              markReadInFlightRef.current = null;
            }
          }
        })();
        markReadInFlightRef.current = request;
      }

      const inFlightRequest = markReadInFlightRef.current;
      if (inFlightRequest) {
        await inFlightRequest;
      }
    },
    [flushPendingMarkConversationRead, queueMarkConversationRead],
  );

  const refresh = useCallback(
    async (
      {
        showError = true,
        markAsRead = false,
        syncConversations = false,
        scrollBehavior = 'none',
      }: {
        showError?: boolean;
        markAsRead?: boolean;
        syncConversations?: boolean;
        scrollBehavior?: 'none' | 'force_latest' | 'if_near_bottom';
      } = {},
    ) => {
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
        if (
          syncConversations &&
          newestMessageId !== previousNewestMessageId
        ) {
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
    markReadSessionRef.current += 1;
    markReadInFlightRef.current = null;
    lastMarkedIncomingMessageIdRef.current = null;
    pendingMarkReadIncomingMessageIdRef.current = null;
    latestKnownMessageIdRef.current = null;
    setMessages([]);
    setNextOlderPage(null);
    setPeerLastReadAt(null);
    setIsRequestPickerOpen(false);
    setMessageActionsTarget(null);
    setMessagePendingDeleteId(null);
    setDeletingMessageId(null);
    setLoadingOlder(false);
    pendingScrollRestoreRef.current = null;
    clearMessageLongPressTimer();
    void (async () => {
      try {
        setLoading(true);
        // Načítaj other_user z list endpointu (MVP nemá detail endpoint).
        try {
          const list = await listConversations();
          const found = Array.isArray(list) ? list.find((x) => x?.id === conversationId) : null;
          if (!cancelled) setOtherConversation(found ?? null);
        } catch {
          // ignore
        }
        await refresh({ markAsRead: true });
      } catch {
        // refresh already surfaced a user-facing error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearMessageLongPressTimer();
    };
  }, [clearMessageLongPressTimer, conversationId, refresh]);

  useEffect(() => {
    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    pollIntervalRef.current = setInterval(() => {
      refreshIfVisible();
    }, MESSAGE_POLL_INTERVAL_MS);

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      stopPolling();
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const handleRealtimeMessage = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeMessagePayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      void refresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    window.addEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    const handleRealtimeRead = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeReadPayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      setPeerLastReadAt((current) => pickLatestTimestamp(current, detail.peerLastReadAt || null));
    };

    window.addEventListener(MESSAGING_REALTIME_READ_EVENT, handleRealtimeRead);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_READ_EVENT, handleRealtimeRead);
    };
  }, [conversationId]);

  useEffect(() => {
    const handleRealtimeDeleted = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeDeletedPayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      removeMessageLocally(detail.messageId);
      setMessageActionsTarget((current) =>
        current?.messageId === detail.messageId ? null : current,
      );
      setMessagePendingDeleteId((current) => (current === detail.messageId ? null : current));
    };

    window.addEventListener(MESSAGING_REALTIME_DELETED_EVENT, handleRealtimeDeleted);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_DELETED_EVENT, handleRealtimeDeleted);
    };
  }, [conversationId, removeMessageLocally]);

  useEffect(() => {
    // Pri nových správach jemne doroluj na spodok (ak už je konverzácia otvorená).
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

  useEffect(() => {
    // Pri každom otvorení/refreshi konverzácie sa vráť na najnovšie správy.
    // Toto prepíše browser scroll-restoration aj po reload-e.
    if (loading) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollMessagesToLatest);
    });
  }, [conversationId, isMobile, loading, scrollMessagesToLatest]);

  useEffect(() => {
    if (!isMobile || !isComposerFocused || loading) return;
    if (!shouldPinFocusedViewportToBottomRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollMessagesToLatest);
    });
  }, [isComposerFocused, isMobile, loading, mobileViewportHeight, scrollMessagesToLatest]);

  useEffect(() => {
    if (loading) return;
    focusComposer();
  }, [conversationId, focusComposer, loading]);

  useEffect(() => {
    if (sending || loading || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    focusComposer();
  }, [focusComposer, loading, sending]);

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

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
    if (isMobile && isComposerFocused) {
      shouldPinFocusedViewportToBottomRef.current = isNearMessagesBottom();
    }
    if (loading || loadingOlder || nextOlderPage === null) return;
    if (scrollContainer.scrollTop > OLDER_MESSAGES_SCROLL_THRESHOLD_PX) return;
    void loadOlderMessages();
  }, [
    isComposerFocused,
    isMobile,
    isNearMessagesBottom,
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

    shouldPinFocusedViewportToBottomRef.current = true;
    setShowScrollToBottomButton(false);
  }, [scrollMessagesToLatest]);

  const handleSend = async () => {
    const draft = text;
    const clean = draft.trim();
    if (!clean || sending) return;

    const keepMobileComposerInteractive = isMobile;
    let didSend = false;

    shouldRestoreFocusRef.current = true;
    setSending(true);
    if (keepMobileComposerInteractive) {
      setText('');
    }
    try {
      await sendMessage(conversationId, clean);
      didSend = true;
      if (!keepMobileComposerInteractive) {
        setText('');
      }
      await refresh({ showError: false, markAsRead: true, scrollBehavior: 'force_latest' });
      requestConversationsRefresh();
    } catch (error) {
      if (keepMobileComposerInteractive && !didSend) {
        setText((current) => (current === '' ? draft : current));
      }
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.sendFailed', 'Správu sa nepodarilo odoslať. Skúste to znova.'),
          rateLimitFallback: t('messages.sendRateLimited', 'Posielate príliš rýchlo. Skúste chvíľu počkať.'),
          unavailableFallback: t('messages.sendUnavailable', 'Konverzácia už nie je dostupná.'),
        }),
      );
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((current) => current + emoji);
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    setText((current) => current.slice(0, start) + emoji + current.slice(end));

    requestAnimationFrame(() => {
      const nextPosition = start + emoji.length;
      input.focus();
      input.setSelectionRange(nextPosition, nextPosition);
    });
  }, []);

  const handleMessageActionTrigger = useCallback(
    (messageId: number, element: HTMLElement | null) => {
      openMessageActions(messageId, element?.getBoundingClientRect() ?? null);
    },
    [openMessageActions],
  );

  const getOwnMessageInteractionProps = useCallback(
    (messageId: number, isDeleted: boolean) => {
      if (isDeleted) {
        return {};
      }

      if (isMobile) {
        return {
          onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => {
            clearMessageLongPressTimer();
            const target = event.currentTarget;
            messageLongPressTimerRef.current = setTimeout(() => {
              openMessageActions(messageId, target.getBoundingClientRect());
              messageLongPressTimerRef.current = null;
            }, 450);
          },
          onTouchEnd: clearMessageLongPressTimer,
          onTouchCancel: clearMessageLongPressTimer,
          onTouchMove: clearMessageLongPressTimer,
        };
      }

      return {};
    },
    [
      clearMessageLongPressTimer,
      isMobile,
      openMessageActions,
    ],
  );

  const containerClassName = `w-full ${className}`;

  if (loading) {
    return (
      <div className={containerClassName}>
        <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('messages.loading', 'Načítavam…')}</div>
        </div>
      </div>
    );
  }

  const hasTextToSend = text.trim().length > 0;
  const isComposerInputDisabled = !isMobile && sending;

  return (
    <div
      className={`${containerClassName} flex h-full min-h-0 flex-col overflow-hidden overscroll-none`}
    >
      {!isMobile ? (
        <div
          data-testid="conversation-header"
          className="mb-3"
        >
          <div className="w-full border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-center">
              <button
                type="button"
                data-testid="conversation-header-trigger"
                onClick={handleOpenTargetUserProfile}
                disabled={targetUserId === null && !targetUserSlug}
                className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.06]"
                aria-label={t('messages.openPeerProfile', 'Otvoriť profil používateľa')}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  {otherConversation?.other_user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={otherConversation.other_user.avatar_url} alt={targetUserName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[24rem]">
                  {targetUserName}
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 min-h-0">
        <div
          ref={messagesScrollRef}
          data-testid="conversation-messages-scroll"
          onScroll={handleMessagesScroll}
          className={`h-full min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y elegant-scrollbar ${
            isMobile ? MOBILE_MESSAGE_SIDE_PADDING_CLASS : DESKTOP_MESSAGE_SIDE_PADDING_CLASS
          }`}
        >
          {ordered.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
              {t('messages.noMessagesYet', 'Zatiaľ bez správ')}
            </div>
          ) : (
            <div className="space-y-2">
              {ordered.map((m, index) => {
                const mine = m.sender?.id === currentUserId;
                const prev = index > 0 ? ordered[index - 1] : null;
                const next = index < ordered.length - 1 ? ordered[index + 1] : null;
                const prevSenderId = prev?.sender?.id ?? null;
                const curSenderId = m.sender?.id ?? null;
                const nextSenderId = next?.sender?.id ?? null;
                const showTimestamp =
                  !prev ||
                  prevSenderId !== curSenderId ||
                  minuteBucketKey(prev.created_at) !== minuteBucketKey(m.created_at);
                const showSenderAvatar = !mine && (!next || nextSenderId !== curSenderId);
                const showSeenIndicator = mine && !m.is_deleted && lastSeenMessageId === m.id;
                const senderAvatarUrl = m.sender?.avatar_url || targetUserAvatarUrl;
                const senderDisplayName = (m.sender?.display_name || '').trim() || targetUserName;
                const ownMessageInteractionProps = mine
                  ? getOwnMessageInteractionProps(m.id, m.is_deleted)
                  : {};
                const showDesktopMessageActionsTrigger = mine && !m.is_deleted && !isMobile;
                const bubbleClassName = [
                  'w-fit max-w-full rounded-2xl px-3 py-2 text-sm',
                  mine
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 dark:bg-[#141416] text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-800',
                ].join(' ');

                return mine ? (
                  <div
                    key={m.id}
                    className={`flex justify-end ${isMobile ? 'pr-0' : 'pr-1'}`}
                  >
                    <div
                      className={`group flex min-w-0 flex-col items-end ${
                        isMobile ? 'max-w-full' : 'max-w-[80%]'
                      }`}
                    >
                      {showTimestamp ? (
                        <div
                          data-testid={`message-timestamp-${m.id}`}
                          className="mb-1 text-[10px] tabular-nums text-right text-gray-500 dark:text-gray-400"
                        >
                          {formatTime(m.created_at)}
                        </div>
                      ) : null}
                      <div className="relative">
                        {showDesktopMessageActionsTrigger ? (
                          <button
                            type="button"
                            data-testid={`message-actions-trigger-${m.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMessageActionTrigger(m.id, event.currentTarget);
                            }}
                            className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 opacity-0 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 dark:text-gray-500 dark:hover:bg-[#141416] dark:hover:text-gray-200"
                            aria-label={t(
                              'messages.openMessageActions',
                              'Otvoriť možnosti správy',
                            )}
                          >
                            <EllipsisHorizontalIcon className="h-5 w-5" />
                          </button>
                        ) : null}
                        <div
                          data-testid={`message-bubble-${m.id}`}
                          className={bubbleClassName}
                          {...ownMessageInteractionProps}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        </div>
                      </div>
                      {showSeenIndicator ? (
                        <div
                          data-testid={`message-seen-indicator-${m.id}`}
                          className="mt-1 inline-flex items-center gap-1 self-end text-[11px] text-gray-500 dark:text-gray-400"
                        >
                          <span>{t('messages.seen', 'Prečítané')}</span>
                          <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
                            {targetUserAvatarUrl ? (
                              <img
                                src={targetUserAvatarUrl}
                                alt={targetUserName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] font-bold text-purple-700 dark:text-purple-300">
                                {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={`flex justify-start ${isMobile ? 'pl-0' : 'pl-1'}`}
                  >
                    <div
                      className={`flex min-w-0 flex-col ${
                        isMobile ? 'max-w-full' : 'max-w-[80%]'
                      }`}
                    >
                      {showTimestamp ? (
                        <div
                          data-testid={`message-timestamp-${m.id}`}
                          className={`mb-1 text-[10px] tabular-nums text-left text-gray-500 dark:text-gray-400 ${
                            isMobile ? 'pl-7' : 'pl-10'
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </div>
                      ) : null}
                      <div
                        className={`flex min-w-0 items-center ${isMobile ? 'gap-1' : 'gap-2'}`}
                      >
                        <div className={`flex shrink-0 justify-start ${isMobile ? 'w-6' : 'w-8'}`}>
                          {showSenderAvatar ? (
                            <div
                              data-testid={`message-avatar-${m.id}`}
                              className={`overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40 ${
                                isMobile ? 'h-6 w-6' : 'h-8 w-8'
                              }`}
                            >
                              {senderAvatarUrl ? (
                                <img
                                  src={senderAvatarUrl}
                                  alt={senderDisplayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-purple-700 dark:text-purple-300">
                                  {senderDisplayName.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className={`min-w-0 flex-1 ${
                            isMobile ? 'max-w-[calc(100%-1.75rem)]' : ''
                          }`}
                        >
                          <div data-testid={`message-bubble-${m.id}`} className={bubbleClassName}>
                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {isMobile && showScrollToBottomButton ? (
          <button
            type="button"
            data-testid="conversation-scroll-to-bottom"
            aria-label={t('messages.scrollToBottom', 'Prejsť na najnovšie správy')}
            onClick={handleScrollToBottomClick}
            className="absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 dark:border-gray-800 dark:bg-[#0f0f10]/95 dark:text-gray-100 dark:hover:bg-[#0f0f10]"
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {isMobile ? (
        <div
          data-testid="conversation-mobile-composer-stack"
          className={`mt-1 w-full shrink-0 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] ${
            isComposerFocused
              ? 'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
              : 'pb-[max(1.75rem,env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/90">
            {canCreateRequestFromOffer ? (
              <ChatRequestOfferPicker
                open={isRequestPickerOpen}
                disabled={!targetUserId}
                isMobile={isMobile}
                pairWithComposerBelow
                targetUserId={targetUserId}
                targetUserSlug={targetUserSlug}
                targetUserType={targetUserType}
                onToggle={() => setIsRequestPickerOpen((prev) => !prev)}
                className=""
              />
            ) : null}
            <div
              data-testid="conversation-composer"
              onFocusCapture={handleComposerFocus}
              onBlurCapture={handleComposerBlur}
              className="relative z-10 flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-hidden border-t border-gray-200 bg-white/90 px-2.5 py-2.5 dark:border-gray-800 dark:bg-[#0f0f10]/90"
            >
              <div className="relative flex min-h-0 min-w-0 flex-1 items-center overflow-hidden rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-black">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isComposerInputDisabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  className={`min-w-0 w-full border-0 bg-transparent py-2 text-sm text-gray-900 focus:outline-none dark:text-gray-100 ${
                    hasTextToSend
                      ? 'overflow-x-hidden text-ellipsis whitespace-nowrap pl-2 pr-12'
                      : 'overflow-x-hidden text-ellipsis whitespace-nowrap px-2'
                  }`}
                  placeholder={t('messages.type', 'Napíš správu…')}
                />
                {hasTextToSend ? (
                  <button
                    type="button"
                    disabled={sending}
                    onPointerDown={handleMobileSendPointerDown}
                    onClick={() => void handleSend()}
                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={t('messages.send', 'Odoslať')}
                  >
                    <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 w-full max-w-[min(100%,56rem)] mx-auto px-4 sm:px-6 lg:px-8 pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/90">
            {canCreateRequestFromOffer ? (
              <ChatRequestOfferPicker
                open={isRequestPickerOpen}
                disabled={!targetUserId}
                isMobile={isMobile}
                pairWithComposerBelow
                targetUserId={targetUserId}
                targetUserSlug={targetUserSlug}
                targetUserType={targetUserType}
                onToggle={() => setIsRequestPickerOpen((prev) => !prev)}
                className=""
              />
            ) : null}
            <div
              data-testid="conversation-composer"
              onFocusCapture={handleComposerFocus}
              onBlurCapture={handleComposerBlur}
              className="flex w-full min-w-0 shrink-0 gap-2 border-t border-gray-200 bg-white/90 px-3 py-3 dark:border-gray-800 dark:bg-[#0f0f10]/90"
            >
              <div className="relative min-w-0 flex-1">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isComposerInputDisabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  className="min-w-0 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/40 dark:border-gray-800 dark:bg-black dark:text-gray-100"
                  placeholder={t('messages.type', 'Napíš správu…')}
                />
                <DesktopEmojiPickerButton
                  ariaLabel={t('messages.addEmoji', 'Pridať emoji')}
                  disabled={sending}
                  onSelect={handleEmojiSelect}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
                />
              </div>
              <button
                type="button"
                disabled={sending || !hasTextToSend}
                onClick={() => void handleSend()}
                className="shrink-0 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? t('common.sending', 'Odosielam…') : t('messages.send', 'Odoslať')}
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageActionsMenu
        open={messageActionsTarget !== null}
        isMobile={isMobile}
        anchorRect={messageActionsTarget?.anchorRect ?? null}
        onClose={closeMessageActions}
        onDelete={() => {
          if (messageActionsTarget === null) return;
          setMessagePendingDeleteId(messageActionsTarget.messageId);
          setMessageActionsTarget(null);
        }}
      />
      <DeleteMessageConfirmModal
        open={messagePendingDeleteId !== null}
        isDeleting={deletingMessageId !== null}
        onClose={() => {
          if (deletingMessageId !== null) return;
          setMessagePendingDeleteId(null);
        }}
        onConfirm={() => void handleDeleteMessage()}
      />
    </div>
  );
}

