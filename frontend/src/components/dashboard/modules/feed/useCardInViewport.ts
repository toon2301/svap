'use client';

/**
 * Je karta práve v zornom poli?
 *
 * Slúži ako brzda pre polling počtov lajkov: bez nej by pri feede s desiatkami
 * kariet bežal request za každú z nich, hoci používateľ vidí naraz pár. Tým sa
 * cena polling-u viaže na to, čo je NA OBRAZOVKE, nie na dĺžku zoznamu.
 *
 * V prostrediach bez IntersectionObserver (staršie prehliadače, jsdom bez
 * mocku) vráti `false` – radšej nepollovať vôbec než pollovať všetko. Počty sa
 * vtedy aktualizujú pri bežnom obnovení feedu, ako doteraz.
 */

import { useEffect, useRef, useState } from 'react';

export function useCardInViewport<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
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
    return () => observer.disconnect();
  }, []);

  return { ref, inViewport };
}
