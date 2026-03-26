'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ConversationListItem } from './types';
import { listConversations } from './messagingApi';

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sk-SK', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export function ConversationsList({ currentUserId }: { currentUserId: number }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await listConversations();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('messages.loading', 'Načítavam…')}</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {t('messages.none', 'Žiadne správy')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('messages.hint', 'Keď vám niekto pošle správu, objaví sa tu')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      {items.map((c) => {
        const other = c.other_user;
        const title = other?.display_name || t('messages.unknownUser', 'Používateľ');
        const rawPreview =
          c.last_message_preview ||
          (c.last_message_at
            ? t('messages.noPreview', 'Správa')
            : t('messages.noMessagesYet', 'Zatiaľ bez správ'));
        const isMine =
          typeof c.last_message_sender_id === 'number' && c.last_message_sender_id === currentUserId;
        const preview = isMine ? `Ty:${rawPreview}` : rawPreview;
        const when = formatDate(c.last_message_at);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => router.push(`/dashboard/messages/${c.id}`)}
            className="w-full text-left flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] hover:bg-white/80 dark:hover:bg-[#141416] transition-colors px-4 py-3"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              {other?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatar_url} alt={title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {(title || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</span>
                {c.has_unread && <span className="h-2 w-2 rounded-full bg-purple-600 flex-shrink-0" aria-label="Neprečítané" />}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{preview}</div>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
              {when}
            </div>
          </button>
        );
      })}
    </div>
  );
}

