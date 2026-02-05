'use client';
 
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, endpoints } from '../../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';
import type { ProfileTab } from './profileTypes';
import type { Offer, ExperienceUnit } from './profileOffersTypes';
import { HOURS_DAYS } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import ProfileOfferCard from './ProfileOfferCard';
import {
  getOffersFromCache,
  makeOffersCacheKey,
  setOffersToCache,
  getOrCreateOffersRequest,
} from './profileOffersCache';
import { fetchSkillRequests, getApiErrorMessage, updateSkillRequest } from '../requests/requestsApi';

interface ProfileOffersSectionProps {
  activeTab: ProfileTab;
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  highlightedSkillId?: number | null;
  isOtherUserProfile?: boolean;
}

export default function ProfileOffersSection({
  activeTab,
  accountType = 'personal',
  ownerUserId,
  highlightedSkillId,
  isOtherUserProfile = false,
}: ProfileOffersSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requestStatusByOfferId, setRequestStatusByOfferId] = useState<Record<number, string>>({});
  const [requestIdByOfferId, setRequestIdByOfferId] = useState<Record<number, number>>({});
  const [busyOfferId, setBusyOfferId] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number | string>>(() => new Set());
  const [activeHoursOfferId, setActiveHoursOfferId] = useState<number | string | null>(null);
  const [hoursPopoverPosition, setHoursPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeOpeningHours, setActiveOpeningHours] = useState<OpeningHours | null>(null);
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);

  const isOfferStillAvailable = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile || !ownerUserId) return true;

      try {
        const endpoint = endpoints.dashboard.userSkills(ownerUserId);
        const { data } = await api.get(endpoint);
        const list = Array.isArray(data) ? data : [];
        const exists = list.some((s: any) => s && typeof s.id === 'number' && s.id === offerId);
        return exists;
      } catch {
        // Ak sa nepodarí overiť dostupnosť, necháme to bez hlášky (bezpečné minimum).
      }

      return true;
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

      // Fallback (bezpečné): načítaj odoslané žiadosti a nájdi pending pre danú kartu.
      try {
        const res = await fetchSkillRequests();
        const match = res.sent.find((r) => r && r.offer === offerId && r.status === 'pending');
        if (match && typeof match.id === 'number' && Number.isFinite(match.id) && match.id >= 1) {
          setRequestIdByOfferId((prev) => ({ ...prev, [offerId]: match.id }));
          return match.id;
        }
      } catch {
        // ignore - chybu ukážeme vyššie pri samotnom zrušení
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

      // Ak je pending, klik znamená zrušenie žiadosti.
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
    [isOtherUserProfile, isOfferStillAvailable, requestStatusByOfferId, busyOfferId, resolvePendingRequestIdForOffer, t],
  );

  // Load offers function (použitá pre prvotné načítanie aj polling)
  const loadOffers = useCallback(async (skipCache = false) => {
    try {
      setLoadError(null);
      const cacheKey = makeOffersCacheKey(ownerUserId);
      
      // Ak nie je skipCache, skús najprv cache
      if (!skipCache) {
        const cached = getOffersFromCache(cacheKey);
        if (cached) {
          setOffers(cached);
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
          };
        });
      });

      setOffers(mappedOffers);
      setOffersToCache(cacheKey, mappedOffers);
    } catch (error: any) {
      // Pri 429 ponechaj posledné ponuky (z cache alebo prázdne) a zobraz jemnú hlášku
      if (error?.response?.status === 429) {
        setLoadError(
          t(
            'profile.offersRateLimited',
            'Príliš veľa požiadaviek pri načítavaní ponúk, skúste to o chvíľu.',
          ),
        );
      }
    }
  }, [ownerUserId, t]);

  // Load offers when switching to 'offers' tab (desktop focus)
  useEffect(() => {
    if (activeTab !== 'offers') return;

    void loadOffers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ownerUserId]); // loadOffers je memoized

  // Polling každých 20 sekúnd keď je tab aktívny
  useEffect(() => {
    if (activeTab !== 'offers') return;

    const intervalId = setInterval(() => {
      // Pri polling-u preskočíme cache, aby sme získali najnovšie dáta
      void loadOffers(true);
    }, 20000); // 20 sekúnd

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ownerUserId]); // loadOffers je memoized

  // Close hours popover when clicking outside
  useEffect(() => {
    if (!activeHoursOfferId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Ignore clicks inside the popover
      if (target.closest('[data-opening-hours-popover]')) {
        return;
      }
      setActiveHoursOfferId(null);
      setHoursPopoverPosition(null);
      setActiveOpeningHours(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHoursOfferId]);

  // Po načítaní ponúk a nastavení highlightedSkillId poscrolluj na danú kartu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!highlightedCardRef.current) return;

    try {
      highlightedCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // ignore scroll errors
    }
  }, [offers]);

  // Na cudzom profile: načítaj statusy "požiadané" pre aktuálne ponuky (batch)
  useEffect(() => {
    if (!isOtherUserProfile) return;

    const ids = offers
      .map((o) => o.id)
      .filter((id): id is number => typeof id === 'number');

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

  if (activeTab !== 'offers') {
    return null;
  }

  return (
    <div className="mt-4">
      {offers.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {loadError ?? t('profile.noOffers', 'Zatiaľ nemáš žiadne ponuky.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
          {offers.map((offer) => {
            const cardId =
              offer.id ??
              `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
            const isFlipped = flippedCards.has(cardId);

            const handleToggleFlip = () => {
              setFlippedCards((prev) => {
                const next = new Set(prev);
                if (next.has(cardId)) {
                  next.delete(cardId);
                } else {
                  next.add(cardId);
                }
                return next;
              });
            };

            const handleOpenHoursClick = (event: React.MouseEvent<HTMLButtonElement>) => {
              if (!offer.opening_hours) return;

              const hasAnyEnabled = Object.values(offer.opening_hours).some(
                (day) => day && (day as any).enabled,
              );
              if (!hasAnyEnabled) return;

              if (activeHoursOfferId === cardId) {
                setActiveHoursOfferId(null);
                setHoursPopoverPosition(null);
                setActiveOpeningHours(null);
              } else {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const isMobile = viewportWidth <= 640; // sm breakpoint

                let top: number;
                let left: number;

                if (isMobile) {
                  // Na mobile: center modal
                  const popoverWidth = Math.min(viewportWidth - 32, 320); // max 320px, s paddingom 16px na každú stranu
                  const popoverHeight = 180; // zmenšená výška pre mobile
                  top = (viewportHeight - popoverHeight) / 2;
                  left = (viewportWidth - popoverWidth) / 2;
                } else {
                  // Na desktop: pozícia relatívne k tlačidlu
                  const rect = event.currentTarget.getBoundingClientRect();
                  const popoverWidth = 260;
                  const popoverHeight = 200;

                  top = rect.bottom + 8;
                  left = rect.left + rect.width / 2 - popoverWidth / 2;

                  // Ak by popover pretiekol dole, zobraz ho nad tlačidlom
                  if (top + popoverHeight > viewportHeight - 8) {
                    top = rect.top - popoverHeight - 8;
                  }
                  if (top < 8) top = 8;

                  // Horizontálne ohraničenie
                  if (left + popoverWidth > viewportWidth - 8) {
                    left = viewportWidth - popoverWidth - 8;
                  }
                  if (left < 8) left = 8;
                }

                setActiveHoursOfferId(cardId);
                setHoursPopoverPosition({ top, left });
                setActiveOpeningHours(offer.opening_hours);
              }
            };

            const isHighlighted = highlightedSkillId != null && offer.id === highlightedSkillId;

            return (
              <div
                key={offer.id}
                ref={isHighlighted ? highlightedCardRef : undefined}
                className="relative group"
              >
                <ProfileOfferCard
                  offer={offer}
                  accountType={accountType}
                  t={t}
                  isFlipped={isFlipped}
                  onToggleFlip={handleToggleFlip}
                  onOpenHoursClick={accountType === 'business' ? handleOpenHoursClick : undefined}
                  isHighlighted={isHighlighted}
                  isOtherUserProfile={isOtherUserProfile}
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
      )}

      {loadError && offers.length > 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {loadError}
        </p>
      )}

      {activeHoursOfferId && hoursPopoverPosition && activeOpeningHours &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/40 sm:bg-black/20"
              onClick={() => {
                setActiveHoursOfferId(null);
                setHoursPopoverPosition(null);
                setActiveOpeningHours(null);
              }}
            />
            <div
              data-opening-hours-popover
              className="fixed z-[9999] w-[calc(100vw-2rem)] max-w-xs sm:w-64 sm:max-w-xs rounded-2xl bg-white dark:bg-[#050507] border border-gray-200/70 dark:border-gray-700/60 shadow-xl p-2.5 sm:p-3"
              style={{ top: hoursPopoverPosition.top, left: hoursPopoverPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5 sm:w-4 sm:h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('skills.openingHours.title', 'Otváracie hodiny')}
                  </div>
                </div>
                {/* Tlačidlo na zatvorenie na mobile */}
                <button
                  onClick={() => {
                    setActiveHoursOfferId(null);
                    setHoursPopoverPosition(null);
                    setActiveOpeningHours(null);
                  }}
                  className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0"
                  aria-label="Zatvoriť"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="rounded-xl bg-gray-50/80 dark:bg-[#101012] border border-gray-200/70 dark:border-gray-700/60 px-3 sm:px-3 py-1.5 sm:py-2 max-h-20 sm:max-h-48 overflow-y-auto subtle-scrollbar">
                {HOURS_DAYS.map((day) => {
                  const data = activeOpeningHours[day.key];
                  if (!data || !data.enabled) return null;

                  return (
                    <div
                      key={day.key}
                      className="flex items-center justify-between text-sm sm:text-xs text-gray-700 dark:text-gray-200 py-0.5 sm:py-0.5"
                    >
                      <span className="font-medium w-12 sm:w-10">{day.shortLabel}</span>
                      <span className="tabular-nums text-right">
                        {data.from || '—'} – {data.to || '—'}
                      </span>
                    </div>
                  );
                })}
                {!HOURS_DAYS.some((d) => {
                  const data = activeOpeningHours[d.key];
                  return data && data.enabled;
                }) && (
                  <div className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 text-center py-2 sm:py-1.5">
                    {t(
                      'skills.openingHours.empty',
                      'Otváracie hodiny zatiaľ nie sú nastavené alebo je prevádzka zatvorená.'
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.getElementById('app-root') ?? document.body
        )}

      {isUnavailableModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/45"
              onClick={() => setIsUnavailableModalOpen(false)}
            />
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
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
    </div>
  );
}


