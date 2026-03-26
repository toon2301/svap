'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';
import type { MessageItem } from './types';
import { getMessagingErrorMessage, listConversations, listMessages, markConversationRead, sendMessage } from './messagingApi';
import { CreateRequestCta } from './CreateRequestCta';
import { CreateRequestModal } from './CreateRequestModal';
import type { ConversationListItem } from './types';

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

export function ConversationDetail({ conversationId, currentUserId }: { conversationId: number; currentUserId: number }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [requestCreatedInfo, setRequestCreatedInfo] = useState<string | null>(null);

  const ordered = useMemo(() => {
    // API vracia najnovšie prvé – v UI chceme chronologicky
    return [...messages].reverse();
  }, [messages]);

  const refresh = async ({ showError = true }: { showError?: boolean } = {}) => {
    try {
      const list = await listMessages(conversationId, 100);
      setMessages(list);
    } catch (error) {
      if (showError) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t('messages.loadFailed', 'Nepodarilo sa načítať správy. Skúste to znova.'),
            rateLimitFallback: t('messages.loadRateLimited', 'Správy načítavate príliš rýchlo. Skúste chvíľu počkať.'),
          }),
        );
      }
      throw error;
    }
  };

  useEffect(() => {
    let cancelled = false;
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
        await refresh();
        try {
          await markConversationRead(conversationId);
        } catch {
          // best-effort
        }
      } catch {
        // refresh already surfaced a user-facing error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length]);

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, clean);
      setText('');
      await refresh({ showError: false });
      try {
        await markConversationRead(conversationId);
      } catch {
        // best-effort
      }
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
      <div className="max-w-4xl mx-auto">
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
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
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

      <div className="flex-1 overflow-y-auto elegant-scrollbar rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] p-4 space-y-2">
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
                    {mine ? `Ty:${m.text ?? t('messages.deleted', 'Správa bola odstránená')}` : m.text ?? t('messages.deleted', 'Správa bola odstránená')}
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
            void refresh();
            void markConversationRead(conversationId);
          }}
        />
      ) : null}
    </div>
  );
}

