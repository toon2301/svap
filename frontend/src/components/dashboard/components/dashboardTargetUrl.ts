/** Čítanie cieľovej adresy (`targetUrl`) v dashboarde: modul, profil a ID zvýraznenej karty. */

import { dashboardUserIdentifierFromPath } from './dashboardRoutes';

export function getDashboardModuleFromTarget(targetUrl: string): string | null {
  if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) {
    return null;
  }

  try {
    const path = new URL(targetUrl, 'https://swaply.local').pathname;
    if (path === '/dashboard' || path === '/dashboard/') return 'home';
    if (/^\/dashboard\/requests\/?$/.test(path)) return 'requests';
    if (/^\/dashboard\/messages(?:\/\d+)?\/?$/.test(path)) return 'messages';
    if (/^\/dashboard\/offers\/\d+\/reviews\/?$/.test(path)) return 'offer-reviews';
    if (/^\/dashboard\/settings\/notifications\/?$/.test(path)) return 'notification-settings';
    if (/^\/dashboard\/settings\/account\/?$/.test(path)) return 'account-settings';
    if (/^\/dashboard\/settings\/blocked\/?$/.test(path)) return 'blocked-users';
    if (/^\/dashboard\/notifications\/?$/.test(path)) return 'notifications';
    if (/^\/dashboard\/favorites\/?$/.test(path)) return 'favorites';
    if (/^\/dashboard\/search\/?$/.test(path)) return 'search';
    if (/^\/dashboard\/settings\/?$/.test(path)) return 'settings';
    if (/^\/dashboard\/language\/?$/.test(path)) return 'language';
    if (/^\/dashboard\/account-type\/?$/.test(path)) return 'account-type';
    if (/^\/dashboard\/privacy\/?$/.test(path)) return 'privacy';
    if (/^\/dashboard\/skills\/offer\/?$/.test(path)) return 'skills-offer';
    if (/^\/dashboard\/skills\/search\/?$/.test(path)) return 'skills-search';
    if (/^\/dashboard\/skills\/?$/.test(path)) return 'skills';
    if (/^\/dashboard\/profile\/?$/.test(path)) return 'profile';
    if (/^\/dashboard\/users\/[^/]+\/portfolio\/\d+\/?$/.test(path)) return 'portfolio-detail';
    if (/^\/dashboard\/users\/[^/]+\/portfolio\/create\/?$/.test(path)) return 'portfolio-create';
    if (/^\/dashboard\/users\/[^/]+\/portfolio\/?$/.test(path)) return 'user-profile';
    if (/^\/dashboard\/users\/[^/]+\/?$/.test(path)) return 'user-profile';
  } catch {
    return null;
  }

  return null;
}

export function getDashboardUserIdentifierFromTarget(targetUrl: string): string | null {
  try {
    const path = new URL(targetUrl, 'https://swaply.local').pathname;
    return dashboardUserIdentifierFromPath(path);
  } catch {
    return null;
  }
}

export function parseDashboardHighlightId(value: number | string | null | undefined): number | null {
  const id =
    typeof value === 'number'
      ? value
      : value != null && String(value).trim()
        ? Number(value)
        : null;
  return id != null && Number.isFinite(id) && Number.isInteger(id) && id >= 1 ? id : null;
}

export function getDashboardHighlightIdFromTarget(targetUrl: string): number | null {
  try {
    const searchParams = new URL(targetUrl, 'https://swaply.local').searchParams;
    const raw = searchParams.get('offer') ?? searchParams.get('highlight');
    return parseDashboardHighlightId(raw);
  } catch {
    return null;
  }
}
