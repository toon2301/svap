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
 *
 * Sledovať tie isté fotky smie naraz len JEDEN vlastník. Okno detailu si ich
 * drží samo (podľa nich sa rozhoduje o rozložení) a karte v ňom ich podáva
 * hotové – preto `enabled`, ktorým sa druhá slučka nad tým istým príspevkom
 * vypne. Dva bežiace pollingy nad jedným endpointom by len zdvojnásobili
 * záťaž a vedeli by si medzi sebou preblikávať stav.
 */

import { useEffect, useRef, useState } from 'react';
import { getFeedPost, type FeedPost, type FeedPostImage } from '@/lib/feedApi';

const PENDING_IMAGE_POLL_INTERVAL_MS = 2500;
const PENDING_IMAGE_POLL_TIMEOUT_MS = 45000;

type UsePendingFeedImagesOptions = {
  /**
   * Smie táto inštancia pollovať? `false` = len zrkadlí `post.images`
   * (sledovanie beží inde, viď hlavičku súboru).
   */
  enabled?: boolean;
};

export function usePendingFeedImages(
  /** `null` = príspevok sa ešte načítava; vtedy niet čo sledovať. */
  post: FeedPost | null,
  { enabled = true }: UsePendingFeedImagesOptions = {},
): FeedPostImage[] {
  const [images, setImages] = useState<FeedPostImage[]>(post?.images ?? []);
  const startedAtRef = useRef<number | null>(null);
  // Guard proti prekrývajúcim sa requestom a proti zastaraným odpovediam:
  // pomalší starší request by inak dobehol po novšom a vrátil stav späť.
  const inFlightRef = useRef(false);
  const seqRef = useRef(0);

  /**
   * Zosúladenie s props počas RENDERU, nie v efekte.
   *
   * Props sú novší zdroj pravdy (obnovenie feedu, úprava príspevku, dokončené
   * načítanie v okne detailu) – zahoď rozbehnuté kolo. Efekt by nechal jeden
   * commit ešte so starým zoznamom; okno detailu sa ale podľa fotiek rozhoduje
   * o rozložení, takže by pri každom otvorení preblikol jeden stĺpec, kým by
   * efekt dobehol. Toto je odporúčaný vzor „úprava stavu pri zmene props":
   * React render zopakuje ešte pred commitom, takže sa medzistav nevykreslí.
   */
  const [syncedImages, setSyncedImages] = useState(post?.images);
  if (post?.images !== syncedImages) {
    setSyncedImages(post?.images);
    setImages(post?.images ?? []);
    seqRef.current += 1;
  }

  const hasPending = images.some((image) => image.status === 'pending');
  // Rozložené na primitívy, aby efekt nižšie nereštartoval nový objekt
  // príspevku, ktorý sa v ničom podstatnom nezmenil.
  const canManage = post?.can_manage === true;
  const postId = post?.id ?? null;

  useEffect(() => {
    if (!enabled || !canManage || !hasPending || postId == null) {
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
      void getFeedPost(postId)
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
  }, [enabled, hasPending, canManage, postId]);

  return images;
}
