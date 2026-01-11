"use client";

import { useEffect } from 'react';

export interface DashboardKeyboardProps {
  // Nevystavuje žiadne props, len naslúcha klávesovým skratkám
}

interface UseDashboardKeyboardParams {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Custom hook pre keyboard shortcuts v Dashboard
 */
export function useDashboardKeyboard({
  isSearchOpen,
  setIsSearchOpen,
}: UseDashboardKeyboardParams): DashboardKeyboardProps {

  // Global klávesová skratka "/" pre otvorenie vyhľadávania na desktop verzii
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignoruj, ak používateľ píše do inputu, textarey alebo je v modale
      const target = event.target as HTMLElement;
      const isInputActive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[role="dialog"]') !== null ||
        target.closest('[role="textbox"]') !== null ||
        document.body.classList.contains('filter-modal-open');

      // "/" - otvor vyhľadávanie (len na desktop verzii)
      if (event.key === '/' && !isInputActive) {
        // Skontroluj, či sme na desktop verzii (lg a vyššie)
        if (window.innerWidth >= 1024) {
          event.preventDefault();
          // Toggle search panel
          setIsSearchOpen((prev) => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, setIsSearchOpen]);

  return {};
}
