'use client';

/**
 * Nový vstup do profilu vs. pokračovanie v už otvorenom.
 *
 * Programový vstup do profilu (preklik na autora, notifikácia, „Profil"
 * v navigácii) je vstup do NIEČOHO INÉHO: profil sa má otvoriť od vrchu a na
 * záložke Ponuky, bez ohľadu na to, kde a v akej záložke bol používateľ pri
 * predošlej návšteve. Bez tohto ostával `<main>` odscrollovaný z predošlej
 * obrazovky (nikdy sa neodmountuje) a používateľ pristál v polovici stránky.
 *
 * Príznak nastavujú CENTRÁLNE miesta programového vstupu (`goToUserProfile`,
 * `goToMyProfile`, prepnutie na vlastný profil v navigácii), nie jednotlivé
 * kliky – inak by každý nový vstupný bod musel pamätať na príznak. Traversal
 * histórie (`syncModuleFromPath`) ho nenastavuje NIKDY a F5 ho nemá odkiaľ
 * zdediť (modulový stav reload neprežije) – tam sa obnovuje to, čo si
 * používateľ vybral.
 *
 * Príznak patrí CIEĽOVÉMU profilu. Preklik na profil, ktorý už je na
 * obrazovke, nič nemení – a príznak po ňom nesmie ostať visieť, inak by ho
 * spotreboval neskorší krok späť/dopredu do celkom iného profilu.
 */

import { getUserIdBySlug } from './profileUserCache';

/** Koho sa vstup týka: čokoľvek, čím sa profil dá spoznať. */
export type ProfileEntryTarget = {
  id?: number | null;
  slug?: string | null;
};

const PROFILE_FRESH_ENTRY_MARKED_EVENT = 'profile-fresh-entry-marked';

let pendingTarget: ProfileEntryTarget | null = null;

function normalizedSlug(slug: string | null | undefined): string {
  return String(slug ?? '').trim();
}

function resolvedId(target: ProfileEntryTarget): number | null {
  if (typeof target.id === 'number' && target.id > 0) return target.id;
  const slug = normalizedSlug(target.slug);
  return slug ? getUserIdBySlug(slug) ?? null : null;
}

/**
 * Je to ten istý profil?
 *
 * Vstup často pozná len slug (adresa prekliku), zobrazený profil len id –
 * slug sa preto dopočíta z cache, do ktorej ho zapíše samotné načítanie
 * profilu skôr, než sa profil zobrazí.
 */
function isSameProfile(a: ProfileEntryTarget, b: ProfileEntryTarget): boolean {
  const aSlug = normalizedSlug(a.slug);
  const bSlug = normalizedSlug(b.slug);
  if (aSlug && bSlug && aSlug === bSlug) return true;
  const aId = resolvedId(a);
  const bId = resolvedId(b);
  return aId !== null && bId !== null && aId === bId;
}

/** Cieľ vstupu z identifikátora v adrese (`goToUserProfile`): číslo = id, inak slug. */
export function profileEntryTargetFromIdentifier(identifier: string): ProfileEntryTarget {
  const value = identifier.trim();
  return /^\d+$/.test(value) ? { id: Number(value) } : { slug: value };
}

/** Programový vstup do profilu – ďalšie zobrazenie TOHTO profilu je nové. */
export function markProfileFreshEntry(target: ProfileEntryTarget): void {
  const hasIdentity = resolvedId(target) !== null || normalizedSlug(target.slug) !== '';
  pendingTarget = hasIdentity ? { id: target.id ?? null, slug: target.slug ?? null } : null;
  if (!pendingTarget || typeof window === 'undefined') return;
  // Profil, ktorý je práve na obrazovke, sa ozve sám: ak mieri vstup naň,
  // nič sa nemení a príznak zanikne hneď.
  window.dispatchEvent(new Event(PROFILE_FRESH_ENTRY_MARKED_EVENT));
}

/**
 * Zobrazený profil preberá príznak.
 *
 * Jednorazové a zahodí sa aj pri nezhode: príznak inému profilu patrí
 * vstupu, ktorý sa medzičasom neuskutočnil, a nesmie prežiť do ďalšej
 * navigácie.
 */
export function takeProfileFreshEntry(profile: ProfileEntryTarget): boolean {
  const target = pendingTarget;
  pendingTarget = null;
  return target !== null && isSameProfile(target, profile);
}

/** Vstup mieri na profil, ktorý už je na obrazovke – nič sa nemení. */
export function discardProfileFreshEntryFor(profile: ProfileEntryTarget): void {
  if (pendingTarget && isSameProfile(pendingTarget, profile)) pendingTarget = null;
}

/** Zobrazený profil počúva na nové vstupy (viď `discardProfileFreshEntryFor`). */
export function onProfileFreshEntryMarked(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PROFILE_FRESH_ENTRY_MARKED_EVENT, handler);
  return () => window.removeEventListener(PROFILE_FRESH_ENTRY_MARKED_EVENT, handler);
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetProfileFreshEntry(): void {
  pendingTarget = null;
}
