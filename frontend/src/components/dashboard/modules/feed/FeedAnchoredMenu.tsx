'use client';

/**
 * Rozbaľovacie menu ukotvené k tlačidlu, vykreslené PORTÁLOM.
 *
 * Karta príspevku má `overflow-hidden` (kvôli zaobleným rohom a fotkám), takže
 * menu vykreslené vnútri nej sa oreže jej hranicami – a cez `overflow` sa
 * `z-index` nedostane, orezanie rieši jedine vykreslenie mimo tohto podstromu.
 *
 * Vzor je prevzatý z `MessageActionsMenu`: portál do `#app-root` (fallback
 * `document.body`), pozícia počítaná z `getBoundingClientRect()` spúšťača
 * a priehľadná celoobrazovková vrstva, ktorá zároveň rieši klik mimo menu.
 * Tá je pri portáli podstatná – menu už nie je potomkom karty, takže kontrola
 * cez `contains()` na jej kontajneri by ho zatvorila ešte pred kliknutím
 * na položku.
 *
 * Menu sa zmestí do obrazovky: keď dole nie je miesto, otvorí sa nahor,
 * a vodorovne aj zvisle sa drží v okne.
 */

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const MENU_WIDTH = 224; // w-56
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
/** Kým sa menu nezmeria, počíta sa s touto výškou (3 položky). */
const FALLBACK_HEIGHT = 156;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

type FeedAnchoredMenuProps = {
  open: boolean;
  /** Pozícia spúšťača vo viewporte – odčítaná pri otvorení. */
  anchorRect: DOMRect | null;
  onClose: () => void;
  ariaLabel?: string;
  testId?: string;
  children: ReactNode;
};

export default function FeedAnchoredMenu({
  open,
  anchorRect,
  onClose,
  ariaLabel,
  testId,
  children,
}: FeedAnchoredMenuProps) {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuHeight, setMenuHeight] = useState(FALLBACK_HEIGHT);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const update = () => {
      setViewport((current) =>
        current.width === window.innerWidth &&
        current.height === window.innerHeight
          ? current
          : { width: window.innerWidth, height: window.innerHeight },
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  // Skutočná výška rozhoduje, či sa menu vojde pod spúšťač.
  useLayoutEffect(() => {
    if (!open) return;
    const measured = menuRef.current?.offsetHeight ?? 0;
    if (measured <= 0) return;
    setMenuHeight((current) => (current === measured ? current : measured));
  }, [open, children]);

  const position = useMemo(() => {
    if (!anchorRect || viewport.width <= 0 || viewport.height <= 0) return null;

    const maxHeight = Math.max(0, viewport.height - VIEWPORT_PADDING * 2);
    const height = Math.min(menuHeight || FALLBACK_HEIGHT, maxHeight);
    const spaceBelow = viewport.height - anchorRect.bottom - MENU_GAP;
    const spaceAbove = anchorRect.top - MENU_GAP;
    const opensUp = spaceBelow < height && spaceAbove > spaceBelow;
    const top = clamp(
      opensUp
        ? anchorRect.top - height - MENU_GAP
        : anchorRect.bottom + MENU_GAP,
      VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, viewport.height - height - VIEWPORT_PADDING),
    );
    // Zarovnané na PRAVÚ hranu spúšťača (menu je v pravom hornom rohu karty).
    const left = clamp(
      anchorRect.right - MENU_WIDTH,
      VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, viewport.width - MENU_WIDTH - VIEWPORT_PADDING),
    );
    return { top, left, maxHeight };
  }, [anchorRect, menuHeight, viewport.height, viewport.width]);

  if (!open || !portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[105] bg-transparent"
      onClick={onClose}
      data-testid={testId ? `${testId}-layer` : undefined}
    >
      <div
        ref={menuRef}
        role="menu"
        aria-label={ariaLabel}
        data-testid={testId}
        style={position ?? undefined}
        className="absolute w-56 overflow-y-auto subtle-scrollbar rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    portalNode,
  );
}
