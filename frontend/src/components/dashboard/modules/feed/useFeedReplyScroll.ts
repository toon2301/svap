'use client';

/**
 * Posun zoznamu na novú odpoveď po jej odoslaní (R75 bod 4, len mobil).
 *
 * Na mobile sa odpoveď píše v poli dole, nie pod komentárom, takže po odoslaní nová odpoveď nemusí byť v zábere (rodičovský
 * komentár môže byť vysoko v zozname). Mutácia si preto poznačí id novej odpovede do `scrollToReplyRef` a tento hook po
 * commite, v ktorom je odpoveď už v DOM (zoznam aj rozbalenie vlákna sa menia spolu), doscrolluje zoznam k nej. Poznačenie
 * robí len mobilný režim, na počítači ostáva ref prázdny a hook nič nerobí.
 *
 * Posúva sa len keď odpoveď nie je celá vidieť; s malou rezervou nad ňou, aby bolo vidieť aj riadok „Skryť odpovede“ a spodok
 * komentára, ku ktorému patrí. Okamžite, bez animácie: používateľ práve odoslal, čakať na dojazd nemá zmysel (rovnako ako pri
 * novom komentári, K40). Posúva sa len samotný zoznam (`scrollTop`), nie stránka, ako to robí `scrollIntoView`.
 */

import { useEffect, useRef, type RefObject } from 'react';
import type { FeedPostComment } from '@/lib/feedApi';

/** Rezerva nad novou odpoveďou (px). */
export const REPLY_SCROLL_CONTEXT_PX = 72;
/** Odpoveď celá vo viditeľnej ploche s aspoň takým odstupom od okrajov sa nehýbe (px). */
const VISIBLE_MARGIN_PX = 8;

type UseFeedReplyScrollOptions = {
  scrollRef: RefObject<HTMLElement | null>;
  comments: FeedPostComment[];
  expandedReplies: Set<number>;
};

export function useFeedReplyScroll({
  scrollRef,
  comments,
  expandedReplies,
}: UseFeedReplyScrollOptions) {
  /** Id odpovede, ku ktorej sa má zoznam po commite doscrollovať (`null` = nič). */
  const scrollToReplyRef = useRef<number | null>(null);

  useEffect(() => {
    const id = scrollToReplyRef.current;
    if (id === null) return;
    const box = scrollRef.current;
    const reply = box?.querySelector<HTMLElement>(`[data-comment-id="${id}"]`);
    // Odpoveď ešte nie je v DOM (rozbalenie vlákna príde v najbližšom commite): počkáme na ďalšiu zmenu.
    if (!box || !reply) return;
    scrollToReplyRef.current = null;

    const boxRect = box.getBoundingClientRect();
    const rect = reply.getBoundingClientRect();
    const fullyVisible =
      rect.top >= boxRect.top + VISIBLE_MARGIN_PX &&
      rect.bottom <= boxRect.bottom - VISIBLE_MARGIN_PX;
    if (fullyVisible) return;

    const top = Math.max(
      0,
      box.scrollTop + (rect.top - boxRect.top) - REPLY_SCROLL_CONTEXT_PX,
    );
    // `scrollTo` jsdom nemá, preto fallback (rovnako ako pri posune na nový komentár).
    if (typeof box.scrollTo === 'function') {
      box.scrollTo({ top, behavior: 'auto' });
    } else {
      box.scrollTop = top;
    }
  }, [comments, expandedReplies, scrollRef]);

  return { scrollToReplyRef };
}
