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
 * pre počítač, začalo by príspevok načítavať a vzápätí by ho nahradila obrazovka s druhým načítaním. Prechod cez hranicu
 * 1 024 px pri otvorenom detaile (napríklad otočenie tabletu) vymení podobu za druhú; príspevok ostáva ten istý a načíta
 * sa znova.
 */

import { useIsMobileState } from '@/hooks';
import FeedPostDetailOverlay from './FeedPostDetailOverlay';
import FeedPostMobileDetailHost from './FeedPostMobileDetailHost';

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
  if (!isResolved) return null;

  return isMobile ? (
    <FeedPostMobileDetailHost postId={postId} highlightCommentId={highlightCommentId} onClose={onClose} />
  ) : (
    <FeedPostDetailOverlay postId={postId} highlightCommentId={highlightCommentId} onClose={onClose} />
  );
}
