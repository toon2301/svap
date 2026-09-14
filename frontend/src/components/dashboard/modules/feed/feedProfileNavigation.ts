'use client';

/**
 * Preklik na profil používateľa z Nástenky – jedno miesto pre celú appku.
 *
 * Appka na to má zavedený globálny `goToUserProfile` event (dashboard ho
 * počúva a prepne modul bez reloadu). Ten istý event už používa zoznam
 * lajkujúcich, správy aj upozornenia – tu je len vytiahnutý do funkcie, aby
 * hlavička príspevku a komentáre nemuseli poznať jeho detaily a aby sa
 * pravidlo „slug, inak id" nepísalo na piatich miestach.
 */

import type { FeedUserSummary } from '@/lib/feedApi';
import { requestFeedReturnCapture } from './feedReturnState';
import { preloadProfileAvatar } from '../profile/preloadAvatar';

/** Koho vieme otvoriť: čokoľvek so slugom alebo id (autor, komentujúci…). */
type ProfileTarget = (Pick<FeedUserSummary, 'id' | 'slug'> & {
  avatar_url?: string | null;
}) | null | undefined;

/** Adresa profilu: slug má prednosť, id je záloha pre účty bez slugu. */
export function profileIdentifier(user: ProfileTarget): string {
  const slug = String(user?.slug || '').trim();
  if (slug) return slug;
  const id = user?.id;
  return id ? String(id) : '';
}

/** Dá sa na tohto používateľa vôbec prekliknúť? */
export function canOpenUserProfile(user: ProfileTarget): boolean {
  return profileIdentifier(user) !== '';
}

/**
 * Otvorí profil používateľa.
 *
 * `beforeNavigate` je pre volajúcich, ktorí musia najprv zatvoriť sami seba
 * (dialóg, prehliadač fotky) – inak by ostali visieť nad profilom.
 */
export function openUserProfile(
  user: ProfileTarget,
  options: { beforeNavigate?: () => void } = {},
): void {
  const identifier = profileIdentifier(user);
  if (!identifier || typeof window === 'undefined') return;
  preloadProfileAvatar(user?.avatar_url);
  options.beforeNavigate?.();
  // Nástenka sa odchodom odmountuje – nech si stihne uložiť stav, kým je
  // ešte v DOM. Keď na obrazovke nie je, žiadosť sa ticho stratí.
  requestFeedReturnCapture();
  // Nový vstup (od vrchu, na Ponukách) si označí handler `goToUserProfile`
  // v dashboarde – rovnako pre všetkých, čo tento event posielajú.
  window.dispatchEvent(
    new CustomEvent('goToUserProfile', { detail: { identifier } }),
  );
}
