'use client';

/**
 * Text príspevku – dlhý sa zbalí na tri riadky s prepínačom „…Viac"/„Menej".
 *
 * Orezáva sa CSS-kom (`line-clamp-3`, tú istú utilitu appka používa napr.
 * v náhľade zdieľaného príspevku), nie skrátením reťazca: koľko sa zmestí,
 * závisí od šírky karty, veľkosti písma aj jazyka, takže počítať znaky by
 * v jednom jazyku orezalo priskoro a v druhom vôbec. Text v DOM ostáva celý,
 * takže vyhľadávanie v stránke aj čítačky obrazovky vidia všetko.
 *
 * Či text vôbec PRESAHUJE tri riadky, sa nedá odhadnúť – meria sa až na
 * vyrenderovanom uzle (`scrollHeight` > `clientHeight` pri zapnutom orezaní).
 * Meria sa preto len v ZBALENOM stave; v rozbalenom sú obe výšky zhodné,
 * takže by prepínač zmizol hneď po prvom kliknutí.
 *
 * Stav je lokálny pre túto inštanciu, takže karty vo feede sa neovplyvňujú.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Trieda orezania. Píše sa DOSLOVA (nie cez interpoláciu): Tailwind hľadá celé
 * názvy tried v zdroji, takže `line-clamp-${n}` by sa do buildu nemuselo
 * dostať vôbec.
 */
const CLAMP_CLASS = 'line-clamp-3';
/**
 * Sub-pixelová tolerancia. Zaokrúhľovanie výšky riadku vie vyrobiť rozdiel
 * pár desatín pixela aj pri texte, ktorý sa v skutočnosti celý zmestí.
 */
const OVERFLOW_TOLERANCE_PX = 1;

type FeedPostCaptionProps = {
  text: string;
  /** Kvôli testom a prípadnému druhému výskytu na tej istej obrazovke. */
  testId?: string;
};

export default function FeedPostCaption({
  text,
  testId = 'feed-post-caption',
}: FeedPostCaptionProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  const measure = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    setOverflows(node.scrollHeight - node.clientHeight > OVERFLOW_TOLERANCE_PX);
  }, []);

  /** Text, ku ktorému patrí aktuálne meranie aj stav rozbalenia. */
  const measuredTextRef = useRef(text);

  // Pred vykreslením: zmeria sa hneď po zmene textu aj po zbalení.
  useLayoutEffect(() => {
    if (measuredTextRef.current !== text) {
      measuredTextRef.current = text;
      // Iný text = iné meranie. Po úprave príspevku sa musí začať zbalene,
      // inak by nový text ostal „zamrznutý" v rozbalenom stave predošlého.
      // Meranie prebehne hneď v ďalšom behu, keď je orezanie zapnuté.
      if (expanded) {
        setExpanded(false);
        return;
      }
    }
    if (expanded) return;
    measure();
  }, [text, expanded, measure]);

  // Preteká/nepreteká sa mení so šírkou – prepínač musí zmiznúť aj pribudnúť.
  useEffect(() => {
    if (expanded || typeof window === 'undefined') return;
    window.addEventListener('resize', measure);

    // Karta vie zmeniť šírku aj bez zmeny okna (rozbalené komentáre, panely).
    // ResizeObserver nie je všade (ani v testovom prostredí), preto voliteľne.
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && textRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(textRef.current);
    }
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [expanded, measure]);

  return (
    <div>
      <p
        ref={textRef}
        data-testid={testId}
        className={`whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100 ${
          expanded ? '' : CLAMP_CLASS
        }`}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          data-testid={`${testId}-toggle`}
          className="mt-0.5 text-sm font-medium text-gray-500 underline-offset-2 transition-colors hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:text-purple-300"
        >
          {expanded
            ? t('feed.captionLess', 'Menej')
            : t('feed.captionMore', '...Viac')}
        </button>
      ) : null}
    </div>
  );
}
