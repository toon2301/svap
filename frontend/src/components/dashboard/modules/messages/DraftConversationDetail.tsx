'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import {
  getMessagingErrorMessage,
  openConversation,
  sendDirectMessage,
} from './messagingApi';
import type { ConversationDraft, MessagingUserBrief } from './types';
import { requestConversationsRefresh } from './messagesEvents';
import { buildMessagesUrl } from './messagesRouting';

function resolveTargetName(targetUser: MessagingUserBrief | null, fallback: string): string {
  const name = (targetUser?.display_name || '').trim();
  return name || fallback;
}

export function DraftConversationDetail({
  targetUserId,
  className = 'max-w-4xl mx-auto',
}: {
  targetUserId: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [draft, setDraft] = useState<ConversationDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const resolvedTargetIdRef = useRef<number>(targetUserId);

  useEffect(() => {
    resolvedTargetIdRef.current = targetUserId;
  }, [targetUserId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        const result = await openConversation(targetUserId);
        if (cancelled) return;

        if (!result.is_draft && typeof result.id === 'number') {
          router.replace(buildMessagesUrl(result.id));
          return;
        }

        setDraft(result);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getMessagingErrorMessage(error, {
              fallback: t('messages.openFailed', 'Nepodarilo sa otvoriť konverzáciu. Skúste to znova.'),
              rateLimitFallback: t(
                'messages.openRateLimited',
                'Konverzácie otvárate príliš rýchlo. Skúste chvíľu počkať.',
              ),
              unavailableFallback: t(
                'messages.openUnavailable',
                'Používateľovi momentálne nie je možné napísať.',
              ),
            }),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t, targetUserId]);

  const targetUser = draft?.other_user ?? null;
  const targetUserName = useMemo(
    () => resolveTargetName(targetUser, t('messages.unknownUser', 'Používateľ')),
    [t, targetUser],
  );

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean || sending) return;

    setSending(true);
    try {
      const result = await sendDirectMessage(resolvedTargetIdRef.current, clean);
      setText('');
      requestConversationsRefresh();
      router.replace(buildMessagesUrl(result.conversation_id));
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.sendFailed', 'Správu sa nepodarilo odoslať. Skúste to znova.'),
          rateLimitFallback: t(
            'messages.sendRateLimited',
            'Posielate príliš rýchlo. Skúste chvíľu počkať.',
          ),
          unavailableFallback: t(
            'messages.sendUnavailable',
            'Konverzácia už nie je dostupná.',
          ),
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
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('messages.loading', 'Načítavam…')}
          </div>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className={className}>
        <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('messages.openUnavailable', 'Používateľovi momentálne nie je možné napísať.')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col h-[calc(100vh-8rem)]`}>
      <div className={isMobile ? 'mb-2' : '-mt-4 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 mb-3 relative'}>
        {isMobile ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              {targetUser?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={targetUser.avatar_url} alt={targetUserName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {targetUserName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('messages.firstMessageHint', 'Konverzácia sa vytvorí až po odoslaní prvej správy.')}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                {targetUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={targetUser.avatar_url} alt={targetUserName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[24rem]">
                {targetUserName}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto elegant-scrollbar p-4">
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-md">
            <ChatBubbleLeftRightIcon className="w-20 h-20 text-black dark:text-white mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('messages.startConversation', 'Začnite konverzáciu')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'messages.firstMessageHint',
                'Konverzácia sa vytvorí až po odoslaní prvej správy.',
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex w-full gap-2 lg:mx-auto lg:max-w-[min(100%,64rem)]">
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
    </div>
  );
}
