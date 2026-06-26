'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Správa fokusu pre modálne okná:
 *  - po aktivácii uloží predchádzajúci fokus a obnoví ho pri deaktivácii,
 *  - Tab/Shift+Tab cykluje len v rámci `containerRef` (focus trap), takže fokus
 *    neunikne do pozadia za modalom.
 */
export function useModalFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      const insideModal = !!root.contains(activeEl);

      if (event.shiftKey) {
        if (activeEl === first || !insideModal) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !insideModal) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef]);
}
