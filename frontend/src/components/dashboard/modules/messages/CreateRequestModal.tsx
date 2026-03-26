'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { createSkillRequest, getApiErrorMessage } from '../requests/requestsApi';
import { sendMessage } from './messagingApi';

type OfferBrief = {
  id: number;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  is_seeking?: boolean;
};

function offerLabel(o: OfferBrief, fallback: string): string {
  const a = (o.subcategory || o.category || '').trim();
  const b = (o.description || '').trim();
  if (a && b) return `${a} — ${b}`;
  return a || b || fallback;
}

export function CreateRequestModal({
  open,
  conversationId,
  targetUserId,
  targetUserName,
  onClose,
  onCreated,
}: {
  open: boolean;
  conversationId: number;
  targetUserId: number;
  targetUserName: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<OfferBrief[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        setError(null);
        setOffersLoading(true);
        const { data } = await api.get(endpoints.dashboard.userSkills(targetUserId));
        const list = Array.isArray(data) ? data : [];
        const mapped: OfferBrief[] = list
          .map((x: any) => ({
            id: typeof x?.id === 'number' ? x.id : Number(x?.id),
            category: typeof x?.category === 'string' ? x.category : null,
            subcategory: typeof x?.subcategory === 'string' ? x.subcategory : null,
            description: typeof x?.description === 'string' ? x.description : null,
            is_seeking: x?.is_seeking === true,
          }))
          .filter((x: OfferBrief) => Number.isFinite(x.id) && x.id >= 1);
        if (!cancelled) {
          setOffers(mapped);
          setSelectedOfferId(mapped[0]?.id ?? '');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setOffers([]);
          setSelectedOfferId('');
          setError(
            getApiErrorMessage(e, t('requests.loadOffersFailed', 'Nepodarilo sa načítať karty používateľa.')),
          );
        }
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetUserId, t]);

  const canSubmit = useMemo(() => {
    const hasOffer = typeof selectedOfferId === 'number' && Number.isFinite(selectedOfferId) && selectedOfferId >= 1;
    const hasNote = note.trim().length > 0;
    return hasOffer && hasNote && !submitting;
  }, [note, selectedOfferId, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const offerId = selectedOfferId as number;
      await createSkillRequest(offerId);

      // DM správy zostávajú voľné – túto poznámku pošleme ako bežnú správu do chatu.
      // Request objekt ostáva samostatný marketplace objekt.
      try {
        const prefix = t('requests.createdPrefix', 'Žiadosť:');
        await sendMessage(conversationId, `${prefix} ${note.trim()}`);
      } catch {
        // ignore message failure – request bol vytvorený
      }

      toast.success(t('requests.createdSuccess', 'Žiadosť bola vytvorená'));
      onClose();
      onCreated?.();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('requests.createFailed', 'Vytvorenie žiadosti zlyhalo.')));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={t('requests.createFromChat', 'Vytvoriť žiadosť')}
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {t('requests.createTitle', 'Vytvoriť žiadosť')}
                </div>
                <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {t('requests.createSubtitle', 'Pre')}{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{targetUserName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                aria-label={t('common.close', 'Zavrieť')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('requests.pickOffer', 'Vyber kartu')}
              </div>
              {offersLoading ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('common.loading', 'Načítavam…')}</div>
              ) : offers.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('requests.noOffers', 'Používateľ nemá žiadne karty.')}
                </div>
              ) : (
                <select
                  value={selectedOfferId}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSelectedOfferId(Number.isFinite(v) ? v : '');
                  }}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {offerLabel(o, t('requests.offerFallback', 'Karta'))}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('requests.note', 'Správa / opis požiadavky')}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                placeholder={t('requests.notePlaceholder', 'Stručne popíš, čo potrebuješ…')}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : null}
          </div>

          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#141416] transition-colors"
              disabled={submitting}
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 rounded-2xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
            >
              {submitting ? t('common.sending', 'Odosielam…') : t('requests.create', 'Vytvoriť')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('app-root') ?? document.body,
  );
}

