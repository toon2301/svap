'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { setOfferLikeState } from '@/components/dashboard/modules/profile/offerLikesApi';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';

type Translate = (key: string, fallback: string) => string;

/** Keep a search card's optimistic Like local, but accept the server's final state and count. */
export function useSearchOfferLike(offer: Offer, t: Translate) {
  const [state, setState] = useState(() => ({
    isLiked: offer.is_liked_by_me === true,
    count: Math.max(0, Number(offer.likes_count ?? 0)),
  }));
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const mountedRef = useRef(false);
  const revisionRef = useRef(0);

  // This hook is mounted only in the resolved client/mobile branch. Initialize before interaction.
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      revisionRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    revisionRef.current += 1;
    pendingRef.current = false;
    setIsPending(false);
    setState({
      isLiked: offer.is_liked_by_me === true,
      count: Math.max(0, Number(offer.likes_count ?? 0)),
    });
  }, [offer.id, offer.is_liked_by_me, offer.likes_count]);

  const toggleLike = useCallback(async () => {
    if (pendingRef.current || !Number.isSafeInteger(offer.id) || offer.id < 1) return;

    const revision = revisionRef.current;
    const previous = state;
    const nextLiked = !previous.isLiked;
    const optimisticCount = Math.max(0, previous.count + (nextLiked ? 1 : -1));
    const isCurrent = () => mountedRef.current && revisionRef.current === revision;

    pendingRef.current = true;
    setIsPending(true);
    setState({ isLiked: nextLiked, count: optimisticCount });

    try {
      const response = await setOfferLikeState(offer.id, nextLiked);
      if (!isCurrent()) return;
      if (response.offer_id !== offer.id) throw new Error('Unexpected offer Like response');
      setState({
        isLiked: response.is_liked_by_me === true,
        count: Math.max(0, Number(response.likes_count ?? optimisticCount)),
      });
    } catch {
      if (!isCurrent()) return;
      setState(previous);
      toast.error(t('reviews.likeUpdateFailed', 'Nepodarilo sa aktualizovať páči sa mi.'));
    } finally {
      if (isCurrent()) {
        pendingRef.current = false;
        setIsPending(false);
      }
    }
  }, [offer.id, state, t]);

  const effectiveOffer = useMemo(() => ({
    ...offer,
    is_liked_by_me: state.isLiked,
    likes_count: state.count,
  }), [offer, state]);

  return { offer: effectiveOffer, isPending, toggleLike };
}
