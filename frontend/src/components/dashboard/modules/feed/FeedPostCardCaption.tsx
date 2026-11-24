'use client';

/**
 * Text voľného príspevku v karte: hlavička karty, potom TENTO text, potom fotky.
 *
 * Presunuté z `FeedPostCard.tsx` (karta má 498 riadkov a nesmie rásť nad 500): obal `px-4 py-3` s `fixedBlock` aj
 * `FeedPostCaption` s rovnakými vlastnosťami sú ako predtým, podmienku `!isShared && caption` drží karta. Pribudla len
 * vetva pre okno detailu s príspevkom len s textom (`useFeedDetailTextOnly`, R73): v ľavom stĺpci takého okna nie je čo
 * iné ukázať, takže obal je pružný (`min-h-0 flex-1`), text sa ukáže celý (bez „Viac") a posúva sa len on, keď sa
 * nezmestí. Všade inde ostáva obal pevný blok (`fixedBlock`) a text sa správa ako doteraz.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňom je obal textu a ostáva PRIAMYM potomkom koreňa karty, nič sa neobaľuje.
 */

import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';
import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';

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
  const textOnlySplit = useFeedDetailTextOnly();

  return (
    <div
      className={`px-4 py-3 ${
        textOnlySplit
          ? 'subtle-scrollbar min-h-0 flex-1 overflow-y-auto'
          : fixedBlock
      }`}
    >
      <FeedPostCaption
        // Pri prechode do okna len s textom (napr. zamietnutie poslednej fotky počas otvoreného okna) ostáva karta
        // pripojená, no stav „rozbalené" by prežil a text by ostal v rámiku s prepínačom: zmena kľúča ho vynuluje.
        key={textOnlySplit ? 'cely' : 'orezany'}
        text={caption}
        boundedExpansion={isDetail}
        expansionBound={fillHeight ? 'roomy' : 'compact'}
        maxLines={
          isDetail
            ? textOnlySplit
              ? 0
              : DETAIL_CAPTION_LINES
            : CARD_CAPTION_LINES
        }
        collapseBlankLines
        onTextClick={onTextClick}
      />
    </div>
  );
}
