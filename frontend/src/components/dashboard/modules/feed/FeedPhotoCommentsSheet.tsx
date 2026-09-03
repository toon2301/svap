'use client';

/**
 * Panel komentárov vysunutý zospodu nad fotkou (mobilný prehliadač Nástenky).
 *
 * Zaberá väčšinu obrazovky, hore ale nechá fotku aj hlavičku „vykúkať", takže
 * je stále vidieť, ku ktorému príspevku komentáre patria. Zatvára sa
 * potiahnutím nadol alebo úchytkou hore.
 *
 * ZOZNAM SÁM NEROBÍ NIČ: obsah je `FeedPostComments` – ten istý komponent ako
 * na karte a v okne detailu, takže načítavanie, polling, donačítavanie pri
 * scrollovaní, odpovede, lajky aj úprava sú spoločné, nie skopírované.
 *
 * PREČO `class="dark"` NA OBALE: panel má byť tmavý VŽDY, aj keď appka beží vo
 * svetlom režime – leží nad čiernym podkladom fotky a svetlá plocha by tam
 * bila do očí. Tailwind je v projekte na `darkMode: 'class'`, takže variant
 * `dark:` zapína ktorýkoľvek predok s triedou `dark`. Vnútro teda dostane
 * tmavú paletu bez toho, aby sa `FeedPostComments` musel učiť druhý motív.
 * Je to ZÁMERNÁ výnimka len pre tento panel v tomto kontexte.
 */

import { useCallback, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedPostComments from './FeedPostComments';

/** Ako ďaleko treba potiahnuť nadol, aby sa panel zavrel. */
const CLOSE_DRAG_DISTANCE_PX = 90;

type FeedPhotoCommentsSheetProps = {
  postId: number;
  open: boolean;
  onClose: () => void;
  onCountChange: (delta: number) => void;
  onTotalChange: (total: number) => void;
};

export default function FeedPhotoCommentsSheet({
  postId,
  open,
  onClose,
  onCountChange,
  onTotalChange,
}: FeedPhotoCommentsSheetProps) {
  const { t } = useLanguage();
  const dragStartRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStart = useCallback((clientY: number) => {
    dragStartRef.current = clientY;
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((clientY: number) => {
    const start = dragStartRef.current;
    if (start === null) return;
    // Len nadol – ťahanie nahor panel nikam neposúva.
    setDragOffset(Math.max(0, clientY - start));
  }, []);

  const handleTouchEnd = useCallback(() => {
    const dragged = dragOffset;
    dragStartRef.current = null;
    setDragOffset(0);
    if (dragged >= CLOSE_DRAG_DISTANCE_PX) onClose();
  }, [dragOffset, onClose]);

  /**
   * Systém gesto zrušil (prichádzajúci hovor, gesto prehliadača, viac prstov).
   *
   * Bez tohto by panel ostal odtiahnutý o poslednú nameranú vzdialenosť a
   * `dragStartRef` by držal starý začiatok, takže ďalší dotyk by skočil.
   * Zrušenie NIKDY nezatvára – to patrí len dokončenému gestu.
   */
  const handleTouchCancel = useCallback(() => {
    dragStartRef.current = null;
    setDragOffset(0);
  }, []);

  if (!open) return null;

  return (
    <div
      className="dark absolute inset-x-0 bottom-0 z-30 flex h-[78%] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#0f0f10] text-white shadow-2xl"
      data-testid="feed-photo-comments-sheet"
      style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
      // Klik vnútri panelu nesmie prepnúť ovládaciu vrstvu ani prebublať na
      // fotku pod ním.
      onClick={(event) => event.stopPropagation()}
    >
      {/* Úchytka: ťahá sa za ňu aj za nadpis, aby sa gesto dalo chytiť
          kdekoľvek v hlavičke panelu a nezápasilo so scrollom zoznamu. */}
      <div
        data-testid="feed-photo-comments-drag"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientY ?? 0)}
        onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientY ?? 0)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="shrink-0 cursor-grab px-4 pb-1 pt-2"
      >
        <button
          type="button"
          onClick={onClose}
          data-testid="feed-photo-comments-handle"
          aria-label={t('feed.commentsClose', 'Zavrieť komentáre')}
          className="mx-auto block h-1.5 w-10 rounded-full bg-white/35 transition-colors hover:bg-white/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        />
        <h2 className="mt-2 text-sm font-semibold text-white">
          {t('feed.comments', 'Komentáre')}
        </h2>
      </div>

      {/* `min-h-0` ruší automatické minimum flex položky – bez neho by zoznam
          panel roztiahol a pole na nový komentár by vypadlo z obrazovky. */}
      <div className="min-h-0 flex-1">
        <FeedPostComments
          postId={postId}
          fillHeight
          showTimestamp
          compactComposer
          onCountChange={onCountChange}
          onTotalChange={onTotalChange}
        />
      </div>
    </div>
  );
}
