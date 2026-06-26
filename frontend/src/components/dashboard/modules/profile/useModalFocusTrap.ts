'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Niektoré prvky modalu (napr. PortfolioCategoryPicker) renderujú svoj popup
 * (listbox) cez portal MIMO DOM stromu modalu. Taký popup patrí modalu, ak ho
 * nejaký ovládací prvok vnútri modalu vlastní cez aria-controls / aria-owns.
 * Bez tejto kontroly by focus trap považoval fokus v popupe za „uniknutý" a
 * vrátil ho na hranicu modalu (čím by rozbil navigáciu v listboxe).
 */
function isInsideOwnedPopup(root: HTMLElement, el: Node | null): boolean {
  if (!el) return false;
  const owners = Array.from(
    root.querySelectorAll<HTMLElement>('[aria-controls], [aria-owns]'),
  );
  for (const owner of owners) {
    const ids = `${owner.getAttribute('aria-controls') ?? ''} ${
      owner.getAttribute('aria-owns') ?? ''
    }`
      .split(/\s+/)
      .filter(Boolean);
    for (const id of ids) {
      const popup = document.getElementById(id);
      if (popup && (popup === el || popup.contains(el))) return true;
    }
  }
  return false;
}

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
      // Fokus je „v modali" aj keď je v portal-renderovanom popupe vlastnenom
      // ovládacím prvkom modalu (napr. listbox picker-a) – vtedy trap nezasahuje
      // a nechá popup spravovať vlastnú navigáciu.
      const insideModal =
        !!root.contains(activeEl) || isInsideOwnedPopup(root, activeEl);

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
