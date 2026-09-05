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
 * Stav sa ohlasuje cez `feedPostCountEvents` a hook ho odtiaľ aj PRIJÍMA.
 * Vďaka tomu je synchronizácia OBOJSMERNÁ na všetkých troch miestach naraz:
 * predtým odoberala jediná `FeedPostCard`, takže lajk na karte sa do otvorenej
 * vrstvy nad ňou nikdy nedostal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { likeFeedPost, unlikeFeedPost } from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostCounts, onFeedPostCounts } from './feedPostCountEvents';
import { handleFeedPostErrorIfGone } from './feedPostGone';

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

  /**
   * Lajk z iného miesta toho istého príspevku.
   *
   * `pendingRef` je tu KRITICKÝ: hook vysiela vlastnú optimistickú zmenu a
   * `window` event doručí synchrónne, takže ho vzápätí prijme aj on sám.
   * Bez tejto brzdy by si rozbehnutý lajk prepísal vlastnú hodnotu späť na
   * tú, ktorá práve odchádza zo servera (alebo na predošlú).
   *
   * Prijatá hodnota sa ZÁMERNE nevysiela ďalej – inak by si dve otvorené
   * vrstvy posielali to isté dokola.
   *
   * Zastaraná odpoveď zo servera sa nebrzdí tu, ale u ZDROJA: `seqRef` drží
   * poradové číslo lajku a pravidelné dopytovanie počtov (`refreshCounts` na
   * karte) podľa neho pozná, že jeho odpoveď je spred práve dokončeného lajku
   * – a vtedy ju vôbec nerozposiela.
   */
  useEffect(
    () =>
      onFeedPostCounts((patch) => {
        if (patch.postId !== postId) return;
        if (pendingRef.current) return;
        if (patch.likesCount !== undefined) setLikesCount(patch.likesCount);
        if (patch.isLikedByMe !== undefined) setIsLiked(patch.isLikedByMe);
      }),
    [postId],
  );

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
      // Zmiznutý príspevok sa rieši spoločne (odstránenie zo zoznamov, jeden
      // toast) – bežná hláška „akciu sa nepodarilo vykonať" by mýlila.
      if (!handleFeedPostErrorIfGone(error, postId, tRef.current)) {
        toast.error(translateFeedActionError(tRef.current, error));
      }
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
