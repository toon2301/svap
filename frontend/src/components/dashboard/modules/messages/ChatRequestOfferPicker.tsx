'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import type { Offer } from '../profile/profileOffersTypes';
import { ChatOfferPreviewCard } from './ChatOfferPreviewCard';

function mapOffer(value: any): Offer | null {
  const id = typeof value?.id === 'number' ? value.id : Number(value?.id);
  if (!Number.isFinite(id) || id < 1) {
    return null;
  }

  return {
    id,
    category: typeof value?.category === 'string' ? value.category : '',
    subcategory: typeof value?.subcategory === 'string' ? value.subcategory : '',
    description: typeof value?.description === 'string' ? value.description : '',
    detailed_description:
      typeof value?.detailed_description === 'string' ? value.detailed_description : undefined,
    images: Array.isArray(value?.images)
      ? value.images
          .map((image: any, index: number) => ({
            id:
              typeof image?.id === 'number'
                ? image.id
                : Number.isFinite(Number(image?.id))
                  ? Number(image.id)
                  : index,
            image_url: typeof image?.image_url === 'string' ? image.image_url : null,
            image: typeof image?.image === 'string' ? image.image : null,
            order: typeof image?.order === 'number' ? image.order : index,
          }))
          .filter((image: { image_url: string | null; image: string | null }) =>
            Boolean(image.image_url || image.image))
      : [],
    price_from:
      typeof value?.price_from === 'number'
        ? value.price_from
        : Number.isFinite(Number(value?.price_from))
          ? Number(value.price_from)
          : null,
    price_currency: typeof value?.price_currency === 'string' ? value.price_currency : undefined,
    district: typeof value?.district === 'string' ? value.district : undefined,
    location: typeof value?.location === 'string' ? value.location : undefined,
    experience:
      value?.experience &&
      typeof value.experience?.value === 'number' &&
      (value.experience?.unit === 'years' || value.experience?.unit === 'months')
        ? {
            value: value.experience.value,
            unit: value.experience.unit,
          }
        : undefined,
    is_seeking: value?.is_seeking === true,
    is_hidden: value?.is_hidden === true,
  };
}

export function ChatRequestOfferPicker({
  open,
  disabled = false,
  isMobile,
  pairWithComposerBelow = false,
  className = '',
  targetUserId,
  targetUserSlug = null,
  targetUserType = null,
  onToggle,
}: {
  open: boolean;
  disabled?: boolean;
  isMobile: boolean;
  /** Desktop: spodný okraj pickera je „zlepený“ s composerom (jeden rám okolo oboch). */
  pairWithComposerBelow?: boolean;
  className?: string;
  targetUserId: number | null;
  targetUserSlug?: string | null;
  targetUserType?: string | null;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<number | null>(null);
  const pendingNavigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingNavigationTimerRef.current) {
      clearTimeout(pendingNavigationTimerRef.current);
      pendingNavigationTimerRef.current = null;
    }
    setOffers([]);
    setError(null);
    setHasLoaded(false);
    setPendingOfferId(null);
  }, [targetUserId]);

  useEffect(() => {
    return () => {
      if (pendingNavigationTimerRef.current) {
        clearTimeout(pendingNavigationTimerRef.current);
        pendingNavigationTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || disabled || !targetUserId || hasLoaded) return;

    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get(endpoints.dashboard.userSkills(targetUserId));
        const list = Array.isArray(data) ? data : [];
        const mapped = list
          .map(mapOffer)
          .filter((offer): offer is Offer => offer !== null)
          .filter((offer) => offer.is_seeking !== true);

        if (cancelled) return;
        setOffers(mapped);
        setHasLoaded(true);
      } catch {
        if (cancelled) return;
        setError(
          t(
            'requests.loadOffersFailed',
            'Nepodarilo sa nacitat ponuky pouzivatela. Skus to znova.',
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disabled, hasLoaded, open, t, targetUserId]);

  const accountType = targetUserType === 'business' ? 'business' : 'personal';
  const panelId = useMemo(
    () => `chat-request-offer-picker-${targetUserId ?? 'unknown'}`,
    [targetUserId],
  );

  const navigateToOffer = useCallback(
    (offerId: number) => {
      const fallbackIdentifier = targetUserId != null ? String(targetUserId) : '';
      const identifier = (targetUserSlug || '').trim() || fallbackIdentifier;
      if (!identifier) return;

      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
        window.dispatchEvent(
          new CustomEvent('goToUserProfile', {
            detail: { identifier, highlightId: offerId },
          }),
        );
        return;
      }

      router.push(
        `/dashboard/users/${encodeURIComponent(identifier)}?highlight=${encodeURIComponent(
          String(offerId),
        )}`,
      );
    },
    [router, targetUserId, targetUserSlug],
  );

  const handleOfferSelect = useCallback(
    (offerId: number) => {
      if (pendingOfferId !== null) return;

      setPendingOfferId(offerId);
      pendingNavigationTimerRef.current = setTimeout(() => {
        pendingNavigationTimerRef.current = null;
        navigateToOffer(offerId);
      }, 160);
    },
    [navigateToOffer, pendingOfferId],
  );

  const hasOffers = offers.length > 0;
  const showPanel = open && !disabled;

  const shellClassName = pairWithComposerBelow
    ? [
        'overflow-hidden rounded-none border-0 shadow-none backdrop-blur-none',
        disabled ? 'bg-gray-100/90 dark:bg-[#141416]' : 'bg-transparent',
      ].join(' ')
    : [
        'overflow-hidden rounded-[1.75rem] border shadow-sm backdrop-blur',
        disabled
          ? 'border-gray-200 bg-gray-100/80 dark:border-gray-800 dark:bg-[#141416]'
          : 'border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-[#0f0f10]/90',
      ].join(' ');

  return (
    <div className={`w-full shrink-0 ${className}`}>
      <div className={shellClassName}>
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showPanel
              ? 'max-h-[min(36rem,calc(100dvh-12rem))] opacity-100'
              : 'max-h-0 opacity-0'
          }`}
          aria-hidden={!showPanel}
        >
          <div
            id={panelId}
            data-testid="chat-request-offer-picker-panel"
            className={`p-3 ${showPanel ? 'border-b border-gray-200 dark:border-gray-800' : ''} ${
              isMobile
                ? 'flex max-h-[min(34rem,calc(100dvh-13rem))] min-h-0 flex-col'
                : ''
            }`}
          >
          <div className="mb-3 min-w-0 shrink-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('requests.pickOffer', 'Vyber ponuku')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t(
                'requests.chatProfileRedirectHint',
                'Klikni na kartu a otvori sa profil s oznacenou ponukou.',
              )}
            </div>
          </div>

          {loading ? (
            <div
              className={
                isMobile
                  ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pb-1 elegant-scrollbar'
                  : 'grid gap-3 pb-1 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]'
              }
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className={
                    isMobile ? 'w-full min-w-0 shrink-0' : 'flex min-w-0 justify-center'
                  }
                >
                  <div
                    className={`animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-[#151517] ${
                      isMobile ? 'h-[18rem] w-full' : 'h-[20rem] w-full max-w-[18rem]'
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          ) : !hasOffers ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-[#141416] dark:text-gray-300">
              {t(
                'requests.chatNoRequestableOffers',
                'Pouzivatel momentalne nema ziadne aktivne ponuky, z ktorych by sa dala vytvorit ziadost.',
              )}
            </div>
          ) : (
            <div
              className={
                isMobile
                  ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pb-1 elegant-scrollbar'
                  : 'grid gap-3 pb-1 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]'
              }
            >
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={
                    isMobile ? 'w-full min-w-0 shrink-0' : 'flex min-w-0 justify-center'
                  }
                >
                  <div className={isMobile ? 'w-full' : 'w-full max-w-[18rem]'}>
                    <ChatOfferPreviewCard
                      offer={offer}
                      accountType={accountType}
                      selected={pendingOfferId === offer.id}
                      onSelect={handleOfferSelect}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        <button
          type="button"
          data-testid="chat-request-offer-picker-toggle"
          onClick={onToggle}
          disabled={disabled}
          aria-expanded={showPanel}
          aria-controls={panelId}
          className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
            disabled
              ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
              : 'text-gray-900 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
          }`}
        >
          <div className="min-w-0 text-sm font-semibold">
            {t('requests.createFromChat', 'Vytvoriť žiadosť z ponuky')}
          </div>
          {showPanel ? (
            <ChevronDownIcon className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ChevronUpIcon className="h-5 w-5 flex-shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
}
