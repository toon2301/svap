'use client';
 
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, endpoints } from '../../../../lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import type { Offer } from './profileOffersTypes';
import { OfferShareModal } from './OfferShareModal';
import { HelpRequestModal } from './HelpRequestModal';
import { ProfileOfferDetailMobile } from './ProfileOfferDetailMobile';
import { ProfileOpeningHoursMobileModal } from './ProfileOpeningHoursMobileModal';
import { ProfileOfferCardMobile } from './ProfileOfferCardMobile';
import { ProfileOfferCardSkeleton } from './ProfileOfferCardSkeleton';
import { completeMobileCardFlipHint, type MobileCardFlipHintContext } from './mobileCardFlipHintApi';
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
import {
  dispatchProfileOfferDetailClose,
  dispatchProfileOfferDetailOpen,
} from './profileOfferDetailEvents';
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

interface ProfileOffersMobileSectionProps {
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  ownerProfileIdentifier?: string;
  highlightedSkillId?: number | null;
  isOtherUserProfile?: boolean;
}

export default function ProfileOffersMobileSection({
  accountType = 'personal',
  ownerUserId,
  ownerProfileIdentifier,
  highlightedSkillId,
  isOtherUserProfile = false,
}: ProfileOffersMobileSectionProps) {
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [hoursModal, setHoursModal] = useState<OpeningHours | null>(null);
  const [shareOffer, setShareOffer] = useState<Offer | null>(null);
  const [helpRequestOffer, setHelpRequestOffer] = useState<Offer | null>(null);
  const [tappedCards, setTappedCards] = useState<Set<number | string>>(() => new Set());
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusFetchInFlightRef = useRef(false);
  const statusAbortControllerRef = useRef<AbortController | null>(null);
  const offerIdsRef = useRef<number[]>([]);
  const offersRef = useRef<Offer[]>([]);
  const offerRefetchInFlightRef = useRef<Set<number>>(new Set());
  const offerRefetchQueuedRef = useRef<Set<number>>(new Set());
  const hasLoadedOffersRef = useRef(false);
  const openedBackSideOfferRef = useRef<number | null>(null);
  const cardFlipHintCompletionInFlightRef = useRef<Set<MobileCardFlipHintContext>>(new Set());

  const cardFlipHintContext: MobileCardFlipHintContext = isOtherUserProfile ? 'foreign' : 'own';
  const cardFlipHintState = user?.mobile_card_flip_hint;
  const isCardFlipHintCompleted =
    cardFlipHintContext === 'foreign'
      ? cardFlipHintState?.foreign_completed === true
      : cardFlipHintState?.own_completed === true;
  const shouldShowCardFlipHint = hasAuthenticatedUser && !isCardFlipHintCompleted;
  const isOfferStillAvailable = useCallback(
    async (offerId: number) => {
      if (!isOtherUserProfile || !ownerUserId) return true;
      try {
        const endpoint = endpoints.dashboard.userSkills(ownerUserId);
        const { data } = await api.get(endpoint);
        const list = Array.isArray(data) ? data : [];
        return list.some((s: unknown) => {
          const id = s && typeof s === 'object' ? (s as { id?: unknown }).id : null;
          return typeof id === 'number' && id === offerId;
        });
      } catch {
        return true;
      }
    },
    [isOtherUserProfile, ownerUserId],
  );

  const updateOfferLikeInState = useCallback(
    (offerId: number, isLiked: boolean, likesCount: number) => {
      const safeLikesCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
      const patchOffer = (offer: Offer): Offer =>
        offer.id === offerId
          ? { ...offer, is_liked_by_me: isLiked, likes_count: safeLikesCount }
          : offer;

      setOffers((prev) => prev.map(patchOffer));
      setSelectedOffer((prev) => (prev ? patchOffer(prev) : prev));
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
          setRequestStatusByOfferId((prev) => {
            const next = { ...prev };
            for (const o of cached) {
              if (typeof o.id === 'number' && typeof o.my_request_status === 'string' && o.my_request_status) {
                next[o.id] = o.my_request_status;
              }
            }
            return next;
          });
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
      if (showLoading) {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      // Ak je to "Request in cooldown period" chyba, ignoruj ju a zobraz prázdny zoznam
      // (toto sa môže stať pri F5 refresh, keď lastRequestTime Map zostane v pamäti)
      const err = error as {
        message?: string;
        response?: { data?: { error?: string; detail?: string } };
      };
      if (err?.message === 'Request in cooldown period') {
        setOffers([]);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
      
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        t('profile.offersLoadError', 'Nepodarilo sa načítať ponuky. Skús to znova.');
      setLoadError(msg);
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [ownerUserId, t]);

  // Reset "loaded once" guard when owner changes
  useEffect(() => {
    hasLoadedOffersRef.current = false;
  }, [ownerUserId]);

  // Skills: load once per ownerUserId
  useEffect(() => {
    if (hasLoadedOffersRef.current) return;
    hasLoadedOffersRef.current = true;
    void loadOffers();
  }, [ownerUserId, loadOffers]);

  // Keep latest offer IDs in a ref for polling ticks (no extra re-renders)
  useEffect(() => {
    offersRef.current = offers;
    offerIdsRef.current = offers.map((o) => o.id).filter((id): id is number => typeof id === 'number');
  }, [offers]);

  useEffect(() => {
    if (highlightedSkillId == null || !shouldOpenHighlightedOfferBack) {
      openedBackSideOfferRef.current = null;
      return;
    }
    if (openedBackSideOfferRef.current === highlightedSkillId) return;

    const highlightedOffer = offers.find((offer) => offer.id === highlightedSkillId);
    if (!highlightedOffer) return;

    openedBackSideOfferRef.current = highlightedSkillId;
    setSelectedOffer(highlightedOffer);
    setTappedCards(new Set());
  }, [highlightedSkillId, offers, shouldOpenHighlightedOfferBack]);

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

        const patchOffer = (offer: Offer): Offer =>
          offer.id === offerId ? mergeProfileOffer(offer, nextOffer) : offer;

        setOffers((prev) => prev.map(patchOffer));
        setSelectedOffer((prev) => (prev ? patchOffer(prev) : prev));
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

      invalidateOffersCache(ownerUserId);
      hasLoadedOffersRef.current = true;
      void loadOffers(true, false);
    };

    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, handleOffersRefresh);
    return () => {
      window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, handleOffersRefresh);
    };
  }, [isOtherUserProfile, loadOffers, ownerUserId]);

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

  // Status polling: iba keď user, isOtherUserProfile, visible; single interval + cleanup + no overlap
  useEffect(() => {
    const shouldPoll = isOtherUserProfile && hasAuthenticatedUser;

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
  }, [isOtherUserProfile, hasAuthenticatedUser, offers]);

  const completeCardFlipHint = useCallback(() => {
    if (!hasAuthenticatedUser || isCardFlipHintCompleted) return;

    const inFlight = cardFlipHintCompletionInFlightRef.current;
    if (inFlight.has(cardFlipHintContext)) return;

    inFlight.add(cardFlipHintContext);
    void completeMobileCardFlipHint(cardFlipHintContext)
      .then((nextState) => {
        updateUser({ mobile_card_flip_hint: nextState });
      })
      .catch(() => {
        // Best-effort UX hint; backend remains the source of truth.
      })
      .finally(() => {
        inFlight.delete(cardFlipHintContext);
      });
  }, [cardFlipHintContext, hasAuthenticatedUser, isCardFlipHintCompleted, updateUser]);

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
      completeCardFlipHint();
      setSelectedOffer(offer);
      setTappedCards(new Set()); // Resetuj všetky tapped karty
    }
  };

  const handleDetailClose = useCallback(() => {
    setSelectedOffer(null);
    setHoursModal(null);
    setTappedCards(new Set());
  }, []);

  useEffect(() => {
    if (selectedOffer) {
      dispatchProfileOfferDetailOpen();
      return;
    }
    dispatchProfileOfferDetailClose();
  }, [selectedOffer]);

  useEffect(() => {
    return () => {
      dispatchProfileOfferDetailClose();
    };
  }, []);

  if (isLoading && offers.length === 0) {
    return (
      <div className="mt-3 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <ProfileOfferCardSkeleton key={i} />
        ))}
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

  return (
    <>
      <div className="mt-3 space-y-3">
        {offers.map((offer, index) => {
          const cardId = offer.id ?? `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
          const isTapped = tappedCards.has(cardId);
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
            >
              <ProfileOfferCardMobile
                offer={
                  isOtherUserProfile
                    ? { ...offer, already_reviewed: alreadyReviewedByOfferId[offer.id] ?? offer.already_reviewed }
                    : offer
                }
                accountType={accountType}
                isTapped={isTapped}
                isHighlighted={isHighlighted}
                onCardClick={() => handleCardClick(offer)}
                isOtherUserProfile={isOtherUserProfile}
                reviewsHref={reviewsHref}
                onRequestClick={handleRequestClick}
                onMessageClick={handleMessageClick}
                onShareClick={handleShareOffer}
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
                showFlipHint={shouldShowCardFlipHint && index === 0}
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


