'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { Bars3Icon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { MessageItem } from './types';
import { getMessagingErrorMessage, listConversations, listMessages, markConversationRead, sendMessage } from './messagingApi';
import { CreateRequestCta } from './CreateRequestCta';
import { CreateRequestModal } from './CreateRequestModal';
import type { ConversationListItem } from './types';
import { requestConversationsRefresh } from './messagesEvents';

const MESSAGE_POLL_INTERVAL_MS = 10_000;

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sk-SK', { hour: '2-digit', minute: '2-digit' });
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
        await markConversationRead(conversationId);
        lastMarkedIncomingMessageIdRef.current = newestMessage.id;
      } catch {
        // best-effort
      }
    },
    [conversationId, currentUserId],
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length]);

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
    <div className={`${className} flex flex-col h-[calc(100vh-8rem)]`}>
      {isMobile ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {targetUserName}
            </div>
            {requestCreatedInfo ? (
              <div className="mt-0.5 text-xs text-purple-700 dark:text-purple-300">
                {requestCreatedInfo}
              </div>
            ) : null}
          </div>
          <CreateRequestCta
            disabled={!targetUserId}
            onClick={() => {
              if (!targetUserId) return;
              setIsCreateRequestOpen(true);
            }}
          />
        </div>
      ) : (
        <div className="-mt-4 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 mb-3 relative">
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

      <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
        {ordered.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
            {t('messages.noMessagesYet', 'Zatiaľ bez správ')}
          </div>
        ) : (
          ordered.map((m) => {
            const mine = m.sender?.id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    mine
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-[#141416] text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-800',
                  ].join(' ')}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.text ?? t('messages.deleted', 'Správa bola odstránená')}
                  </div>
                  <div className={`mt-1 text-[10px] tabular-nums ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          placeholder={t('messages.type', 'Napíš správu…')}
        />
        <button
          type="button"
          disabled={sending || text.trim().length === 0}
          onClick={() => void handleSend()}
          className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
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

