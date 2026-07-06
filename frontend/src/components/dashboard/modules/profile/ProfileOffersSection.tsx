'use client';
 
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, endpoints } from '../../../../lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';
import type { ProfileTab } from './profileTypes';
import type { Offer } from './profileOffersTypes';
import { HOURS_DAYS } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import { OfferShareModal } from './OfferShareModal';
import { HelpRequestModal } from './HelpRequestModal';
import ProfileOfferCard from './ProfileOfferCard';
import { ProfileOfferCardSkeleton } from './ProfileOfferCardSkeleton';
import { ProfileOffersEmptyState } from './ProfileOffersEmptyState';
import { completeDesktopCardFlipHint, type DesktopCardFlipHintContext } from './desktopCardFlipHintApi';
import {
  getOffersFromCache,
  makeOffersCacheKey,
  setOffersToCache,
  getOrCreateOffersRequest,
  invalidateOffersCache,
} from './profileOffersCache';
import {
  createSkillRequest,
  fetchSkillRequests,
  getApiErrorMessage,
  updateSkillRequest,
} from '../requests/requestsApi';
import { getMessagingErrorMessage } from '../messages/messagingApi';
import { buildMessagesUrl } from '../messages/messagesRouting';
import { setOfferLikeState, type OfferLikeResponse } from './offerLikesApi';
import {
  PROFILE_OFFER_LIKED_EVENT,
  PROFILE_OFFERS_REFRESH_EVENT,
  readProfileOfferLikedEvent,
  readProfileOffersRefreshEvent,
} from './profileOfferEvents';
import { mapApiOfferToProfileOffer, mergeProfileOffer } from './profileOfferMapper';
import {
  buildOfferShareUrl,
  getOfferOwnerIdentifier,
} from './offerShareUrl';
import {
  buildOfferReviewsPath,
  buildOfferReviewsReturnTo,
} from '../reviews/offerReviewsRouting';
import {
  getOfferShareImageUrl,
  getOfferShareLocation,
  getOfferShareTitle,
} from './offerSharePreview';

interface ProfileOffersSectionProps {
  activeTab: ProfileTab;
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  ownerProfileIdentifier?: string;
  highlightedSkillId?: number | null;
  isOtherUserProfile?: boolean;
  onEditOffer?: (offer: Offer) => void;
  onDeleteOffer?: (offer: Offer) => void;
  onCreateOffer?: () => void;
}

export default function ProfileOffersSection({
  activeTab,
  accountType = 'personal',
  ownerUserId,
  ownerProfileIdentifier,
  highlightedSkillId,
  isOtherUserProfile = false,
  onEditOffer,
  onDeleteOffer,
  onCreateOffer,
}: ProfileOffersSectionProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuth();
  const shouldOpenHighlightedOfferBack = searchParams?.get('side') === 'back';
  const hasAuthenticatedUser = Boolean(user);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requestStatusByOfferId, setRequestStatusByOfferId] = useState<Record<number, string>>({});
  const [proposedRequestStatusByOfferId, setProposedRequestStatusByOfferId] = useState<Record<number, string>>({});
  const [requestIdByOfferId, setRequestIdByOfferId] = useState<Record<number, number>>({});
  const [alreadyReviewedByOfferId, setAlreadyReviewedByOfferId] = useState<Record<number, boolean | undefined>>({});
  const [busyOfferId, setBusyOfferId] = useState<number | null>(null);
  const [busyMessageOfferId, setBusyMessageOfferId] = useState<number | null>(null);
  const [pendingOfferLikeIds, setPendingOfferLikeIds] = useState<Set<number>>(() => new Set());
  const [flippedCards, setFlippedCards] = useState<Set<number | string>>(() => new Set());
  const [activeHoursOfferId, setActiveHoursOfferId] = useState<number | string | null>(null);
  const [hoursPopoverPosition, setHoursPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeOpeningHours, setActiveOpeningHours] = useState<OpeningHours | null>(null);
  const [helpRequestOffer, setHelpRequestOffer] = useState<Offer | null>(null);
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [shareOffer, setShareOffer] = useState<Offer | null>(null);
  const hasLoadedOffersRef = useRef(false);

  // Polling refs (stable, no re-render storms)
  const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusFetchInFlightRef = useRef(false);
  const statusAbortControllerRef = useRef<AbortController | null>(null);
  const offerIdsRef = useRef<number[]>([]);
  const offersRef = useRef<Offer[]>([]);
  const offerRefetchInFlightRef = useRef<Set<number>>(new Set());
  const offerRefetchQueuedRef = useRef<Set<number>>(new Set());
  const [dismissedCardFlipHintContexts, setDismissedCardFlipHintContexts] = useState<
    Set<DesktopCardFlipHintContext>
  >(() => new Set());
  const cardFlipHintCompletionInFlightRef = useRef<Set<DesktopCardFlipHintContext>>(new Set());

  const cardFlipHintContext: DesktopCardFlipHintContext = isOtherUserProfile ? 'foreign' : 'own';
  const cardFlipHintState = user?.desktop_card_flip_hint;
  const isCardFlipHintCompleted =
    cardFlipHintContext === 'foreign'
      ? cardFlipHintState?.foreign_completed === true
      : cardFlipHintState?.own_completed === true;
  const isCardFlipHintDismissed = dismissedCardFlipHintContexts.has(cardFlipHintContext);
  const shouldShowCardFlipHint =
    hasAuthenticatedUser && !isCardFlipHintCompleted && !isCardFlipHintDismissed;

  useEffect(() => {
    setDismissedCardFlipHintContexts(new Set());
  }, [user?.id]);

  const isOfferStillAvailable = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile || !ownerUserId) return true;

      try {
        const endpoint = endpoints.dashboard.userSkills(ownerUserId);
        const { data } = await api.get(endpoint);
        const list = Array.isArray(data) ? data : [];
        const exists = list.some((s: unknown) => {
          const id = s && typeof s === 'object' ? (s as { id?: unknown }).id : null;
          return typeof id === 'number' && id === offerId;
        });
        return exists;
      } catch {
        // Ak sa nepodarí overiť dostupnosť, necháme to bez hlášky (bezpečné minimum).
      }

      return true;
    },
    [isOtherUserProfile, ownerUserId],
  );

  const updateOfferLikeInState = useCallback(
    (offerId: number, isLiked: boolean, likesCount: number) => {
      const safeLikesCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === offerId
            ? { ...offer, is_liked_by_me: isLiked, likes_count: safeLikesCount }
            : offer,
        ),
      );
    },
    [],
  );

  const handleToggleOfferLike = useCallback(
    async (offerId: number) => {
      if (pendingOfferLikeIds.has(offerId)) return;

      const offer = offers.find((item) => item.id === offerId);
      if (!offer) return;

      const previousLiked = offer.is_liked_by_me === true;
      const previousLikesCount = Math.max(0, Number(offer.likes_count ?? 0));
      const nextLiked = !previousLiked;
      const optimisticLikesCount = Math.max(0, previousLikesCount + (nextLiked ? 1 : -1));

      setPendingOfferLikeIds((prev) => {
        const next = new Set(prev);
        next.add(offerId);
        return next;
      });
      updateOfferLikeInState(offerId, nextLiked, optimisticLikesCount);

      try {
        const data: OfferLikeResponse = await setOfferLikeState(offerId, nextLiked);
        updateOfferLikeInState(
          data.offer_id,
          data.is_liked_by_me === true,
          Number(data.likes_count ?? optimisticLikesCount),
        );
        invalidateOffersCache(ownerUserId);
      } catch {
        updateOfferLikeInState(offerId, previousLiked, previousLikesCount);
        toast.error(t('reviews.likeUpdateFailed', 'Nepodarilo sa aktualizovať páči sa mi.'));
      } finally {
        setPendingOfferLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(offerId);
          return next;
        });
      }
    },
    [offers, ownerUserId, pendingOfferLikeIds, t, updateOfferLikeInState],
  );

  const handleShareOffer = useCallback(
    (offer: Offer) => {
      if (offer.is_hidden) {
        toast.error(t('profile.offerShareUnavailable', 'Táto ponuka už nie je dostupná.'));
        return;
      }
      const ownerIdentifier = getOfferOwnerIdentifier(
        offer,
        ownerProfileIdentifier ?? ownerUserId,
      );
      if (!ownerIdentifier) {
        toast.error(t('profile.offerShareUnavailable', 'Táto ponuka už nie je dostupná.'));
        return;
      }
      setShareOffer(offer);
    },
    [ownerProfileIdentifier, ownerUserId, t],
  );

  const handleMessageClick = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile) return;
      if (busyMessageOfferId === offerId) return;
      if (proposedRequestStatusByOfferId[offerId] === 'pending') return;
      const ok = await isOfferStillAvailable(offerId);
      if (!ok) {
        setIsUnavailableModalOpen(true);
        return;
      }
      if (!ownerUserId) return;
      try {
        setBusyMessageOfferId(offerId);
        router.push(buildMessagesUrl(null, { targetUserId: ownerUserId }));
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t('messages.openFailed', 'Nepodarilo sa otvoriť konverzáciu. Skúste to znova.'),
            rateLimitFallback: t('messages.openRateLimited', 'Konverzácie otvárate príliš rýchlo. Skúste chvíľu počkať.'),
            unavailableFallback: t('messages.openUnavailable', 'Používateľovi momentálne nie je možné napísať.'),
          }),
        );
      } finally {
        setBusyMessageOfferId(null);
      }
    },
    [busyMessageOfferId, isOtherUserProfile, isOfferStillAvailable, ownerUserId, proposedRequestStatusByOfferId, router, t],
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
      const offer = offers.find((o) => o.id === offerId);
      const proposedCurrent = proposedRequestStatusByOfferId[offerId] ?? '';
      if (
        proposedCurrent === 'pending' ||
        proposedCurrent === 'accepted' ||
        proposedCurrent === 'completion_requested'
      ) {
        return;
      }
      const current = requestStatusByOfferId[offerId] ?? offer?.my_request_status ?? '';
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
          invalidateOffersCache(ownerUserId);
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

      if (offer?.is_seeking === true) {
        setHelpRequestOffer(offer);
        return;
      }

      try {
        setBusyOfferId(offerId);
        const { data } = await createSkillRequest(offerId);
        setRequestStatusByOfferId((prev) => ({ ...prev, [offerId]: 'pending' }));
        invalidateOffersCache(ownerUserId);
        const createdId = data?.id != null ? Number(data.id) : NaN;
        if (Number.isFinite(createdId) && createdId >= 1) {
          setRequestIdByOfferId((prev) => ({ ...prev, [offerId]: createdId }));
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t('requests.toastCreateFailed', 'Žiadosť sa nepodarilo odoslať.')));
      } finally {
        setBusyOfferId(null);
      }
    },
    [
      isOtherUserProfile,
      isOfferStillAvailable,
      proposedRequestStatusByOfferId,
      requestStatusByOfferId,
      busyOfferId,
      resolvePendingRequestIdForOffer,
      offers,
      ownerUserId,
      t,
    ],
  );

  const handleHelpRequestSubmitted = useCallback(
    (offerId: number, requestId: number | null) => {
      setRequestStatusByOfferId((prev) => ({ ...prev, [offerId]: 'pending' }));
      setProposedRequestStatusByOfferId((prev) => ({ ...prev, [offerId]: 'pending' }));
      invalidateOffersCache(ownerUserId);
      if (requestId) {
        setRequestIdByOfferId((prev) => ({ ...prev, [offerId]: requestId }));
      }
    },
    [ownerUserId],
  );

  // Load offers function (použitá pre prvotné načítanie aj polling)
  const loadOffers = useCallback(async (skipCache = false) => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const cacheKey = makeOffersCacheKey(ownerUserId);
      
      // Ak nie je skipCache, skús najprv cache
      if (!skipCache) {
        const cached = getOffersFromCache(cacheKey);
        if (cached) {
          setOffers(cached);
          setRequestStatusByOfferId((prev) => {
            const next = { ...prev };
            for (const o of cached) {
              if (typeof o.id === 'number' && typeof o.my_request_status === 'string' && o.my_request_status) {
                next[o.id] = o.my_request_status;
              }
            }
            return next;
          });
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);

      // Request deduplication - použij existujúci in-flight request alebo vytvor nový
      const endpoint = ownerUserId
        ? endpoints.dashboard.userSkills(ownerUserId)
        : endpoints.skills.list;

      const mappedOffers = await getOrCreateOffersRequest(cacheKey, async () => {
        const { data } = await api.get(endpoint);
        const list = Array.isArray(data) ? data : [];
        return list.map(mapApiOfferToProfileOffer);
      });

      setOffers(mappedOffers);
      setRequestStatusByOfferId((prev) => {
        const next = { ...prev };
        for (const o of mappedOffers) {
          if (typeof o.id === 'number' && typeof o.my_request_status === 'string' && o.my_request_status) {
            next[o.id] = o.my_request_status;
          }
        }
        return next;
      });
      setOffersToCache(cacheKey, mappedOffers);
    } catch (error: unknown) {
      // Pri 429 ponechaj posledné ponuky (z cache alebo prázdne) a zobraz jemnú hlášku
      const status = (error as { response?: { status?: unknown } })?.response?.status;
      if (status === 429) {
        setLoadError(
          t(
            'profile.offersRateLimited',
            'Príliš veľa požiadaviek pri načítavaní ponúk, skúste to o chvíľu.',
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [ownerUserId, t]);

  // Reset "loaded once" guard when owner changes
  useEffect(() => {
    hasLoadedOffersRef.current = false;
  }, [ownerUserId]);

  // Skills/offers: load once (no interval)
  useEffect(() => {
    if (activeTab !== 'offers') return;
    if (hasLoadedOffersRef.current) return;
    hasLoadedOffersRef.current = true;
    void loadOffers();
  }, [activeTab, ownerUserId, loadOffers]);

  // Keep latest offer IDs in a ref for polling ticks
  useEffect(() => {
    offersRef.current = offers;
    offerIdsRef.current = offers.map((o) => o.id).filter((id): id is number => typeof id === 'number');
  }, [offers]);

  useEffect(() => {
    if (highlightedSkillId == null || !shouldOpenHighlightedOfferBack) return;

    setFlippedCards((prev) => {
      if (prev.has(highlightedSkillId)) return prev;
      const next = new Set(prev);
      next.add(highlightedSkillId);
      return next;
    });
  }, [highlightedSkillId, shouldOpenHighlightedOfferBack]);

  const refetchOfferById = useCallback(
    async (offerId: number) => {
      const currentOffers = offersRef.current;
      if (!currentOffers.some((offer) => offer.id === offerId)) {
        if (!isOtherUserProfile) {
          invalidateOffersCache(ownerUserId);
        }
        return;
      }
      if (offerRefetchInFlightRef.current.has(offerId)) {
        offerRefetchQueuedRef.current.add(offerId);
        return;
      }

      offerRefetchInFlightRef.current.add(offerId);
      try {
        const { data } = await api.get(endpoints.skills.detail(offerId));
        const nextOffer = mapApiOfferToProfileOffer(data);
        if (nextOffer.id !== offerId) return;

        setOffers((prev) =>
          prev.map((offer) =>
            offer.id === offerId ? mergeProfileOffer(offer, nextOffer) : offer,
          ),
        );
        invalidateOffersCache(ownerUserId);
      } catch {
        // Realtime refresh is best-effort; keep the current card state on failure.
      } finally {
        offerRefetchInFlightRef.current.delete(offerId);
        if (offerRefetchQueuedRef.current.delete(offerId)) {
          void refetchOfferById(offerId);
        }
      }
    },
    [isOtherUserProfile, ownerUserId],
  );

  useEffect(() => {
    const handleOfferLiked = (event: Event) => {
      const payload = readProfileOfferLikedEvent(event);
      if (!payload) return;
      void refetchOfferById(payload.offerId);
    };

    window.addEventListener(PROFILE_OFFER_LIKED_EVENT, handleOfferLiked);
    return () => {
      window.removeEventListener(PROFILE_OFFER_LIKED_EVENT, handleOfferLiked);
    };
  }, [refetchOfferById]);

  useEffect(() => {
    const handleOffersRefresh = (event: Event) => {
      if (isOtherUserProfile) return;
      const payload = readProfileOffersRefreshEvent(event);
      if (!payload) return;
      if (payload.ownerUserId !== undefined && payload.ownerUserId !== ownerUserId) return;

      if (payload.deletedOfferId !== undefined) {
        setOffers((prev) => prev.filter((o) => o.id !== payload.deletedOfferId));
      }

      invalidateOffersCache(ownerUserId);
      if (activeTab !== 'offers') {
        hasLoadedOffersRef.current = false;
        return;
      }

      hasLoadedOffersRef.current = true;
      void loadOffers(true);
    };

    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, handleOffersRefresh);
    return () => {
      window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, handleOffersRefresh);
    };
  }, [activeTab, isOtherUserProfile, loadOffers, ownerUserId]);

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

  // Status polling: iba keď user, isOtherUserProfile, activeTab=offers, visible; single interval + cleanup + no overlap
  useEffect(() => {
    const shouldPoll = activeTab === 'offers' && isOtherUserProfile && hasAuthenticatedUser;

    const stop = () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
        statusPollIntervalRef.current = null;
      }
      try {
        statusAbortControllerRef.current?.abort();
      } catch {
        // ignore
      }
      statusAbortControllerRef.current = null;
      statusFetchInFlightRef.current = false;
    };

    if (!shouldPoll) {
      stop();
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      const ids = offerIdsRef.current;
      if (ids.length === 0) return;
      if (statusFetchInFlightRef.current) return;

      statusFetchInFlightRef.current = true;
      const controller = new AbortController();
      statusAbortControllerRef.current = controller;
      try {
        const requestConfig: AxiosRequestConfig = {
          params: { offer_ids: ids.join(',') },
          signal: controller.signal,
        };
        const res = await api.get(endpoints.requests.status, requestConfig);
        const data = res?.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : {};
        const requestIdsRaw =
          data.request_ids && typeof data.request_ids === 'object'
            ? (data.request_ids as Record<string, unknown>)
            : {};

        const normalized: Record<number, string> = {};
        const alreadyReviewed: Record<number, boolean | undefined> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (k === 'request_ids') return;
          const n = Number(k);
          if (!Number.isFinite(n)) return;

          if (typeof v === 'string') {
            normalized[n] = v;
            return;
          }

          if (v && typeof v === 'object') {
            const vv = v as Record<string, unknown>;
            const status = vv.status;
            if (typeof status === 'string') normalized[n] = status;

            const alreadyReviewedRaw = vv.already_reviewed;
            if (typeof alreadyReviewedRaw === 'boolean') {
              alreadyReviewed[n] = alreadyReviewedRaw === true;
            }
          }
        });

        const ridMap: Record<number, number> = {};
        Object.entries(requestIdsRaw).forEach(([k, v]) => {
          const n = Number(k);
          const id = typeof v === 'number' ? v : Number(v);
          if (Number.isFinite(n) && Number.isFinite(id) && id >= 1) ridMap[n] = id;
        });

        let proposedNormalized: Record<number, string> | null = null;
        try {
          const proposedRes = await api.get(endpoints.requests.proposedStatus, requestConfig);
          const proposedData =
            proposedRes?.data && typeof proposedRes.data === 'object'
              ? (proposedRes.data as Record<string, unknown>)
              : {};
          const parsedProposed: Record<number, string> = {};
          Object.entries(proposedData).forEach(([k, v]) => {
            const n = Number(k);
            if (Number.isFinite(n) && typeof v === 'string') parsedProposed[n] = v;
          });
          proposedNormalized = parsedProposed;
        } catch (e: unknown) {
          const error = e as { name?: string; code?: string };
          if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') return;
        }

        if (!cancelled) {
          setRequestStatusByOfferId(normalized);
          if (proposedNormalized !== null) {
            setProposedRequestStatusByOfferId(proposedNormalized);
          }
          setRequestIdByOfferId(ridMap);
          setAlreadyReviewedByOfferId(alreadyReviewed);
        }
      } catch (e: unknown) {
        // Abort/cancel is expected on unmount/logout/tab switch
        const error = e as { name?: string; code?: string };
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') return;
      } finally {
        if (statusAbortControllerRef.current === controller) statusAbortControllerRef.current = null;
        statusFetchInFlightRef.current = false;
      }
    };

    void fetchStatus();

    statusPollIntervalRef.current = setInterval(() => {
      void fetchStatus();
    }, 20_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void fetchStatus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [activeTab, isOtherUserProfile, hasAuthenticatedUser, offers]);

  const completeCardFlipHint = useCallback(() => {
    if (!hasAuthenticatedUser || isCardFlipHintCompleted) return;

    setDismissedCardFlipHintContexts((prev) => {
      if (prev.has(cardFlipHintContext)) return prev;
      const next = new Set(prev);
      next.add(cardFlipHintContext);
      return next;
    });

    const inFlight = cardFlipHintCompletionInFlightRef.current;
    if (inFlight.has(cardFlipHintContext)) return;

    inFlight.add(cardFlipHintContext);
    void completeDesktopCardFlipHint(cardFlipHintContext)
      .then((nextState) => {
        updateUser({ desktop_card_flip_hint: nextState });
      })
      .catch(() => {
        // Best-effort UX hint; backend remains the source of truth.
      })
      .finally(() => {
        inFlight.delete(cardFlipHintContext);
      });
  }, [cardFlipHintContext, hasAuthenticatedUser, isCardFlipHintCompleted, updateUser]);

  if (activeTab !== 'offers') {
    return null;
  }

  if (isLoading && offers.length === 0) {
    return (
      <div className="mt-4">
        <div className="svap-profile-offers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProfileOfferCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {offers.length === 0 ? (
        loadError ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{loadError}</p>
        ) : (
          <ProfileOffersEmptyState
            isOwner={!isOtherUserProfile}
            onCreate={!isOtherUserProfile ? onCreateOffer : undefined}
            className="mt-0"
          />
        )
      ) : (
        <div className="svap-profile-offers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
          {offers.map((offer, index) => {
            const cardId =
              offer.id ??
              `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
            const isFlipped = flippedCards.has(cardId);

            const handleToggleFlip = () => {
              const willFlipToBack = !isFlipped;
              setFlippedCards((prev) => {
                const next = new Set(prev);
                if (next.has(cardId)) {
                  next.delete(cardId);
                } else {
                  next.add(cardId);
                }
                return next;
              });
              if (willFlipToBack) {
                completeCardFlipHint();
              }
            };

            const handleOpenHoursClick = (event: React.MouseEvent<HTMLButtonElement>) => {
              if (!offer.opening_hours) return;

              const hasAnyEnabled = Object.values(offer.opening_hours).some(
                (day) => Boolean(day?.enabled),
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
            const ownerIdentifier = getOfferOwnerIdentifier(
              offer,
              ownerProfileIdentifier ?? ownerUserId,
            );
            const reviewsHref = buildOfferReviewsPath(offer.id, {
              returnTo: buildOfferReviewsReturnTo({
                offerId: offer.id,
                ownerIdentifier,
                isOwnProfile: !isOtherUserProfile,
              }),
            });

            return (
              <div
                key={offer.id}
                ref={isHighlighted ? highlightedCardRef : undefined}
                className="relative group"
              >
                <ProfileOfferCard
                  offer={
                    isOtherUserProfile
                      ? { ...offer, already_reviewed: alreadyReviewedByOfferId[offer.id] ?? offer.already_reviewed }
                      : offer
                  }
                  accountType={accountType}
                  t={t}
                  isFlipped={isFlipped}
                  onToggleFlip={handleToggleFlip}
                  onOpenHoursClick={accountType === 'business' ? handleOpenHoursClick : undefined}
                  isHighlighted={isHighlighted}
                  isOtherUserProfile={isOtherUserProfile}
                  reviewsHref={reviewsHref}
                  onRequestClick={handleRequestClick}
                  onMessageClick={handleMessageClick}
                  onShareClick={handleShareOffer}
                  onEditOffer={isOtherUserProfile ? undefined : onEditOffer}
                  onDeleteOffer={isOtherUserProfile ? undefined : onDeleteOffer}
                  onToggleLike={handleToggleOfferLike}
                  isLikePending={pendingOfferLikeIds.has(offer.id)}
                  messageLabel={busyMessageOfferId === offer.id ? t('messages.opening', 'Otváram…') : undefined}
                  requestLabel={(() => {
                    const defaultRequestLabel = offer.is_seeking
                      ? t('requests.wantToHelpCta', 'Pomôcť')
                      : t('requests.interestCta', 'Mám záujem');
                    if (typeof offer.id !== 'number') return defaultRequestLabel;
                    const directStatus = requestStatusByOfferId[offer.id] ?? offer.my_request_status ?? '';
                    const st = directStatus || proposedRequestStatusByOfferId[offer.id] || '';
                    if (st === 'pending') return t('requests.interestSent', 'Záujem odoslaný');
                    if (st === 'accepted') return t('requests.interestAgreed', 'Dohodnuté');
                    if (st === 'completion_requested') {
                      return t('requests.interestAwaitingConfirmation', 'Čaká na potvrdenie');
                    }
                    return defaultRequestLabel;
                  })()}
                  isRequestDisabled={(() => {
                    if (typeof offer.id !== 'number') return false;
                    const directStatus = requestStatusByOfferId[offer.id] ?? offer.my_request_status ?? '';
                    const raw = directStatus || proposedRequestStatusByOfferId[offer.id] || '';
                    const st =
                      raw === 'pending' ||
                      raw === 'accepted' ||
                      raw === 'completion_requested' ||
                      raw === 'rejected' ||
                      raw === 'cancelled' ||
                      raw === 'terminated' ||
                      raw === 'completed'
                        ? raw
                        : '';
                    return st === 'pending' || st === 'accepted' || st === 'completion_requested' || busyOfferId === offer.id;
                  })()}
                  isMessageDisabled={proposedRequestStatusByOfferId[offer.id] === 'pending' || busyMessageOfferId === offer.id}
                  enableImageGallery={isOtherUserProfile}
                  showFlipHint={shouldShowCardFlipHint && index === 0 && !isFlipped}
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

      {shareOffer && (() => {
        const ownerIdentifier = getOfferOwnerIdentifier(
          shareOffer,
          ownerProfileIdentifier ?? ownerUserId,
        );
        if (!ownerIdentifier) return null;

        const title = getOfferShareTitle(shareOffer, t);
        return (
          <OfferShareModal
            open={Boolean(shareOffer)}
            onClose={() => setShareOffer(null)}
            offerUrl={buildOfferShareUrl(ownerIdentifier, shareOffer.id)}
            offer={{
              id: shareOffer.id,
              title,
              imageUrl: getOfferShareImageUrl(shareOffer),
              location: getOfferShareLocation(shareOffer),
            }}
          />
        );
      })()}

      <HelpRequestModal
        open={Boolean(helpRequestOffer)}
        offer={helpRequestOffer}
        onClose={() => setHelpRequestOffer(null)}
        onSubmitted={handleHelpRequestSubmitted}
      />

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


