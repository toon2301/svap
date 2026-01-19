'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequestsNotifications } from '../../contexts/RequestsNotificationsContext';
import { fetchSkillRequests, updateSkillRequest } from './requestsApi';
import type { SkillRequest, SkillRequestsResponse } from './types';
import { RequestRow } from './RequestRow';
import { RequestsSkeletonList } from './ui/RequestsSkeletonList';

type Tab = 'received' | 'sent';

export function RequestsDesktop() {
  const { t } = useLanguage();
  const { markAllRead } = useRequestsNotifications();

  const [tab, setTab] = useState<Tab>('received');
  const [data, setData] = useState<SkillRequestsResponse>({ received: [], sent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchSkillRequests();
      setData(res);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void markAllRead();
    void load();
  }, [load, markAllRead]);

  const items = useMemo(() => (tab === 'received' ? data.received : data.sent), [data, tab]);

  const mutateItem = (updated: SkillRequest) => {
    setData((prev) => {
      const replace = (arr: SkillRequest[]) => arr.map((x) => (x.id === updated.id ? updated : x));
      return { received: replace(prev.received), sent: replace(prev.sent) };
    });
  };

  const handleAction = async (id: number, action: 'accept' | 'reject' | 'cancel') => {
    setBusyId(id);
    try {
      const res = await updateSkillRequest(id, action);
      const updated = res?.data as SkillRequest;
      if (updated && typeof updated.id === 'number') {
        mutateItem(updated);
      } else {
        void load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const receivedCount = data.received.length;
  const sentCount = data.sent.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm overflow-hidden">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('requests.title', 'Žiadosti')}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('requests.subtitle', 'Prijaté a odoslané žiadosti o karty')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              {t('common.refresh', 'Obnoviť')}
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div
            role="tablist"
            aria-label={t('requests.title', 'Žiadosti')}
            className="flex w-full items-stretch rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] shadow-sm overflow-hidden"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'received'}
              onClick={() => setTab('received')}
              className={[
                'relative flex-1 py-3 px-3 transition-all flex items-center justify-center gap-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                tab === 'received'
                  ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100/80 dark:to-purple-100/30 dark:text-purple-900'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#111214]',
              ].join(' ')}
            >
              <span className="text-sm font-semibold">{t('requests.received', 'Prijaté')}</span>
              <span
                className={[
                  'min-w-7 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                  tab === 'received'
                    ? 'bg-white/80 border-purple-200 text-purple-700 dark:bg-white/70 dark:border-purple-300/40 dark:text-purple-900'
                    : 'bg-white/60 border-gray-200 text-gray-700 dark:bg-black/30 dark:border-gray-800 dark:text-gray-200',
                ].join(' ')}
              >
                {receivedCount}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'sent'}
              onClick={() => setTab('sent')}
              className={[
                'relative flex-1 py-3 px-3 transition-all flex items-center justify-center gap-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                tab === 'sent'
                  ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100/80 dark:to-purple-100/30 dark:text-purple-900'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#111214]',
              ].join(' ')}
            >
              <span className="text-sm font-semibold">{t('requests.sent', 'Odoslané')}</span>
              <span
                className={[
                  'min-w-7 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                  tab === 'sent'
                    ? 'bg-white/80 border-purple-200 text-purple-700 dark:bg-white/70 dark:border-purple-300/40 dark:text-purple-900'
                    : 'bg-white/60 border-gray-200 text-gray-700 dark:bg-black/30 dark:border-gray-800 dark:text-gray-200',
                ].join(' ')}
              >
                {sentCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <RequestsSkeletonList />
      ) : items.length === 0 ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
          {items.map((it) => (
            <RequestRow
              key={it.id}
              item={it}
              variant={tab}
              isBusy={busyId === it.id}
              onAccept={tab === 'received' ? () => void handleAction(it.id, 'accept') : undefined}
              onReject={tab === 'received' ? () => void handleAction(it.id, 'reject') : undefined}
              onCancel={tab === 'sent' ? () => void handleAction(it.id, 'cancel') : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}


