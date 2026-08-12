'use client';

/**
 * Sledovanie fotiek príspevku, ktoré sa ešte spracúvajú na pozadí (Celery).
 *
 * Appka nemá pre feed realtime kanál; rovnaký scenár rieši `PortfolioDetailModule`
 * krátkym pollingom, tak sa preberá aj sem vrátane hodnôt aj poistky proti
 * večnému behu.
 *
 * Beží LEN kým je aspoň jedna fotka `pending` a len pre autora – cudziemu
 * divákovi backend rozpracované fotky vôbec neposiela, takže by šlo o čistú
 * záťaž.
 */

import { useEffect, useRef, useState } from 'react';
import { getFeedPost, type FeedPost, type FeedPostImage } from '@/lib/feedApi';

const PENDING_IMAGE_POLL_INTERVAL_MS = 2500;
const PENDING_IMAGE_POLL_TIMEOUT_MS = 45000;

export function usePendingFeedImages(post: FeedPost): FeedPostImage[] {
  const [images, setImages] = useState<FeedPostImage[]>(post.images ?? []);
  const startedAtRef = useRef<number | null>(null);
  // Guard proti prekrývajúcim sa requestom a proti zastaraným odpovediam:
  // pomalší starší request by inak dobehol po novšom a vrátil stav späť.
  const inFlightRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    // Props sú novší zdroj pravdy (obnovenie feedu) – zahoď rozbehnuté kolo.
    seqRef.current += 1;
    setImages(post.images ?? []);
  }, [post.images]);

  const hasPending = images.some((image) => image.status === 'pending');

  useEffect(() => {
    if (!post.can_manage || !hasPending) {
      startedAtRef.current = null;
      return;
    }
    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }

    const intervalId = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (
        startedAt == null ||
        Date.now() - startedAt >= PENDING_IMAGE_POLL_TIMEOUT_MS
      ) {
        startedAtRef.current = null;
        window.clearInterval(intervalId);
        return;
      }
      // Ďalšie kolo až po dobehnutí toho predošlého – pri pomalej sieti by sa
      // requesty inak hromadili.
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      const seq = (seqRef.current += 1);
      void getFeedPost(post.id)
        .then((fresh) => {
          // Medzitým prišiel novší stav (props alebo ďalšie kolo) → zahoď.
          if (seq !== seqRef.current) return;
          setImages(fresh.images ?? []);
        })
        // Výpadok siete nie je dôvod nič hlásiť – ďalší tik to skúsi znova.
        .catch(() => undefined)
        .finally(() => {
          inFlightRef.current = false;
        });
    }, PENDING_IMAGE_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasPending, post.can_manage, post.id]);

  return images;
}
