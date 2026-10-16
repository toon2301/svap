'use client';

/**
 * Klik na položku navigácie (ľavá lišta, spodná lišta na mobile).
 *
 * Opätovný klik na Domov, keď už je Nástenka aktívna, ju pošle na vrch.
 * Dovtedy sa nestalo nič (len pribudol duplicitný záznam v histórii). Ostatné
 * kliky idú nezmenené do toho istého lievika, akým prepína navigácia moduly.
 *
 * Scroll je tu, nie v samotnom lieviku: ten používa aj pristátie po zdieľaní
 * a onboarding, ktoré na Nástenku NESMÚ scrollovať.
 */

import { useCallback } from 'react';
import { scrollFeedToTop } from './feedHomeReturn';

export function useFeedHomeItemClick(
  activeModule: string,
  onItemClick: (itemId: string) => void,
): (itemId: string) => void {
  return useCallback(
    (itemId: string) => {
      if (itemId === 'home' && activeModule === 'home') scrollFeedToTop();
      onItemClick(itemId);
    },
    [activeModule, onItemClick],
  );
}
