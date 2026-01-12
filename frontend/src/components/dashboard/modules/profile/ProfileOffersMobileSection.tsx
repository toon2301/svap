'use client';
 
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, endpoints } from '../../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import type { Offer, ExperienceUnit } from './profileOffersTypes';
import { HOURS_DAYS } from './profileOffersTypes';
import { ProfileOfferDetailMobile } from './ProfileOfferDetailMobile';
import { ProfileOpeningHoursMobileModal } from './ProfileOpeningHoursMobileModal';
import { ProfileOfferCardMobile } from './ProfileOfferCardMobile';
import {
  getOffersFromCache,
  makeOffersCacheKey,
  setOffersToCache,
  getOrCreateOffersRequest,
} from './profileOffersCache';

interface ProfileOffersMobileSectionProps {
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  highlightedSkillId?: number | null;
  isOtherUserProfile?: boolean;
}

export default function ProfileOffersMobileSection({
  accountType = 'personal',
  ownerUserId,
  highlightedSkillId,
  isOtherUserProfile = false,
}: ProfileOffersMobileSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [hoursModal, setHoursModal] = useState<OpeningHours | null>(null);
  const [tappedCards, setTappedCards] = useState<Set<number | string>>(() => new Set());
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const cacheKey = makeOffersCacheKey(ownerUserId);
        const cached = getOffersFromCache(cacheKey);
        if (cached) {
          setOffers(cached);
          return;
        }

        // Request deduplication - použij existujúci in-flight request alebo vytvor nový
        const endpoint = ownerUserId
          ? endpoints.dashboard.userSkills(ownerUserId)
          : endpoints.skills.list;

        const mappedOffers = await getOrCreateOffersRequest(cacheKey, async () => {
          const { data } = await api.get(endpoint);
          const list = Array.isArray(data) ? data : [];
          return list.map((s: any) => {
            const rawPrice = s.price_from;
            const parsedPrice =
              typeof rawPrice === 'number'
                ? rawPrice
                : typeof rawPrice === 'string' && rawPrice.trim() !== ''
                  ? parseFloat(rawPrice)
                  : null;

            const experience = s.experience
              ? {
                  value:
                    typeof s.experience.value === 'number'
                      ? s.experience.value
                      : parseFloat(String(s.experience.value || 0)),
                  unit: (s.experience.unit === 'years' || s.experience.unit === 'months'
                    ? s.experience.unit
                    : 'years') as ExperienceUnit,
                }
              : undefined;

            return {
              id: s.id,
              category: s.category,
              subcategory: s.subcategory,
              description: s.description || '',
              detailed_description: (s.detailed_description || '') as string,
              images: Array.isArray(s.images)
                ? s.images.map((im: any) => ({
                    id: im.id,
                    image_url: im.image_url || im.image || null,
                    order: im.order,
                  }))
                : [],
              price_from: parsedPrice,
              price_currency:
                typeof s.price_currency === 'string' && s.price_currency.trim() !== ''
                  ? s.price_currency
                  : '€',
              district: typeof s.district === 'string' ? s.district : '',
              location: typeof s.location === 'string' ? s.location : '',
              experience,
              tags: Array.isArray(s.tags) ? s.tags : [],
              opening_hours: (s.opening_hours || undefined) as OpeningHours | undefined,
              is_seeking: s.is_seeking === true,
              urgency:
                typeof s.urgency === 'string' && s.urgency.trim() !== ''
                  ? (s.urgency.trim() as 'low' | 'medium' | 'high' | '')
                  : '',
              duration_type: s.duration_type || null,
            };
          });
        });

        if (cancelled) return;

        setOffers(mappedOffers);
        setOffersToCache(cacheKey, mappedOffers);
        setIsLoading(false);
      } catch (error: any) {
        if (cancelled) return;
        const msg =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          t('profile.offersLoadError', 'Nepodarilo sa načítať ponuky. Skús to znova.');
        setLoadError(msg);
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUserId]); // t je prekladová funkcia, ktorá sa nemení v tejto logike

  // Po načítaní ponúk a nastavení highlightedSkillId poscrolluj na danú kartu
  // Scroll len ak je highlightedSkillId nastavený (pri prvom zvýraznení)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!highlightedSkillId) return; // Scroll len ak je zvýraznenie aktívne
    if (!highlightedCardRef.current) return;
    if (offers.length === 0) return; // Čakaj na načítanie ponúk

    try {
      highlightedCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // ignore
    }
  }, [highlightedSkillId, offers]);

  const handleCardClick = (offer: Offer) => {
    const cardId = offer.id ?? `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
    const isTapped = tappedCards.has(cardId);

    // Ak text "Ponúkam" ešte nie je skrytý, skry ho
    if (!isTapped) {
      setTappedCards(prev => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
    } else {
      // Ak je text už skrytý, otvor detail modal a resetuj tappedCards
      setSelectedOffer(offer);
      setTappedCards(new Set()); // Resetuj všetky tapped karty
    }
  };

  const handleDetailClose = () => {
    setSelectedOffer(null);
    setHoursModal(null);
    setTappedCards(new Set()); // Resetuj všetky tapped karty
  };

  if (isLoading && offers.length === 0) {
    return (
      <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t('profile.offersLoading', 'Načítavam tvoje karty...')}
      </div>
    );
  }

  if (loadError && offers.length === 0) {
    return (
      <div className="mt-3 text-sm text-red-600 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  const renderHoursModal = () => {
    if (!hoursModal || typeof document === 'undefined') return null;

    const hasAny = HOURS_DAYS.some((d) => {
      const data = hoursModal[d.key as keyof OpeningHours];
      return data && (data as any).enabled;
    });

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[70] bg-black/45"
          onClick={() => setHoursModal(null)}
        />
        <div
          className="fixed inset-0 z-[71] flex items-center justify-center px-4"
          onClick={() => setHoursModal(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-gray-200 dark:border-gray-700 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm font-semibold">
                  {t('skills.openingHours.title', 'Otváracie hodiny')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHoursModal(null)}
                aria-label={t('common.close', 'Zatvoriť')}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-xl bg-gray-50/80 dark:bg-[#101012] border border-gray-200/70 dark:border-gray-700/60 px-3 py-2 space-y-1 max-h-64 overflow-y-auto subtle-scrollbar">
              {hasAny ? (
                HOURS_DAYS.map((day) => {
                  const data = hoursModal[day.key as keyof OpeningHours] as any;
                  if (!data || !data.enabled) return null;
                  return (
                    <div
                      key={day.key}
                      className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200"
                    >
                      <span className="font-medium w-10">{day.shortLabel}</span>
                      <span className="tabular-nums">
                        {data.from || '—'} – {data.to || '—'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  {t(
                    'skills.openingHours.empty',
                    'Otváracie hodiny zatiaľ nie sú nastavené alebo je prevádzka zatvorená.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>,
      document.getElementById('app-root') ?? document.body
    );
  };

  return (
    <>
      <div className="mt-3 space-y-3">
        {offers.map((offer) => {
          const cardId = offer.id ?? `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
          const isTapped = tappedCards.has(cardId);
          const isHighlighted = highlightedSkillId != null && offer.id === highlightedSkillId;

          return (
            <div
              key={offer.id}
              ref={isHighlighted ? highlightedCardRef : undefined}
            >
              <ProfileOfferCardMobile
                offer={offer}
                accountType={accountType}
                isTapped={isTapped}
                isHighlighted={isHighlighted}
                onCardClick={() => handleCardClick(offer)}
                isOtherUserProfile={isOtherUserProfile}
              />
            </div>
          );
        })}
      </div>

      <ProfileOfferDetailMobile
        offer={selectedOffer}
        accountType={accountType}
        onClose={handleDetailClose}
        onShowHours={(hours) => setHoursModal(hours)}
      />
      <ProfileOpeningHoursMobileModal
        hours={hoursModal}
        onClose={() => setHoursModal(null)}
      />
    </>
  );
}


