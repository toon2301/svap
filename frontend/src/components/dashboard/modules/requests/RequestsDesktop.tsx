'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequestsNotifications } from '../../contexts/RequestsNotificationsContext';
import {
  fetchSkillRequests,
  getApiErrorMessage,
  updateSkillRequest,
  requestCompletion,
  confirmCompletion,
} from './requestsApi';
import type { SkillRequest, SkillRequestsResponse } from './types';
import { RequestRow } from './RequestRow';
import { RequestsSkeletonList } from './ui/RequestsSkeletonList';
import { AddReviewModal } from '../reviews/AddReviewModal';
import { api, endpoints } from '@/lib/api';

type Tab = 'received' | 'sent';
type StatusTab = 'pending' | 'active' | 'completed' | 'cancelled';

const STATUS_PARAMS: Record<StatusTab, string> = {
  pending: 'pending',
  active: 'accepted,completion_requested',
  completed: 'completed',
  cancelled: 'cancelled,rejected',
};

export function RequestsDesktop() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { markAllRead, unreadCount } = useRequestsNotifications();

  const [statusTab, setStatusTab] = useState<StatusTab>('pending');
  const [tab, setTab] = useState<Tab>('received');
  const [data, setData] = useState<SkillRequestsResponse>({ received: [], sent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ action: 'reject' | 'cancel' | 'hide'; id: number } | null>(null);

  const [autoReviewOfferId, setAutoReviewOfferId] = useState<number | null>(null);
  const [isAutoReviewOpen, setIsAutoReviewOpen] = useState(false);
  const autoReviewOpenedForOfferIdsRef = useRef<Set<number>>(new Set());

  const reviewerName = useMemo(() => {
    if (!user) return '';
    const n = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return n || user.email || '';
  }, [user]);
  const reviewerAvatarUrl = user?.avatar_url || null;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusQuery = STATUS_PARAMS[statusTab];
      const res = await fetchSkillRequests(statusQuery);
      setData(res);
    } finally {
      setIsLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    void markAllRead();
    void load();
  }, [load, markAllRead]);

  // Keď si v Žiadostiach a badge sa zobrazí (nové žiadosti), po 5 s automaticky označ ako prečítané
  useEffect(() => {
    if (unreadCount <= 0) return;
    const t = window.setTimeout(() => {
      markAllRead();
    }, 5000);
    return () => window.clearTimeout(t);
  }, [unreadCount, markAllRead]);

  const items = useMemo(() => {
    const arr =
      tab === 'received'
        ? data.received
        : statusTab === 'cancelled'
          ? data.sent
          : data.sent.filter((x) => x.status !== 'cancelled');
    return [...arr].sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta;
    });
  }, [data, tab, statusTab]);

  const mutateItem = (updated: SkillRequest) => {
    setData((prev) => {
      const replace = (arr: SkillRequest[]) => arr.map((x) => (x.id === updated.id ? updated : x));
      return { received: replace(prev.received), sent: replace(prev.sent) };
    });
  };

  const handleAction = async (id: number, action: 'accept' | 'reject' | 'cancel' | 'hide') => {
    setBusyId(id);
    try {
      const res = await updateSkillRequest(id, action);
      const updated = res?.data as SkillRequest;
      if (updated && typeof updated.id === 'number') {
        mutateItem(updated);
        if (action === 'cancel' || action === 'hide') {
          void load();
        }
      } else {
        void load();
      }
    } catch (err: unknown) {
      const fallback =
        action === 'cancel'
          ? t('requests.toastCancelFailed', 'Zrušenie žiadosti zlyhalo.')
          : action === 'hide'
            ? t('requests.toastDeleteFailed', 'Odstránenie žiadosti zlyhalo.')
            : t('common.error', 'Nastala chyba.');
      toast.error(getApiErrorMessage(err, fallback));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const receivedCount = data.received.length;
  const sentCount =
    statusTab === 'cancelled' ? data.sent.length : data.sent.filter((x) => x.status !== 'cancelled').length;

  const handleConfirmAction = () => {
    if (!pendingConfirm) return;
    const { id, action } = pendingConfirm;
    setPendingConfirm(null);
    void handleAction(id, action);
  };

  const handleRequestCompletion = async (id: number) => {
    setBusyId(id);
    try {
      const res = await requestCompletion(id);
      const updated = res?.data as SkillRequest;
      if (updated && typeof updated.id === 'number') {
        mutateItem(updated);
      } else {
        void load();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('common.error', 'Nastala chyba.')));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCompletion = async (id: number) => {
    setBusyId(id);
    try {
      const res = await confirmCompletion(id);
      const updated = res?.data as SkillRequest;
      if (updated && typeof updated.id === 'number') {
        mutateItem(updated);

        // Po úspešnom potvrdení (status → completed): ak je používateľ requester a ešte nemá recenziu, otvor modal
        if (updated.status === 'completed') {
          const offerId = (updated.offer_summary?.id ?? updated.offer) as unknown;
          const offerInt = typeof offerId === 'number' ? offerId : Number(offerId);
          if (
            Number.isFinite(offerInt) &&
            offerInt > 0 &&
            tab === 'sent' &&
            !autoReviewOpenedForOfferIdsRef.current.has(offerInt)
          ) {
            try {
              const { data: offerData } = await api.get<any>(endpoints.skills.detail(offerInt));
              const alreadyReviewed = offerData?.already_reviewed === true;
              if (!alreadyReviewed) {
                autoReviewOpenedForOfferIdsRef.current.add(offerInt);
                setAutoReviewOfferId(offerInt);
                setIsAutoReviewOpen(true);
              }
            } catch {
              // ak sa nepodarí zistiť already_reviewed, modal automaticky neotváraj
            }
          }
        }
      } else {
        void load();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('common.error', 'Nastala chyba.')));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm overflow-hidden">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('requests.title', 'Spolupráce')}
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

        {/* 4 taby: Čakajúce, Aktívne, Dokončené, Zrušené */}
        <div className="px-4 pt-2 pb-2">
          <div
            role="tablist"
            aria-label={t('requests.tabStatusLabel', 'Stav spoluprác')}
            className="flex w-full items-stretch rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] shadow-sm overflow-hidden"
          >
            {(['pending', 'active', 'completed', 'cancelled'] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusTab === key}
                onClick={() => setStatusTab(key)}
                className={[
                  'relative flex-1 py-2.5 px-2 transition-all flex items-center justify-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                  statusTab === key
                    ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100/80 dark:to-purple-100/30 dark:text-purple-900'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#111214]',
                ].join(' ')}
              >
                <span className="text-xs font-semibold">
                  {key === 'pending' && t('requests.tabPending', 'Čakajúce')}
                  {key === 'active' && t('requests.tabActive', 'Aktívne')}
                  {key === 'completed' && t('requests.tabCompleted', 'Dokončené')}
                  {key === 'cancelled' && t('requests.tabCancelled', 'Zrušené')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div
            role="tablist"
            aria-label={t('requests.title', 'Spolupráce')}
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
      ) : items.length === 0 ? (
        <div className="px-4 py-10 sm:py-14 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {tab === 'received' ? t('requests.emptyReceivedTitle', 'Žiadne prijaté žiadosti') : t('requests.emptySentTitle', 'Žiadne odoslané žiadosti')}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {tab === 'received' ? t('requests.emptyReceivedText', 'Zatiaľ ti nikto neposlal žiadosť. Keď niekto požiada o tvoju kartu alebo ti ponúkne pomoc, uvidíš to tu.') : t('requests.emptySentText', 'Zatiaľ si neodoslal žiadnu žiadosť. Prehliadaj karty iných a klikni na Požiadať alebo Ponúknuť.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-4">
          {items.map((it, index) => (
            <React.Fragment key={it.id}>
              {index > 0 && (
                <div
                  className="shrink-0 border-t border-gray-200 dark:border-gray-800"
                  aria-hidden
                />
              )}
              <RequestRow
                item={it}
                variant={tab}
                isBusy={busyId === it.id}
                onAccept={tab === 'received' ? () => void handleAction(it.id, 'accept') : undefined}
                onReject={tab === 'received' ? () => setPendingConfirm({ action: 'reject', id: it.id }) : undefined}
                onCancel={tab === 'sent' ? () => setPendingConfirm({ action: 'cancel', id: it.id }) : undefined}
                onHide={(it.status === 'cancelled' || it.status === 'rejected') ? () => setPendingConfirm({ action: 'hide', id: it.id }) : undefined}
                showCompletionActions={statusTab === 'active'}
                onRequestCompletion={statusTab === 'active' ? handleRequestCompletion : undefined}
                onConfirmCompletion={statusTab === 'active' ? handleConfirmCompletion : undefined}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {pendingConfirm && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setPendingConfirm(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-confirm-title"
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4">
              <h2 id="request-confirm-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                {pendingConfirm.action === 'reject'
                  ? t('requests.confirmRejectTitle', 'Odmietnuť žiadosť')
                  : pendingConfirm.action === 'cancel'
                    ? t('requests.confirmCancelTitle', 'Zrušiť žiadosť')
                    : t('requests.confirmHideTitle', 'Odstrániť zo zoznamu')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {pendingConfirm.action === 'reject'
                  ? t('requests.confirmRejectText', 'Naozaj chcete odmietnúť túto žiadosť? Odosielateľ o tom dostane oznámenie.')
                  : pendingConfirm.action === 'cancel'
                    ? t('requests.confirmCancelText', 'Naozaj chcete zrušiť túto žiadosť? Príjemca o tom dostane oznámenie.')
                    : t('requests.confirmHideText', 'Naozaj chcete odstrániť túto žiadosť zo zoznamu? Toto odstránenie je len pre vás a bude trvalé aj po odhlásení.')}
              </p>
              </div>
              <div className="px-6 space-y-3 pb-6">
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className="w-full py-3 text-base rounded-lg font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                {pendingConfirm.action === 'reject'
                  ? t('requests.reject', 'Odmietnúť')
                  : pendingConfirm.action === 'cancel'
                    ? t('requests.cancel', 'Zrušiť')
                    : t('common.delete', 'Odstrániť')}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  className="w-full py-3 text-base rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                >
                  {t('requests.confirmBack', 'Späť')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <AddReviewModal
        key={autoReviewOfferId ?? 'auto-review'}
        open={isAutoReviewOpen}
        onClose={() => {
          setIsAutoReviewOpen(false);
          setAutoReviewOfferId(null);
        }}
        reviewerName={reviewerName}
        reviewerAvatarUrl={reviewerAvatarUrl}
        reviewToEdit={null}
        onSubmit={async (rating, text, pros, cons) => {
          if (autoReviewOfferId == null) throw new Error('Chýba ID ponuky');
          if (rating === 0 || rating < 0 || rating > 5) {
            throw new Error('Prosím, vyber hodnotenie (hviezdičky).');
          }
          try {
            await api.post(endpoints.reviews.list(autoReviewOfferId), {
              rating: Number(rating),
              text: text.trim(),
              pros: pros.filter((p) => p.trim().length > 0),
              cons: cons.filter((c) => c.trim().length > 0),
            });
            setIsAutoReviewOpen(false);
            setAutoReviewOfferId(null);
            return { success: true };
          } catch (error: any) {
            const errorMessage =
              error?.response?.data?.error ||
              error?.response?.data?.rating?.[0] ||
              error?.response?.data?.pros?.[0] ||
              error?.response?.data?.cons?.[0] ||
              error?.response?.data?.text?.[0] ||
              error?.message ||
              'Nepodarilo sa pridať recenziu. Skús to znova.';
            throw new Error(errorMessage);
          }
        }}
      />
    </div>
  );
}


