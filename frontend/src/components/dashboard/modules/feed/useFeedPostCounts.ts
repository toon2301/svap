'use client';

/**
 * Počty lajkov a komentárov karty: obnova zo servera (`refreshCounts`) a jej polling pre kartu na obrazovke.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok f delenia karty, etapa 2, nález 333, R23): text aj komentáre sú rovnaké
 * ako predtým, mení sa len `post.id` na `postId` (v texte aj v závislostiach `useCallback`). Hook nemá vlastný stav a nič
 * nevracia. Karta ho volá na mieste pôvodného `useFeedCommentsPolling` (za efektmi E1 až E7), takže poradie efektov sa
 * nemení. Závislosti `useCallback` ostali rovnaké: všetko okrem `postId` pochádza z hookov lajku a počtov, takže ich ESLint
 * vyžadoval aj predtým.
 */

import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { getFeedPost } from '@/lib/feedApi';
import { emitFeedPostCounts } from './feedPostCountEvents';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';

type UseFeedPostCountsArgs = {
  postId: number;
  inViewport: boolean;
  likePendingRef: MutableRefObject<boolean>;
  likeSeqRef: MutableRefObject<number>;
  setLikesCount: (count: number) => void;
  setIsLiked: (liked: boolean) => void;
  publishCommentsCount: (next: number) => void;
};

export function useFeedPostCounts({
  postId,
  inViewport,
  likePendingRef,
  likeSeqRef,
  setLikesCount,
  setIsLiked,
  publishCommentsCount,
}: UseFeedPostCountsArgs) {
  /**
   * Priebežné počty lajkov od iných používateľov.
   *
   * Rovnaký hook ako pri komentároch, takže interval, pauza pri skrytej
   * záložke, timeout nečinnosti aj ochrana proti prekrývajúcim sa requestom
   * sú zdieľané, nie skopírované.
   *
   * Počty lajkov KOMENTÁROV nič nové nepotrebujú: pollovanie komentárov
   * vracia celé objekty vrátane `likes_count` a merge ich nahradí čerstvou
   * verziou.
   */
  const refreshCounts = useCallback(async () => {
    // Vlastný lajk práve beží – serverová odpoveď je spred neho a prebliklo
    // by to späť. Rovnaká zásada ako v prop-sync efekte vyššie.
    if (likePendingRef.current) return;
    const seq = likeSeqRef.current;
    const fresh = await getFeedPost(postId);
    // Medzitým používateľ lajkol (aj keď už dobehol) → odpoveď je spred toho.
    if (seq !== likeSeqRef.current || likePendingRef.current) return;
    setLikesCount(fresh.likes_count);
    setIsLiked(fresh.is_liked_by_me);
    // Čerstvá serverová pravda musí ísť aj do otvorenej vrstvy NAD kartou –
    // tá sama nepolluje, takže by inak držala číslo z momentu otvorenia.
    // Rozposiela sa až TU, za oboma brzdami vyššie: odpoveď spred práve
    // dokončeného lajku by inak prepísala čerstvý stav ostatným.
    publishCommentsCount(fresh.comments_count);
    emitFeedPostCounts({
      postId: postId,
      likesCount: fresh.likes_count,
      isLikedByMe: fresh.is_liked_by_me,
    });
  }, [
    likePendingRef,
    likeSeqRef,
    publishCommentsCount,
    setIsLiked,
    setLikesCount,
    postId,
  ]);

  useFeedCommentsPolling({ enabled: inViewport, onPoll: refreshCounts });
}
