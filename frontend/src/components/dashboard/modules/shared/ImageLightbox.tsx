'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Fullscreen prehliadač fotiek – spoločné jadro pre portfólio aj nástenku.
 *
 * Vzniklo presunom obalu z ``PortfolioLightbox``: prekrytie, zatváracie „X",
 * šípky, počítadlo, swipe, klávesnica aj zámok scrollovania boli od začiatku
 * nezávislé od toho, čie fotky sa zobrazujú. Portfólio-špecifické bolo len
 * trojo – tvar dát, hlášky a načítanie chránených obrázkov – a to sa sem
 * dostáva parametrami. Rovnaký prístup ako pri `FeedShareDialog`: jedno jadro,
 * tenké obaly okolo konkrétnych dát.
 *
 * Ovládanie je zámerne identické v oboch moduloch:
 *  - desktop: šípky po stranách (od `sm:`), Escape, šípky na klávesnici,
 *  - mobil: swipe doľava/doprava a veľké „X" v rohu,
 *  - klik na tmavé pozadie zatvára všade.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useModalFocusTrap } from '../profile/useModalFocusTrap';
import { isTopOverlayLayer, pushOverlayLayer } from './overlayLayers';
import { useProtectedImage } from './useProtectedImage';

export type ImageLightboxLabels = {
  /** Názov dialógu pre čítačky obrazovky. */
  dialog: string;
  close: string;
  previous: string;
  next: string;
  /**
   * Text počítadla. Funkcia, nie hotový reťazec – aktívnu fotku pozná až
   * prehliadač, takže by ho volajúci nevedel vyskladať dopredu.
   */
  counter: (current: number, total: number) => string;
};

type ImageLightboxProps = {
  open: boolean;
  /** URL fotiek v poradí zobrazenia (veľká varianta). */
  sources: string[];
  initialIndex: number;
  alt: string;
  labels: ImageLightboxLabels;
  onClose: () => void;
  /** Kvôli testom a odlíšeniu, keby raz boli dva na jednej obrazovke. */
  testId?: string;
  /**
   * Vlastná ovládacia vrstva NAD fotkou (hlavička, text, akcie…).
   *
   * Prehliadač ostáva tým, čím bol – prepínanie fotiek, swipe, klávesnica,
   * zámok scrollovania, fokus aj poradie vrstiev. Volajúci si len prikreslí
   * svoju vrstvu navrch; bez tejto props je prehliadač presne ako doteraz.
   */
  chrome?: ReactNode;
  /**
   * Klik/ťuk PRIAMO na fotku. Mobilný prehliadač Nástenky ním prepína, či je
   * jeho vrstva vidno. Bez neho je fotka na klik netečná (klik sa len
   * nepropaguje na podklad), rovnako ako doteraz.
   */
  onImageActivate?: () => void;
  /**
   * Zavrie klik na tmavý podklad? Predvolene áno. Prehliadač s vlastnou
   * vrstvou to vypína – tam je podklad plocha na prepínanie vrstvy, nie
   * zatváranie, a zatvára sa výhradne cez „X".
   */
  dismissOnBackdropClick?: boolean;
  /** Skryje vstavané „X" – volajúci má vlastné vo svojej vrstve. */
  hideCloseButton?: boolean;
  /**
   * Fotka dostane PEVNÝ rámec (celá plocha prehliadača) namiesto toho, aby si
   * rámec určila podľa vlastných rozmerov. Stále `object-contain`, takže sa
   * nič neoreže – len sa vysoká a široká fotka vykreslia v rovnakom ráme.
   */
  fixedFrame?: boolean;
};

const SWIPE_MIN_DISTANCE = 50;
const SWIPE_HORIZONTAL_DOMINANCE_RATIO = 1.25;

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export function ImageLightbox({
  open,
  sources,
  initialIndex,
  alt,
  labels,
  onClose,
  testId = 'image-lightbox',
  chrome,
  onImageActivate,
  dismissOnBackdropClick = true,
  hideCloseButton = false,
  fixedFrame = false,
}: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeSrc = sources[clampIndex(activeIndex, sources.length)];
  const hasMultiple = sources.length > 1;
  // Chránený obrázok načítame cez axios (blob); verejný prejde priamo.
  // Sťahujeme len keď je otvorený – zatvorený nič nefetchuje.
  const { resolvedSrc } = useProtectedImage(open ? activeSrc ?? null : null);

  // Uloženie a obnova fokusu + Tab trap – ten istý hook, aký používajú
  // ostatné dialógy appky, takže sa klávesnica po zatvorení vráti na fotku,
  // z ktorej sa prehliadač otvoril.
  useModalFocusTrap(open, containerRef);

  const goToPrevious = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((current) => (current === 0 ? sources.length - 1 : current - 1));
  }, [hasMultiple, sources.length]);

  const goToNext = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((current) => (current + 1) % sources.length);
  }, [hasMultiple, sources.length]);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      setPortalNode(document.getElementById('app-root') ?? document.body);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(clampIndex(initialIndex, sources.length));
  }, [initialIndex, open, sources.length]);

  useEffect(() => {
    if (open && sources.length === 0) {
      onClose();
    }
  }, [onClose, open, sources.length]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Prehliadač sa dá otvoriť aj NAD oknom detailu príspevku. Zaregistruje sa
  // preto ako vrstva: Escape zavrie najprv ju a až ďalšie stlačenie okno pod
  // ňou. Bez toho by jedno stlačenie zavrelo obe – oba listenery sedia na
  // `window`, takže sa navzájom nedajú zastaviť.
  const layerRef = useRef<symbol | null>(null);
  useEffect(() => {
    if (!open) return;
    const layer = pushOverlayLayer();
    layerRef.current = layer.id;
    return () => {
      layer.release();
      layerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isTopOverlayLayer(layerRef.current)) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose, open]);

  if (!mounted || !portalNode || !open || !activeSrc) return null;

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      className={`fixed inset-0 z-[112] flex items-center justify-center bg-black/95 focus:outline-none ${
        fixedFrame ? 'p-0' : 'p-4'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={labels.dialog}
      data-testid={testId}
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      {hideCloseButton ? null : (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={labels.close}
        data-testid={`${testId}-close`}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:inline-flex"
            aria-label={labels.previous}
            data-testid={`${testId}-prev`}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:inline-flex"
            aria-label={labels.next}
            data-testid={`${testId}-next`}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className={
          fixedFrame
            ? 'flex h-full w-full items-center justify-center'
            : 'flex max-h-full max-w-full items-center justify-center'
        }
        data-testid={`${testId}-frame`}
        onClick={(event) => {
          event.stopPropagation();
          onImageActivate?.();
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartRef.current = touch
            ? { x: touch.clientX, y: touch.clientY }
            : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          const touch = event.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !touch || !hasMultiple) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (
            Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
            Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_HORIZONTAL_DOMINANCE_RATIO
          ) {
            return;
          }
          if (deltaX < 0) {
            goToNext();
          } else {
            goToPrevious();
          }
        }}
      >
        {resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={alt}
            data-testid={`${testId}-image`}
            className={
              fixedFrame
                ? 'h-full w-full object-contain'
                : 'max-h-[calc(100vh-2rem)] max-w-full rounded-2xl object-contain shadow-2xl'
            }
          />
        ) : (
          // Neutrálny placeholder počas načítania/chyby (žiadna broken-image ikona).
          <div
            aria-hidden="true"
            className="h-[70vh] max-h-[calc(100vh-2rem)] w-[70vw] max-w-full rounded-2xl bg-white/5"
          />
        )}
      </div>

      {hasMultiple && (
        <div
          data-testid={`${testId}-counter`}
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white ${
            // S vlastnou vrstvou sedí dole riadok akcií – počítadlo by naň
            // sadlo, tak sa presunie nad fotku hore.
            chrome ? 'top-20' : 'bottom-4'
          }`}
        >
          {labels.counter(
            clampIndex(activeIndex, sources.length) + 1,
            sources.length,
          )}
        </div>
      )}

      {/* Vrstva volajúceho ide NAD fotku, ale ostáva súčasťou toho istého
          dialógu, takže s ňou fokus trap aj Escape fungujú bez ďalšej práce. */}
      {chrome}
    </div>,
    portalNode,
  );
}
