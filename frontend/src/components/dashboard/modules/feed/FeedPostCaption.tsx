'use client';

/**
 * Text príspevku – dlhý sa zbalí na pár riadkov s prepínačom „Viac"/„Menej".
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
 * Triedy orezania podľa počtu riadkov. Píšu sa DOSLOVA (nie cez interpoláciu):
 * Tailwind hľadá celé názvy tried v zdroji, takže `line-clamp-${n}` by sa do
 * buildu nemuselo dostať vôbec. Preto je to mapa hotových názvov, nie výpočet.
 */
const CLAMP_CLASSES: Record<number, string> = {
  3: 'line-clamp-3',
  10: 'line-clamp-[10]',
};

/** Karta vo feede – text ustúpi fotke a ostatným príspevkom v zozname. */
export const CARD_CAPTION_LINES = 3;
/** Okno detailu – je oveľa väčšie, takže tri riadky by pôsobili zbytočne. */
export const DETAIL_CAPTION_LINES = 10;

/**
 * Zhluk PRÁZDNYCH riadkov (dva a viac) sa scvrkne na jedno zalomenie.
 *
 * Jeden prázdny riadok je bežné oddelenie odsekov a ostáva; až séria ďalších
 * robí v texte veľké diery, ktoré v okne zaberajú miesto komentárom.
 */
function collapseBlankRuns(text: string): string {
  return text.replace(/[ \t]*\n(?:[ \t]*\n){2,}[ \t]*/g, '\n');
}
/**
 * Sub-pixelová tolerancia. Zaokrúhľovanie výšky riadku vie vyrobiť rozdiel
 * pár desatín pixela aj pri texte, ktorý sa v skutočnosti celý zmestí.
 */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * Stropy rozbaleného textu. Píšu sa DOSLOVA z rovnakého dôvodu ako
 * `CLAMP_CLASSES` (Tailwind hľadá v zdroji celé názvy tried).
 *
 * - `compact` = jednostĺpcové okno detailu: text, akcie aj komentáre sú pod
 *   sebou, takže text si smie vziať nanajvýš štvrtinu obrazovky.
 * - `roomy` = dvojstĺpcové okno pri príspevku s fotkou: v ľavom stĺpci je s
 *   textom už len hlavička, fotka a riadok akcií, takže text má miesta viac.
 *   Strop je tam POISTKA, nie bežný stav – reálny caption (limit 500 znakov)
 *   sa pri šírke stĺpca zmestí do ~8 riadkov (~10 % výšky obrazovky), takže
 *   sa nadobudne len pri texte plnom vynútených zalomení. Práve on ale drží
 *   záruku, že ľavý stĺpec nikdy nescrolluje – viď FeedPostDetailSplitLayout.
 */
export const BOUNDED_EXPANDED_MAX_HEIGHT = {
  compact: 'max-h-[25vh]',
  roomy: 'max-h-[40vh]',
} as const;

export type CaptionExpansionBound = keyof typeof BOUNDED_EXPANDED_MAX_HEIGHT;

/**
 * Keďže sa v rámiku scrolluje, musí sa doň dať dostať aj Tabom – inak by časť
 * textu ostala pre ovládanie klávesnicou neprístupná (WCAG 2.1.1). Prsteň
 * fokusu je ten istý ako pri zozname komentárov, čo je jediná ďalšia takáto
 * oblasť v Nástenke.
 *
 * `subtle-scrollbar` je appkina utilita (tenký, zaoblený, so svetlým aj tmavým
 * variantom v globals.css) – tú istú má composer, zdieľací dialóg aj zoznam
 * komentárov, takže scrollbary vyzerajú všade rovnako.
 */
const BOUNDED_EXPANDED_CLASS =
  'subtle-scrollbar overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60';

type FeedPostCaptionProps = {
  text: string;
  /** Kvôli testom a prípadnému druhému výskytu na tej istej obrazovke. */
  testId?: string;
  /**
   * Rozbalený text dostane vlastný ohraničený rámik a scrolluje sa v ňom.
   *
   * V okne detailu je text súčasťou PEVNÉHO bloku nad komentármi. Bez stropu
   * by dosť dlhý rozbalený text vytlačil riadok akcií aj komentáre mimo
   * orezanú plochu okna, kam sa nedá doscrollovať. Na karte vo feede strop
   * netreba – tam sa stránka jednoducho predĺži.
   */
  boundedExpansion?: boolean;
  /**
   * Ako vysoko smie rozbalený text siahnuť, keď je `boundedExpansion` zapnuté.
   * Predvolene `compact`; dvojstĺpcové okno s fotkou si pýta `roomy`.
   */
  expansionBound?: CaptionExpansionBound;
  /**
   * Koľko riadkov je vidno pred „Viac". Karta vo feede musí ustúpiť fotke a
   * ďalším príspevkom, okno detailu má miesta podstatne viac.
   */
  maxLines?: number;
  /**
   * Scvrknúť zhluky prázdnych riadkov na jedno zalomenie.
   *
   * Veľké diery v texte tlačia na karte fotku a v okne akcie aj komentáre
   * nižšie – v oboch prípadoch bez toho, aby čokoľvek pridali. Prepínač ostáva
   * kvôli miestam, kde by sa text mal ukázať PRESNE tak, ako ho autor napísal
   * (napr. náhľad pri úprave).
   */
  collapseBlankLines?: boolean;
};

export default function FeedPostCaption({
  text: rawText,
  testId = 'feed-post-caption',
  boundedExpansion = false,
  expansionBound = 'compact',
  maxLines = CARD_CAPTION_LINES,
  collapseBlankLines = false,
}: FeedPostCaptionProps) {
  const text = collapseBlankLines ? collapseBlankRuns(rawText) : rawText;
  const clampClass = CLAMP_CLASSES[maxLines] ?? CLAMP_CLASSES[CARD_CAPTION_LINES];
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

  // Scrollovateľný je len ROZBALENÝ text v ohraničenom rámiku; zbalený sa
  // orezáva CSS-kom a scrollovať sa v ňom nedá, takže by z neho tab stop bol
  // len prekážka navyše.
  const scrollable = expanded && boundedExpansion;
  const sizeClass = expanded
    ? (boundedExpansion
        ? `${BOUNDED_EXPANDED_MAX_HEIGHT[expansionBound]} ${BOUNDED_EXPANDED_CLASS}`
        : '')
    : clampClass;

  return (
    <div>
      <p
        ref={textRef}
        data-testid={testId}
        role={scrollable ? 'region' : undefined}
        aria-label={
          scrollable ? t('feed.captionRegion', 'Text príspevku') : undefined
        }
        tabIndex={scrollable ? 0 : undefined}
        className={`whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100 ${sizeClass}`}
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
            : t('feed.captionMore', 'Viac')}
        </button>
      ) : null}
    </div>
  );
}
