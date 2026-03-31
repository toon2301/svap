'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import { Bars3Icon } from '@heroicons/react/24/outline';
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

const MESSAGE_POLL_INTERVAL_MS = 10_000;

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInFlightRef = useRef<Promise<MessageItem[]> | null>(null);
  const lastMarkedIncomingMessageIdRef = useRef<number | null>(null);
  const latestKnownMessageIdRef = useRef<number | null>(null);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [requestCreatedInfo, setRequestCreatedInfo] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

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

  const maybeMarkConversationRead = useCallback(
    async (list: MessageItem[]) => {
      const newestMessage = list[0] ?? null;
      if (!newestMessage) return;
      if (newestMessage.sender?.id === currentUserId) return;
      if (lastMarkedIncomingMessageIdRef.current === newestMessage.id) return;

      try {
        const result = await markConversationRead(conversationId);
        lastMarkedIncomingMessageIdRef.current = newestMessage.id;
        syncConversationReadState({
          conversationId,
          totalUnreadCount: result?.total_unread_count,
        });
      } catch {
        // best-effort
      }
    },
    [conversationId, currentUserId, syncConversationReadState],
  );

  const refresh = useCallback(
    async (
      {
        showError = true,
        markAsRead = false,
        syncConversations = false,
      }: {
        showError?: boolean;
        markAsRead?: boolean;
        syncConversations?: boolean;
      } = {},
    ) => {
      if (refreshInFlightRef.current) {
        try {
          const sharedList = await refreshInFlightRef.current;
          if (markAsRead) {
            await maybeMarkConversationRead(sharedList);
          }
          return sharedList;
        } catch (error) {
          if (showError) {
            showLoadErrorToast(error);
          }
          throw error;
        }
      }

      const request = (async () => {
        const list = await listMessages(conversationId, 100);
        const newestMessageId = list[0]?.id ?? null;
        const previousNewestMessageId = latestKnownMessageIdRef.current;
        latestKnownMessageIdRef.current = newestMessageId;
        setMessages(list);
        if (
          syncConversations &&
          newestMessageId !== previousNewestMessageId
        ) {
          requestConversationsRefresh();
        }
        return list;
      })();

      refreshInFlightRef.current = request;

      try {
        const list = await request;
        if (markAsRead) {
          await maybeMarkConversationRead(list);
        }
        return list;
      } catch (error) {
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
    [conversationId, maybeMarkConversationRead, showLoadErrorToast],
  );

  useEffect(() => {
    let cancelled = false;
    lastMarkedIncomingMessageIdRef.current = null;
    latestKnownMessageIdRef.current = null;
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
      void refresh({ showError: false, markAsRead: true, syncConversations: true });
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
      void refresh({ showError: false, markAsRead: true, syncConversations: true });
    };

    window.addEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    // Pri nových správach jemne doroluj na spodok (ak už je konverzácia otvorená).
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length]);

  useEffect(() => {
    // Pri každom otvorení/refreshi konverzácie sa vráť na najnovšie správy.
    // Toto prepíše browser scroll-restoration aj po reload-e.
    const scrollToLatest = () => {
      if (messagesScrollRef.current) {
        messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLatest);
    });
  }, [conversationId, loading, ordered.length]);

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

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    shouldRestoreFocusRef.current = true;
    setSending(true);
    try {
      await sendMessage(conversationId, clean);
      setText('');
      await refresh({ showError: false, markAsRead: true });
      requestConversationsRefresh();
    } catch (error) {
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

  if (loading) {
    return (
      <div className={className}>
        <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('messages.loading', 'Načítavam…')}</div>
        </div>
      </div>
    );
  }

  const targetUserId = otherConversation?.other_user?.id ?? null;
  const targetUserName =
    (otherConversation?.other_user?.display_name || '').trim() || t('messages.unknownUser', 'Používateľ');

  return (
    <div className={`${className} flex flex-col min-h-0 h-[calc(100vh-4rem)] lg:h-full overflow-hidden`}>
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

      <div
        ref={messagesScrollRef}
        data-testid="conversation-messages-scroll"
        className={`flex-1 min-h-0 overflow-y-auto elegant-scrollbar p-4 space-y-2 ${
          isMobile ? 'pb-28' : ''
        }`}
      >
        {ordered.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
            {t('messages.noMessagesYet', 'Zatiaľ bez správ')}
          </div>
        ) : (
          ordered.map((m, index) => {
            const mine = m.sender?.id === currentUserId;
            const prev = index > 0 ? ordered[index - 1] : null;
            const prevSenderId = prev?.sender?.id ?? null;
            const curSenderId = m.sender?.id ?? null;
            const showTimestamp =
              !prev ||
              prevSenderId !== curSenderId ||
              minuteBucketKey(prev.created_at) !== minuteBucketKey(m.created_at);
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${mine ? 'flex flex-col items-end' : ''}`}>
                  {showTimestamp ? (
                    <div
                      data-testid={`message-timestamp-${m.id}`}
                      className={`mb-1 text-[10px] tabular-nums ${
                        mine ? 'text-right text-gray-500 dark:text-gray-400' : 'text-left text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </div>
                  ) : null}
                  <div
                    data-testid={`message-bubble-${m.id}`}
                    className={[
                      'w-fit max-w-full rounded-2xl px-3 py-2 text-sm',
                      mine
                        ? 'bg-brand text-white'
                        : 'bg-gray-100 dark:bg-[#141416] text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-800',
                    ].join(' ')}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {m.text ?? t('messages.deleted', 'Správa bola odstránená')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className={
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-40 flex w-full min-w-0 shrink-0 gap-2 border-t border-gray-200 bg-white px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-gray-800 dark:bg-black'
            : 'mt-2 flex w-full min-w-0 shrink-0 gap-2 px-4 sm:px-6 lg:px-8 mx-auto pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:max-w-[min(100%,36rem)] md:max-w-[min(100%,44rem)] lg:max-w-[min(100%,52rem)] xl:max-w-[min(100%,64rem)]'
        }
      >
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            className={`min-w-0 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
              !isMobile ? 'pr-12' : ''
            }`}
            placeholder={t('messages.type', 'Napíš správu…')}
          />
          {!isMobile ? (
            <DesktopEmojiPickerButton
              ariaLabel={t('messages.addEmoji', 'Pridať emoji')}
              disabled={sending}
              onSelect={handleEmojiSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
            />
          ) : null}
        </div>
        <button
          type="button"
          disabled={sending || text.trim().length === 0}
          onClick={() => void handleSend()}
          className="px-4 py-2 rounded-2xl bg-brand text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
        >
          {sending ? t('common.sending', 'Odosielam…') : t('messages.send', 'Odoslať')}
        </button>
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

