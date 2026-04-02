'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import { Bars3Icon, ChevronDownIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { MessageItem } from './types';
import { getMessagingErrorMessage, listConversations, listMessages, markConversationRead, sendMessage } from './messagingApi';
import { CreateRequestCta } from './CreateRequestCta';
import { CreateRequestModal } from './CreateRequestModal';
import { DesktopEmojiPickerButton } from './DesktopEmojiPickerButton';
import type { ConversationListItem } from './types';
import {
  MESSAGING_REALTIME_MESSAGE_EVENT,
  requestConversationsRefresh,
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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInFlightRef = useRef<Promise<{ results: MessageItem[]; nextPage: number | null }> | null>(null);
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const lastMarkedIncomingMessageIdRef = useRef<number | null>(null);
  const pendingMarkReadIncomingMessageIdRef = useRef<number | null>(null);
  const markReadInFlightRef = useRef<Promise<void> | null>(null);
  const markReadSessionRef = useRef(0);
  const latestKnownMessageIdRef = useRef<number | null>(null);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [requestCreatedInfo, setRequestCreatedInfo] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const pendingLatestScrollAfterRefreshRef = useRef(false);
  const shouldScrollToLatestOnRenderRef = useRef(false);
  const shouldPinFocusedViewportToBottomRef = useRef(false);
  const mobileViewportHeight = useMobileViewportHeight(isMobile && isComposerFocused);
  useConversationPresenceHeartbeat(conversationId);

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
      const newestMessage = list[0] ?? null;
      if (!newestMessage) return false;
      if (newestMessage.sender?.id === currentUserId) return false;
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
    setLoadingOlder(false);
    pendingScrollRestoreRef.current = null;
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
    };
  }, [conversationId, refresh]);

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

  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headerMenuRef.current && !headerMenuRef.current.contains(target)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isHeaderMenuOpen]);

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

  const targetUserId = otherConversation?.other_user?.id ?? null;
  const targetUserName =
    (otherConversation?.other_user?.display_name || '').trim() || t('messages.unknownUser', 'Používateľ');
  const targetUserAvatarUrl = otherConversation?.other_user?.avatar_url ?? null;
  const hasTextToSend = text.trim().length > 0;
  const isComposerInputDisabled = !isMobile && sending;

  return (
    <div
      className={`${containerClassName} flex h-full min-h-0 flex-col overflow-hidden overscroll-none`}
    >
      {isMobile ? (
        <div className="mb-2 flex items-center justify-end gap-2">
          {requestCreatedInfo ? (
            <div className="mr-auto text-xs text-purple-700 dark:text-purple-300">
              {requestCreatedInfo}
            </div>
          ) : null}
          <CreateRequestCta
            disabled={!targetUserId}
            onClick={() => {
              if (!targetUserId) return;
              setIsCreateRequestOpen(true);
            }}
          />
        </div>
      ) : (
        <div
          data-testid="conversation-header"
          className="mb-3"
        >
          <div className="w-full border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
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
                <div className="relative" ref={headerMenuRef}>
                  <button
                    type="button"
                    className="p-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#161618] transition-colors"
                    aria-label={t('common.menu', 'Menu')}
                    onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                  >
                    <Bars3Icon className="w-5 h-5" />
                  </button>

                  {isHeaderMenuOpen ? (
                    <div className="absolute left-0 top-full mt-2 min-w-[170px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f10] shadow-xl p-1 z-20">
                      <button
                        type="button"
                        disabled={!targetUserId}
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (!targetUserId) return;
                          setIsCreateRequestOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#161618] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('requests.createFromChat', 'Vytvoriť žiadosť')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {requestCreatedInfo ? (
            <div className="mt-1 px-4 sm:px-6 lg:px-8 text-center text-xs text-purple-700 dark:text-purple-300">
              {requestCreatedInfo}
            </div>
          ) : null}
        </div>
      )}

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
                const senderAvatarUrl = m.sender?.avatar_url || targetUserAvatarUrl;
                const senderDisplayName = (m.sender?.display_name || '').trim() || targetUserName;
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
                      className={`flex min-w-0 flex-col items-end ${
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
                      <div data-testid={`message-bubble-${m.id}`} className={bubbleClassName}>
                        <div className="whitespace-pre-wrap break-words">
                          {m.text ?? t('messages.deleted', 'Správa bola odstránená')}
                        </div>
                      </div>
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
                            <div className="whitespace-pre-wrap break-words">
                              {m.text ?? t('messages.deleted', 'Správa bola odstránená')}
                            </div>
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

      <div
        data-testid="conversation-composer"
        onFocusCapture={handleComposerFocus}
        onBlurCapture={handleComposerBlur}
        className={
          isMobile
            ? `relative z-10 mt-1 flex w-full min-w-0 shrink-0 items-center overflow-x-hidden pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-1 ${
                isComposerFocused
                  ? 'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
                  : 'pb-[max(1.75rem,env(safe-area-inset-bottom,0px))]'
              }`
            : 'mt-2 flex w-full min-w-0 shrink-0 gap-2 px-4 sm:px-6 lg:px-8 mx-auto pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:max-w-[min(100%,36rem)] md:max-w-[min(100%,44rem)] lg:max-w-[min(100%,52rem)] xl:max-w-[min(100%,64rem)]'
        }
      >
        <div
          className={`relative min-w-0 flex-1 ${
            isMobile
              ? 'flex min-h-0 items-center overflow-hidden rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-black'
              : ''
          }`}
        >
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
            className={`min-w-0 w-full text-sm text-gray-900 dark:text-gray-100 ${
              isMobile
                ? `border-0 bg-transparent py-2 focus:outline-none overflow-x-hidden text-ellipsis whitespace-nowrap ${
                    hasTextToSend ? 'pl-2 pr-12' : 'px-2'
                  }`
                : 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand/40 pr-12'
            }`}
            placeholder={t('messages.type', 'Napíš správu…')}
          />
          {isMobile && hasTextToSend ? (
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
          {!isMobile ? (
            <DesktopEmojiPickerButton
              ariaLabel={t('messages.addEmoji', 'Pridať emoji')}
              disabled={sending}
              onSelect={handleEmojiSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
            />
          ) : null}
        </div>
        {isMobile ? null : (
          <button
            type="button"
            disabled={sending || !hasTextToSend}
            onClick={() => void handleSend()}
            className="px-4 py-2 rounded-2xl bg-brand text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
          >
            {sending ? t('common.sending', 'Odosielam…') : t('messages.send', 'Odoslať')}
          </button>
        )}
      </div>

      {targetUserId ? (
        <CreateRequestModal
          open={isCreateRequestOpen}
          conversationId={conversationId}
          targetUserId={targetUserId}
          targetUserName={targetUserName}
          onClose={() => setIsCreateRequestOpen(false)}
          onCreated={() => {
            setRequestCreatedInfo(t('requests.createdInfo', 'Žiadosť bola vytvorená'));
            void refresh({ showError: false, markAsRead: true });
          }}
        />
      ) : null}
    </div>
  );
}

