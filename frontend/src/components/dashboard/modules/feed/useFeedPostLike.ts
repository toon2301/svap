'use client';

/**
 * Optimistický lajk príspevku – jedna implementácia pre všetky jeho miesta.
 *
 * Používa ho karta vo feede, mobilný prehliadač fotky aj mobilná obrazovka
 * detailu. Predtým mal každé z nich vlastnú kópiu tej istej postupnosti
 * (prepni hneď → ohlás ostatným → zavolaj server → zosúlaď → pri chybe vráť
 * späť a ohlás chybu), takže oprava na jednom mieste sa na ďalšie dve
 * nedostala.
 *
 * Stav sa ohlasuje cez `feedPostCountEvents`, takže druhá karta toho istého
 * príspevku (feed pod otvorenou vrstvou) preblikne spolu s ňou, nie až po
 * odpovedi servera.
 */

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { likeFeedPost, unlikeFeedPost } from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostCounts } from './feedPostCountEvents';

type UseFeedPostLikeOptions = {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  /** Prekladač hlášok – hook si `useLanguage` zámerne nevolá sám. */
  t: (key: string, fallback?: string) => string;
};

export type FeedPostLike = {
  isLiked: boolean;
  likesCount: number;
  toggleLike: () => Promise<void>;
  /**
   * Priamy zápis stavu pre volajúceho, ktorý ho dostane odinakiaľ (prop-sync,
   * polling počtov, udalosť z druhej karty).
   */
  setIsLiked: (liked: boolean) => void;
  setLikesCount: (count: number) => void;
  /**
   * Beží práve VLASTNÝ lajk?
   *
   * Volajúci, ktorý stav preberá zvonka, ho musí počas toho preskočiť – inak
   * by staršia serverová odpoveď prebliknutie vrátila späť.
   */
  pendingRef: React.MutableRefObject<boolean>;
  /**
   * Poradové číslo lajkov.
   *
   * `pendingRef` sám nestačí: lajk, ktorý sa počas pollu stihne CELÝ, príznak
   * zase vynuluje, takže by zastaraná odpoveď prepísala čerstvý počet späť.
   */
  seqRef: React.MutableRefObject<number>;
};

export function useFeedPostLike({
  postId,
  initialLiked,
  initialCount,
  t,
}: UseFeedPostLikeOptions): FeedPostLike {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const pendingRef = useRef(false);
  const seqRef = useRef(0);
  // Cez ref, aby `toggleLike` nemenilo identitu pri každom prekreslení.
  const tRef = useRef(t);
  tRef.current = t;
  const likedRef = useRef(isLiked);
  likedRef.current = isLiked;
  const countRef = useRef(likesCount);
  countRef.current = likesCount;

  const toggleLike = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    seqRef.current += 1;

    // Optimisticky prepni hneď, request beží na pozadí.
    const previousLiked = likedRef.current;
    const previousCount = countRef.current;
    const nextLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setIsLiked(nextLiked);
    setLikesCount(optimisticCount);
    emitFeedPostCounts({
      postId,
      likesCount: optimisticCount,
      isLikedByMe: nextLiked,
    });

    try {
      const payload = nextLiked
        ? await likeFeedPost(postId)
        : await unlikeFeedPost(postId);
      // Zosúlaď s pravdou zo servera (iný divák mohol medzitým lajknúť tiež).
      setIsLiked(payload.is_liked_by_me);
      setLikesCount(payload.likes_count);
      emitFeedPostCounts({
        postId,
        likesCount: payload.likes_count,
        isLikedByMe: payload.is_liked_by_me,
      });
    } catch (error) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      emitFeedPostCounts({
        postId,
        likesCount: previousCount,
        isLikedByMe: previousLiked,
      });
      toast.error(translateFeedActionError(tRef.current, error));
    } finally {
      pendingRef.current = false;
    }
  }, [postId]);

  return {
    isLiked,
    likesCount,
    toggleLike,
    setIsLiked,
    setLikesCount,
    pendingRef,
    seqRef,
  };
}
