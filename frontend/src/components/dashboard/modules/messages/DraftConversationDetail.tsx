'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DesktopEmojiPickerButton } from './DesktopEmojiPickerButton';
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

  useEffect(() => {
    if (loading || !draft) return;
    focusComposer();
  }, [draft, focusComposer, loading, targetUserId]);

  useEffect(() => {
    if (sending || loading || !draft || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    focusComposer();
  }, [draft, focusComposer, loading, sending]);

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean || sending) return;

    shouldRestoreFocusRef.current = true;
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

  const handleEmojiSelect = (emoji: string) => {
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
    <div className={`${className} flex flex-col min-h-0 h-[calc(100vh-4rem)] lg:h-full overflow-hidden`}>
      <div
        data-testid={!isMobile ? 'draft-conversation-header' : undefined}
        className={
          isMobile
            ? 'mb-2'
            : 'mb-3'
        }
      >
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

      <div
        data-testid={!isMobile ? 'draft-conversation-scroll' : undefined}
        className="flex-1 min-h-0 overflow-y-auto elegant-scrollbar p-4"
      >
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

      <div className="mt-2 flex w-full min-w-0 shrink-0 gap-2 px-4 sm:px-6 lg:px-8 mx-auto pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:max-w-[min(100%,36rem)] md:max-w-[min(100%,44rem)] lg:max-w-[min(100%,52rem)] xl:max-w-[min(100%,64rem)]">
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
    </div>
  );
}
