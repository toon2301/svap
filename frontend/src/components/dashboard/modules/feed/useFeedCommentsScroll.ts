'use client';

/**
 * Posun zoznamu komentárov a indikátor nových komentárov (krok 5 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu: ohraničená scrollovateľná plocha (`scrollRef`), požadované doscrollovanie po commite
 * (`scrollToTopRef`), počet komentárov, ktoré prišli, kým používateľ čítal vyššie v zozname
 * (`newCommentsCount`), a callbacky okolo nich (`scrollListToTop`, `announceNewComments`, `handleListScroll`,
 * `handleNewCommentsClick`).
 *
 * Efekt, ktorý po commite nového zoznamu doscrolluje navrch, ostáva v komponente: poradie efektov sa nesmie
 * meniť (hook sám žiadny efekt nemá).
 *
 * Nález 346 (K40, R58): v mobilnom detaile leží nad komentármi hlavička (text, fotka, akcie), takže vrch zoznamu
 * (0) nie je začiatok komentárov. Doscrollovanie na 0 nechalo najnovší komentár z väčšej časti pod spodným
 * okrajom plochy a „pri vrchu“ sa merala od vrchu hlavičky, takže kto čítal na začiatku komentárov, dostal
 * indikátor namiesto posunu. Preto sa s hlavičkou meria od PRVÉHO komentára: zoznam sa doscrolluje tak, aby bol
 * navrchu viditeľnej plochy s malou rezervou. Bez hlavičky (počítač, panel nad fotkou, stránka príspevku) sa nič
 * nemení. Hook o hlavičke nedostáva nič od rodiča, zisťuje ju z DOM plochy (`measureCommentsStart`).
 */

import { useCallback, useRef, useState } from 'react';
import {
  NEAR_TOP_PX,
  commentsScrollTarget,
  isAtPostTop,
  isNearCommentsStart,
} from './feedCommentsLogic';

/**
 * Odstup prvého komentára od začiatku obsahu plochy (px), teda výška hlavičky nad komentármi.
 *
 * 0 znamená „nič sa nemení“, a to v troch prípadoch: zoznam nemá komentár (načítava sa, je prázdny), nad
 * komentármi nič nie je (zoznam je prvé dieťa plochy, ako na počítači a v paneli nad fotkou), alebo prehliadač
 * nehlási rozloženie (jsdom, skrytá plocha; rozmery sú nulové a z nich sa nič zmerať nedá).
 */
function measureCommentsStart(node: HTMLElement): number {
  const first = node.querySelector<HTMLElement>('[data-comment-id]');
  if (!first) return 0;
  if (node.firstElementChild?.contains(first)) return 0;
  const box = node.getBoundingClientRect();
  const rect = first.getBoundingClientRect();
  if (!box.height || !rect.height) return 0;
  return Math.max(0, rect.top - box.top + node.scrollTop);
}

export function useFeedCommentsScroll() {
  // Ohraničený scrollovateľný zoznam + požadované správanie doscrollovania po
  // commite (null = nescrollovať). Nový komentár ide na koniec, takže by inak
  // pribudol pod zlomom boxu a pôsobil by, akoby sa vôbec nepridal.
  // 'auto' = vlastný komentár (okamžite), 'smooth' = cudzí z pollingu.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToTopRef = useRef<ScrollBehavior | null>(null);
  /** Počet komentárov, ktoré prišli, kým používateľ čítal vyššie v zozname. */
  const [newCommentsCount, setNewCommentsCount] = useState(0);

  /**
   * Doscrolluje zoznam na začiatok komentárov: s hlavičkou nad nimi ide PRVÝ komentár navrch viditeľnej plochy
   * s malou rezervou, bez nej na vrch zoznamu (0). Cieľ nezávisí od výšky plochy ani komentára. Meria sa až
   * pri posune, po commite, takže prvý komentár je už ten nový. `scrollTo` jsdom nemá, preto fallback.
   */
  const scrollListToTop = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) return;
    const top = commentsScrollTarget(measureCommentsStart(node));
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top, behavior });
    } else {
      node.scrollTop = top;
    }
  }, []);

  /**
   * Reakcia na komentáre, ktoré priniesol polling – podľa toho, kde
   * používateľ práve je. Volá sa PRED commitom nového zoznamu, takže rozmery
   * uzla ešte popisujú stav spred pridania; presne to nás zaujíma (prvý komentár
   * leží na tom istom mieste, nový sa vloží pred neho).
   */
  const announceNewComments = useCallback((added: number) => {
    const node = scrollRef.current;
    const scrollTop = node ? node.scrollTop : 0;
    const commentsStart = node ? measureCommentsStart(node) : 0;
    // Kto je úplne navrchu príspevku, nad komentármi s hlavičkou, tomu sa nič nehýbe a nič nehlási,
    // rovnako ako doteraz. Pri krátkej hlavičke sa toto pásmo prekrýva s pásmom začiatku komentárov, preto
    // ide prvé.
    if (isAtPostTop(scrollTop, commentsStart)) return;
    // Nové komentáre pribúdajú NAVRCH zoznamu komentárov. Kto je pri ich začiatku, má ich rovno pred
    // sebou – vtedy stačí dorovnať pohľad, indikátor by len prekážal.
    if (isNearCommentsStart(scrollTop, commentsStart)) {
      scrollToTopRef.current = 'smooth';
      return;
    }
    // Číta staršie nižšie → pohľad mu netrháme, len ho upozorníme.
    setNewCommentsCount((current) => current + added);
  }, []);

  // Keď sa používateľ dostane navrch alebo na začiatok komentárov sám, indikátor už nemá čo hlásiť.
  const handleListScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (
      node.scrollTop <= NEAR_TOP_PX ||
      isNearCommentsStart(node.scrollTop, measureCommentsStart(node))
    ) {
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
