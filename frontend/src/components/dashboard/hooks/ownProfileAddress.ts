import { type User } from '@/types';

/**
 * Podstránky vlastného profilu, ktoré nesie adresa `/dashboard/users/<identifikátor>/<podstránka>`
 * (jazyk, účet, súkromie, úprava). Každá z nich otvára pravú položku profilu.
 */
const OWN_PROFILE_SUBPAGES = ['edit', 'account', 'privacy', 'language'];

/** Cesta `/dashboard/users/<identifikátor>` s voliteľnou jednou podstránkou a koncovou lomkou. */
const OWN_PROFILE_PATH = /^\/dashboard\/users\/([^/]+)(?:\/([^/]+))?\/?$/;

/**
 * Či identifikátor z adresy označuje práve prihláseného používateľa: jeho slug, alebo číselné ID
 * (staré odkazy nesú ID namiesto slugu a patria tomu istému účtu).
 */
export function isOwnProfileIdentifier(
  user: Pick<User, 'id' | 'slug'>,
  slugFromUrl: string | null | undefined,
  idFromUrl: number | null | undefined,
): boolean {
  if (user.slug && slugFromUrl === user.slug) return true;
  return user.id != null && idFromUrl != null && idFromUrl === user.id;
}

/**
 * Kanonická cesta vlastného profilu: slug namiesto číselného ID a podstránka z aktuálnej cesty, ak je
 * to podstránka vlastného profilu (`/dashboard/users/7/language` → `/dashboard/users/<slug>/language`).
 * Podstránku zachová len pri identifikátore, ktorý patrí tomuto používateľovi; pri inom ostáva holý slug,
 * aby cudzie ID nezískalo podstránku vlastného profilu.
 */
export function canonicalOwnProfilePath(slug: string, userId: number, currentPath: string): string {
  const base = `/dashboard/users/${slug}`;
  const match = OWN_PROFILE_PATH.exec(currentPath);
  if (!match) return base;

  const [, identifier, subpage] = match;
  const isOwnIdentifier = identifier === slug || identifier === String(userId);
  return isOwnIdentifier && subpage && OWN_PROFILE_SUBPAGES.includes(subpage) ? `${base}/${subpage}` : base;
}
