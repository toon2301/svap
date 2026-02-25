'use client';
 
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
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
import { fetchSkillRequests, getApiErrorMessage, updateSkillRequest } from '../requests/requestsApi';

interface ProfileOffersMobileSectionProps {
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  /** Meno/názov majiteľa profilu (kvôli recenziám v URL). */
  ownerDisplayName?: string;
  highlightedSkillId?: number | null;
  isOtherUserProfile?: boolean;
}

export default function ProfileOffersMobileSection({
  accountType = 'personal',
  ownerUserId,
  ownerDisplayName,
  highlightedSkillId,
  isOtherUserProfile = false,
}: ProfileOffersMobileSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requestStatusByOfferId, setRequestStatusByOfferId] = useState<Record<number, string>>({});
  const [requestIdByOfferId, setRequestIdByOfferId] = useState<Record<number, number>>({});
  const [busyOfferId, setBusyOfferId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [hoursModal, setHoursModal] = useState<OpeningHours | null>(null);
  const [tappedCards, setTappedCards] = useState<Set<number | string>>(() => new Set());
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);

  const isOfferStillAvailable = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile || !ownerUserId) return true;
      try {
        const endpoint = endpoints.dashboard.userSkills(ownerUserId);
        const { data } = await api.get(endpoint);
        const list = Array.isArray(data) ? data : [];
        return list.some((s: any) => s && typeof s.id === 'number' && s.id === offerId);
      } catch {
        return true;
      }
    },
    [isOtherUserProfile, ownerUserId],
  );

  const checkOfferStillAvailable = useCallback(
    async (offerId: number) => {
      const ok = await isOfferStillAvailable(offerId);
      if (!ok) setIsUnavailableModalOpen(true);
    },
    [isOfferStillAvailable],
  );

  const resolvePendingRequestIdForOffer = useCallback(
    async (offerId: number): Promise<number | null> => {
      const fromMap = requestIdByOfferId[offerId];
      if (typeof fromMap === 'number' && Number.isFinite(fromMap) && fromMap >= 1) return fromMap;
      try {
        const res = await fetchSkillRequests();
        const match = res.sent.find((r) => r && r.offer === offerId && r.status === 'pending');
        if (match && typeof match.id === 'number' && Number.isFinite(match.id) && match.id >= 1) {
          setRequestIdByOfferId((prev) => ({ ...prev, [offerId]: match.id }));
          return match.id;
        }
      } catch {
        // ignore
      }
      return null;
    },
    [requestIdByOfferId],
  );

  const handleRequestClick = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile) return;
      if (busyOfferId === offerId) return;
      const current = requestStatusByOfferId[offerId];
      if (current === 'accepted') return;

      if (current === 'pending') {
        setBusyOfferId(offerId);
        try {
          const requestId = await resolvePendingRequestIdForOffer(offerId);
          if (!requestId) {
            toast.error(t('requests.toastCancelFailed', 'Zrušenie žiadosti zlyhalo.'));
            return;
          }
          await updateSkillRequest(requestId, 'cancel');
          setRequestStatusByOfferId((prev) => ({ ...prev, [offerId]: '' }));
          setRequestIdByOfferId((prev) => {
            const next = { ...prev };
            delete next[offerId];
            return next;
          });
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, t('requests.toastCancelFailed', 'Zrušenie žiadosti zlyhalo.')));
        } finally {
          setBusyOfferId(null);
        }
        return;
      }

      const ok = await isOfferStillAvailable(offerId);
      if (!ok) {
        setIsUnavailableModalOpen(true);
        return;
      }

      try {
        setBusyOfferId(offerId);
        const { data } = await api.post(endpoints.requests.list, { offer_id: offerId });
        setRequestStatusByOfferId((prev) => ({ ...prev, [offerId]: 'pending' }));
        const createdId = data?.id != null ? Number(data.id) : NaN;
        if (Number.isFinite(createdId) && createdId >= 1) {
          setRequestIdByOfferId((prev) => ({ ...prev, [offerId]: createdId }));
        }
      } catch {
        // fail-open
      } finally {
        setBusyOfferId(null);
      }
    },
    [
      isOtherUserProfile,
      isOfferStillAvailable,
      requestStatusByOfferId,
      busyOfferId,
      resolvePendingRequestIdForOffer,
      t,
    ],
  );

  // Load offers function (použitá pre prvotné načítanie aj polling)
  const loadOffers = useCallback(async (skipCache = false, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setLoadError(null);
      const cacheKey = makeOffersCacheKey(ownerUserId);
      
      // Ak nie je skipCache, skús najprv cache
      if (!skipCache) {
        const cached = getOffersFromCache(cacheKey);
        if (cached) {
          setOffers(cached);
          if (showLoading) {
            setIsLoading(false);
          }
          return;
        }
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
            is_hidden: s.is_hidden === true,
            average_rating: s.average_rating,
            reviews_count: s.reviews_count,
          };
        });
      });

      setOffers(mappedOffers);
      setOffersToCache(cacheKey, mappedOffers);
      if (showLoading) {
        setIsLoading(false);
      }
    } catch (error: any) {
      // Ak je to "Request in cooldown period" chyba, ignoruj ju a zobraz prázdny zoznam
      // (toto sa môže stať pri F5 refresh, keď lastRequestTime Map zostane v pamäti)
      if (error?.message === 'Request in cooldown period') {
        setOffers([]);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
      
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        t('profile.offersLoadError', 'Nepodarilo sa načítať ponuky. Skús to znova.');
      setLoadError(msg);
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [ownerUserId, t]);

  // Load offers on mount
  useEffect(() => {
    void loadOffers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUserId]); // loadOffers je memoized

  // Polling každých 20 sekúnd
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Pri polling-u preskočíme cache a neukazujeme loading, aby sa nebliklo UI
      void loadOffers(true, false);
    }, 20000); // 20 sekúnd

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUserId]); // loadOffers je memoized

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

  // Na cudzom profile: načítaj statusy žiadostí pre aktuálne ponuky (rovnako ako desktop)
  useEffect(() => {
    if (!isOtherUserProfile) return;
    const ids = offers.map((o) => o.id).filter((id): id is number => typeof id === 'number');
    if (ids.length === 0) return;
    void (async () => {
      try {
        const res = await api.get(endpoints.requests.status, { params: { offer_ids: ids.join(',') } });
        const data = res?.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : {};
        const requestIdsRaw =
          data.request_ids && typeof data.request_ids === 'object'
            ? (data.request_ids as Record<string, unknown>)
            : {};
        const normalized: Record<number, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (k === 'request_ids') return;
          const n = Number(k);
          if (Number.isFinite(n) && typeof v === 'string') normalized[n] = v;
        });
        setRequestStatusByOfferId(normalized);
        const ridMap: Record<number, number> = {};
        Object.entries(requestIdsRaw).forEach(([k, v]) => {
          const n = Number(k);
          const id = typeof v === 'number' ? v : Number(v);
          if (Number.isFinite(n) && Number.isFinite(id) && id >= 1) ridMap[n] = id;
        });
        setRequestIdByOfferId(ridMap);
      } catch {
        // ignore
      }
    })();
  }, [offers, isOtherUserProfile]);

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
    return (
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {isOtherUserProfile 
          ? t('profile.noOffersOther', 'Zatiaľ nemá žiadne ponuky.')
          : t('profile.noOffers', 'Zatiaľ nemáš žiadne ponuky.')
        }
      </div>
    );
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
                ownerDisplayName={ownerDisplayName}
                onRequestClick={handleRequestClick}
                onMessageClick={checkOfferStillAvailable}
                requestLabel={(() => {
                  const defaultRequest = offer.is_seeking ? t('requests.offer', 'Ponúknuť') : t('requests.request', 'Požiadať');
                  if (typeof offer.id !== 'number') return defaultRequest;
                  const raw = requestStatusByOfferId[offer.id];
                  const st = raw === 'pending' || raw === 'accepted' || raw === 'rejected' || raw === 'cancelled' ? raw : '';
                  if (st === 'accepted') return t('requests.statusAccepted', 'Prijaté');
                  if (st === 'pending') {
                    // Ak používateľ hľadá (is_seeking), po kliknutí na "Ponúknuť" → "Ponúknuté"
                    // Ak používateľ ponúka (nie is_seeking), po kliknutí na "Požiadať" → "Požiadané"
                    return offer.is_seeking
                      ? t('requests.offered', 'Ponúknuté')
                      : t('requests.requested', 'Požiadané');
                  }
                  if (st === 'rejected') return t('requests.statusRejected', 'Odmietnuté');
                  if (st === 'cancelled') return t('requests.statusCancelled', 'Zrušené');
                  return defaultRequest;
                })()}
                isRequestDisabled={(() => {
                  if (typeof offer.id !== 'number') return false;
                  const raw = requestStatusByOfferId[offer.id];
                  const st = raw === 'pending' || raw === 'accepted' || raw === 'rejected' || raw === 'cancelled' ? raw : '';
                  return st === 'accepted' || busyOfferId === offer.id;
                })()}
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

      {isUnavailableModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[80] bg-black/45"
              onClick={() => setIsUnavailableModalOpen(false)}
            />
            <div
              className="fixed inset-0 z-[81] flex items-center justify-center px-4"
              onClick={() => setIsUnavailableModalOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Karta nie je dostupná
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Táto karta už nie je dostupná.
                  </p>
                  <button
                    onClick={() => setIsUnavailableModalOpen(false)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Rozumiem
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.getElementById('app-root') ?? document.body,
        )}
    </>
  );
}


