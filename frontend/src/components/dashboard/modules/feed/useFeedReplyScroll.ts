'use client';

/**
 * Posun zoznamu na novú odpoveď po jej odoslaní (R75 bod 4, len mobil).
 *
 * Na mobile sa odpoveď píše v poli dole, nie pod komentárom, takže po odoslaní nová odpoveď nemusí byť v zábere (rodičovský
 * komentár môže byť vysoko v zozname). Mutácia si preto poznačí id novej odpovede do `scrollToReplyRef` a tento hook po
 * commite, v ktorom je odpoveď už v DOM (zoznam aj rozbalenie vlákna sa menia spolu), doscrolluje zoznam k nej. Poznačenie
 * robí len mobilný režim, na počítači ostáva ref prázdny a hook nič nerobí.
 *
 * Posúva sa len keď odpoveď nie je celá vidieť; s malou rezervou nad ňou (72 px), aby bolo vidieť aj riadok „Skryť odpovede“ a
 * spodok komentára, ku ktorému patrí. Rezerva ustúpi vysokej odpovedi: pri otvorenej klávesnici je zoznam nízky (asi 340 px) a
 * odpoveď s 500 znakmi vysoká (asi 330 px), takže by pevná rezerva nechala jej spodok pod okrajom. Rezerva sa preto zmenší na
 * miesto, ktoré odpoveď nechá voľné (s odstupom od okraja), a odpoveď vyššia než zoznam sa zarovná k jeho vrchu. Okamžite, bez
 * animácie: používateľ práve odoslal, čakať na dojazd nemá zmysel (rovnako ako pri novom komentári, K40). Posúva sa len samotný
 * zoznam (`scrollTop`), nie stránka, ako to robí `scrollIntoView`.
 */

import { useEffect, useRef, type RefObject } from 'react';
import type { FeedPostComment } from '@/lib/feedApi';

/** Rezerva nad novou odpoveďou (px); pri vysokej odpovedi sa zmenší, aby sa odpoveď zmestila celá. */
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

    // Rezerva nesmie vytlačiť spodok odpovede pod okraj zoznamu: smie byť najviac také voľné miesto, aké odpoveď (s odstupom od
    // okraja) nechá; odpoveď vyššia než zoznam dostane rezervu 0 a zarovná sa k jeho vrchu.
    const context = Math.max(
      0,
      Math.min(
        REPLY_SCROLL_CONTEXT_PX,
        boxRect.height - rect.height - VISIBLE_MARGIN_PX,
      ),
    );
    const top = Math.max(0, box.scrollTop + (rect.top - boxRect.top) - context);
    // `scrollTo` jsdom nemá, preto fallback (rovnako ako pri posune na nový komentár).
    if (typeof box.scrollTo === 'function') {
      box.scrollTo({ top, behavior: 'auto' });
    } else {
      box.scrollTop = top;
    }
  }, [comments, expandedReplies, scrollRef]);

  return { scrollToReplyRef };
}
