'use client';

/**
 * Pomocné časti profilu cudzieho používateľa (`SearchUserProfileModule`):
 * tvar chyby z API a adresa avatara.
 */

import type { User } from '@/types';

/** Tvar chyby z API, z ktorého sa berie text pre používateľa. */
export type SearchProfileApiError = {
  /** Kód chyby knižnice axios (napr. `ERR_NETWORK`); pri chybe bez odpovede servera chýba `response`. */
  code?: string;
  response?: {
    status?: number;
    data?: {
      error?: string;
      detail?: string;
    };
  };
  message?: string;
};

const NETWORK_FAILURE_CODES = ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'];

/**
 * Server neodpovedal: výpadok siete, DNS alebo časový limit. Knižnica axios vtedy nenastaví `response`
 * a jej `message` je technický anglický text („Network Error“, „timeout of 30000ms exceeded“),
 * ktorý sa používateľovi ukázať nesmie.
 */
export function isNetworkFailure(error: SearchProfileApiError | null | undefined): boolean {
  return !error?.response && NETWORK_FAILURE_CODES.includes(String(error?.code));
}

/**
 * Druh zlyhania načítania profilu. V stave sa drží namiesto hotového textu, aby sa text preložil až pri
 * vykresľovaní: efekt s načítaním si pamätá `t` z čias, keď sa spustil (po čerstvom načítaní stránky je
 * ešte slovenský, jazyk sa nastaví až po pripojení), a hotový text by zostal v pôvodnom jazyku aj po jeho
 * zmene.
 */
export type ProfileLoadFailure =
  | { kind: 'notFound' | 'rateLimited' | 'network' | 'generic' }
  | { kind: 'server'; message: string };

export function classifyProfileLoadFailure(
  error: SearchProfileApiError | null | undefined,
): ProfileLoadFailure {
  const status = error?.response?.status;
  if (status === 404) return { kind: 'notFound' };
  if (status === 429) return { kind: 'rateLimited' };
  // Text, ktorý poslal server, sa ukáže tak, ako prišiel; technická správa knižnice (`message`) nikdy.
  const serverText = error?.response?.data?.error || error?.response?.data?.detail;
  if (typeof serverText === 'string' && serverText.trim()) {
    return { kind: 'server', message: serverText };
  }
  return { kind: isNetworkFailure(error) ? 'network' : 'generic' };
}

export function profileLoadFailureMessage(
  failure: ProfileLoadFailure,
  t: (key: string, fallback?: string) => string,
): string {
  switch (failure.kind) {
    case 'notFound':
      return t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.');
    case 'rateLimited':
      return t(
        'search.userProfileRateLimited',
        'Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.',
      );
    case 'server':
      return failure.message;
    case 'network':
      return t('common.networkError', 'Chyba siete. Skontrolujte pripojenie a skúste to znova.');
    default:
      return t('search.userProfileLoadError', 'Nepodarilo sa načítať profil používateľa.');
  }
}

function withStableAvatarVersion(url: string, version?: string | null): string {
  const cleanVersion = String(version || '').trim();
  if (!cleanVersion) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(cleanVersion)}`;
}

/** Adresa avatara aj s verziou (`updated_at`); `null`, keď profil žiadny nemá. */
export function getProfileAvatarUrl(user: User): string | null {
  const rawUrl = user.avatar_url || user.avatar || '';
  const cleanUrl = rawUrl.trim();
  return cleanUrl ? withStableAvatarVersion(cleanUrl, user.updated_at) : null;
}
