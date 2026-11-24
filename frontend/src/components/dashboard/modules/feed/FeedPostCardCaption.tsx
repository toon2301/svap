'use client';

/**
 * Text voľného príspevku v karte: hlavička karty, potom TENTO text, potom fotky.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok 3a K58; karta má 498 riadkov a nesmie rásť nad 500): obal `px-4 py-3`
 * s `fixedBlock` aj `FeedPostCaption` s rovnakými vlastnosťami sú ako predtým, mení sa len odsadenie a podmienku
 * `!isShared && caption` drží karta. Komponent nemá vlastný stav ani hooky; všetko dostáva od karty ako vlastnosti.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňom je obal textu a ostáva PRIAMYM potomkom koreňa karty, nič sa neobaľuje.
 * Trieda `fixedBlock` (`shrink-0` pri `fillHeight`, inak prázdna) ide ako vlastnosť do toho istého `className`.
 */

import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';

type FeedPostCardCaptionProps = {
  caption: string;
  isDetail: boolean;
  fillHeight: boolean;
  /** Trieda pevného bloku pružného stĺpca: `shrink-0` pri `fillHeight`, inak prázdny reťazec. */
  fixedBlock: string;
  /** Ťuk na samotný text (mobilná karta ním otvára detail); `undefined` = text nie je ťukateľný. */
  onTextClick: (() => void) | undefined;
};

export default function FeedPostCardCaption({
  caption,
  isDetail,
  fillHeight,
  fixedBlock,
  onTextClick,
}: FeedPostCardCaptionProps) {
  return (
    <div className={`px-4 py-3 ${fixedBlock}`}>
      <FeedPostCaption
        text={caption}
        boundedExpansion={isDetail}
        expansionBound={fillHeight ? 'roomy' : 'compact'}
        maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
        collapseBlankLines
        onTextClick={onTextClick}
      />
    </div>
  );
}
