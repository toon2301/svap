'use client';

/**
 * Výber podoby detailu príspevku podľa šírky okna prehliadača (nález 360, R82): na počítači okno
 * (`FeedPostDetailOverlay`), na mobile obrazovka (`FeedPostMobileDetailHost`).
 *
 * Cieľ okna (upozornenie, adresa príspevku, karta na počítači) je jeden a záznam v histórii má v oboch podobách rovnaký
 * (`feedOverlayHistory`), takže sa líši len to, čo sa nakreslí. Šírku okna číta tento komponent a nie
 * `DashboardContentView`: ten je čisto skladací komponent bez stavu a po vyriešení šírky sa nesmie prekresľovať.
 *
 * Kým sa šírka nevyrieši (prvé vykreslenie), nemontuje sa ani jedna podoba. Inak by sa na mobile na okamih otvorilo okno
 * pre počítač, začalo by príspevok načítavať a vzápätí by ho nahradila obrazovka s druhým načítaním.
 *
 * Podoba sa určí RAZ, pri otvorení detailu, a drží sa až do jeho zatvorenia. Prechod cez hranicu 1 024 px pri otvorenom
 * detaile (napríklad otočenie tabletu) ju nemení. Výmena podoby by odmountovala tú, v ktorej používateľ práve píše komentár
 * (text aj priebeh odosielania žijú v jej stave, viď `useFeedCommentDraft`), zahodila by načítaný príspevok aj polohu v
 * komentároch a načítala ho znova (pripomienka Codexu a CodeRabbitu k PR 339). Okno si rozloženie pri zmene šírky
 * prispôsobuje samo (dva stĺpce ⇄ jeden) a obrazovka zaberá celú plochu, takže obe sú použiteľné v ktorejkoľvek šírke.
 * Pri ďalšom otvorení sa podoba určí znova podľa vtedajšej šírky.
 */

import { useState } from 'react';
import { useIsMobileState } from '@/hooks';
import FeedPostDetailOverlay from './FeedPostDetailOverlay';
import FeedPostMobileDetailHost from './FeedPostMobileDetailHost';

type Podoba = 'okno' | 'obrazovka';

type FeedPostDetailSwitchProps = {
  postId: number;
  /** Komentár z upozornenia: detail naň doscrolluje a zvýrazní ho. */
  highlightCommentId: number | null;
  onClose: () => void;
};

export default function FeedPostDetailSwitch({
  postId,
  highlightCommentId,
  onClose,
}: FeedPostDetailSwitchProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const [podoba, setPodoba] = useState<Podoba | null>(null);

  // Určenie podoby, keď je šírka okna prvýkrát vyriešená. Zápis stavu počas vykresľovania je tu zámerný: React komponent
  // hneď vykreslí znova s určenou podobou, takže sa nikdy nenakreslí neurčená ani nesprávna.
  if (podoba === null && isResolved) {
    setPodoba(isMobile ? 'obrazovka' : 'okno');
  }
  if (podoba === null) return null;

  return podoba === 'obrazovka' ? (
    <FeedPostMobileDetailHost postId={postId} highlightCommentId={highlightCommentId} onClose={onClose} />
  ) : (
    <FeedPostDetailOverlay postId={postId} highlightCommentId={highlightCommentId} onClose={onClose} />
  );
}
