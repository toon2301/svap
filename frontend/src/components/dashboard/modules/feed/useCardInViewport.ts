'use client';

/**
 * Je karta práve v zornom poli?
 *
 * Slúži ako brzda pre polling počtov lajkov: bez nej by pri feede s desiatkami
 * kariet bežal request za každú z nich, hoci používateľ vidí naraz pár. Tým sa
 * cena polling-u viaže na to, čo je NA OBRAZOVKE, nie na dĺžku zoznamu.
 *
 * Vracia CALLBACK ref, nie objektový: efekt so `[]` by observer pripol len na
 * uzol, ktorý existoval pri prvom commite, takže neskôr vymenený (alebo
 * podmienene vykreslený) element by ostal nesledovaný. Callback ref beží pri
 * každom pripojení aj odpojení uzla, takže predošlý observer sa vždy odpojí.
 *
 * V prostrediach bez IntersectionObserver (staršie prehliadače, jsdom bez
 * mocku) ostane `false` – radšej nepollovať vôbec než pollovať všetko. Počty
 * sa vtedy aktualizujú pri bežnom obnovení feedu, ako doteraz.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCardInViewport<T extends Element>() {
  const [inViewport, setInViewport] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) {
      // Uzol zmizol – nič nesledujeme, takže ani netvrdíme, že je vidieť.
      setInViewport(false);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInViewport(entry.isIntersecting);
      },
      // Malá predsávka: karta tesne za okrajom sa počíta ako viditeľná, takže
      // počet je čerstvý už v momente, keď na ňu používateľ doscrolluje.
      { rootMargin: '100px' },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  // Odmountovanie komponentu callback ref s `null` zavolá, ale poistka pre
  // prípad, že by React uzol neuvoľnil (napr. chyba pri rendri).
  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, inViewport };
}
