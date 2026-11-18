'use client';

/**
 * Posun zoznamu komentárov a indikátor nových komentárov (krok 5 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny správania: ohraničená scrollovateľná plocha (`scrollRef`), požadované
 * doscrollovanie po commite (`scrollToTopRef`), počet komentárov, ktoré prišli, kým používateľ čítal vyššie
 * v zozname (`newCommentsCount`), a callbacky okolo nich (`scrollListToTop`, `announceNewComments`,
 * `handleListScroll`, `handleNewCommentsClick`).
 *
 * Efekt, ktorý po commite nového zoznamu doscrolluje navrch, ostáva v komponente: poradie efektov sa nesmie
 * meniť (hook sám žiadny efekt nemá). Posun navrch zámerne ostáva taký, aký bol (`scrollTo({ top: 0 })`).
 */

import { useCallback, useRef, useState } from 'react';
import { NEAR_TOP_PX } from './feedCommentsLogic';

export function useFeedCommentsScroll() {
  // Ohraničený scrollovateľný zoznam + požadované správanie doscrollovania po
  // commite (null = nescrollovať). Nový komentár ide na koniec, takže by inak
  // pribudol pod zlomom boxu a pôsobil by, akoby sa vôbec nepridal.
  // 'auto' = vlastný komentár (okamžite), 'smooth' = cudzí z pollingu.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToTopRef = useRef<ScrollBehavior | null>(null);
  /** Počet komentárov, ktoré prišli, kým používateľ čítal vyššie v zozname. */
  const [newCommentsCount, setNewCommentsCount] = useState(0);

  /** Doscrolluje zoznam navrch; `scrollTo` jsdom nemá, preto fallback. */
  const scrollListToTop = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) return;
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: 0, behavior });
    } else {
      node.scrollTop = 0;
    }
  }, []);

  /**
   * Reakcia na komentáre, ktoré priniesol polling – podľa toho, kde
   * používateľ práve je. Volá sa PRED commitom nového zoznamu, takže rozmery
   * uzla ešte popisujú stav spred pridania; presne to nás zaujíma.
   */
  const announceNewComments = useCallback((added: number) => {
    const node = scrollRef.current;
    // Nové komentáre pribúdajú NAVRCH. Kto je pri vrchu, má ich rovno pred
    // sebou – vtedy stačí dorovnať pohľad, indikátor by len prekážal.
    const distanceToTop = node ? node.scrollTop : 0;
    if (distanceToTop <= NEAR_TOP_PX) {
      scrollToTopRef.current = 'smooth';
      return;
    }
    // Číta staršie nižšie → pohľad mu netrháme, len ho upozorníme.
    setNewCommentsCount((current) => current + added);
  }, []);

  // Keď sa používateľ dostane navrch sám, indikátor už nemá čo hlásiť.
  const handleListScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (node.scrollTop <= NEAR_TOP_PX) {
      setNewCommentsCount((current) => (current === 0 ? current : 0));
    }
  }, []);

  const handleNewCommentsClick = useCallback(() => {
    scrollToTopRef.current = null;
    scrollListToTop('smooth');
    setNewCommentsCount(0);
  }, [scrollListToTop]);

  return {
    scrollRef,
    scrollToTopRef,
    newCommentsCount,
    setNewCommentsCount,
    scrollListToTop,
    announceNewComments,
    handleListScroll,
    handleNewCommentsClick,
  };
}
