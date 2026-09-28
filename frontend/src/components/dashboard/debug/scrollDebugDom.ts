/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Čítanie DOM pre ladiaci pásik: krátke popisy prvkov, adresy a značiek.
 * Nič tu DOM appky nemení – len querySelector/getAttribute/getComputedStyle.
 * Do záznamu nejde text obsahu, len názvy tagov, atribúty a čísla.
 */

import { scrollFixLabel } from './scrollFixExperiment';

export const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';
export const SCROLL_DEBUG_PANEL_ATTR = 'data-scroll-debug-panel';

/** Z adresy len pathname a tieto kľúče – nič iné (hľadané výrazy a pod.). */
const URL_KEYS = ['offer', 'highlight', 'tab'];

/**
 * Značky DOM (best-effort, bez úprav komponentov nad 500 riadkov):
 * - brána: „Načítavam profil..." / „nenájdený" z `ViewedUserProfileGate`
 *   (chybový stav má role=alert a nepočíta sa),
 * - upraviť: tlačidlo Upraviť profil (len vlastný profil),
 * - zvýraznená: karta ponuky zo `?offer=`.
 */
export const DOM_MARKERS = [
  {
    key: 'brána',
    selector: `${DASHBOARD_MAIN_SELECTOR} [class="text-center py-20 text-gray-500 dark:text-gray-400"]:not([role])`,
  },
  { key: 'upraviť', selector: '[data-onboarding="profile-edit-button"]' },
  { key: 'zvýraznená', selector: '.highlight-offer-card' },
] as const;

export function findDashboardMain(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
}

export function isInDebugPanel(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : (target as Node | null)?.parentElement ?? null;
  return Boolean(element?.closest(`[${SCROLL_DEBUG_PANEL_ATTR}]`));
}

function describeOne(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const testId = element.getAttribute('data-testid');
  if (testId) return `${tag}[testid=${testId}]`;
  const onboarding = element.getAttribute('data-onboarding');
  if (onboarding) return `${tag}[onb=${onboarding}]`;
  const aria = element.getAttribute('aria-label');
  if (aria) return `${tag}[aria=${aria.slice(0, 24)}]`;
  if (element.hasAttribute('data-dashboard-main')) return `${tag}[main]`;
  const classes = (element.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return classes.length ? `${tag}.${classes.join('.')}` : tag;
}

/** Cieľ kliku: tag + testid/onboarding/aria alebo 2 triedy, a najbližší označený predok. */
export function describeTarget(target: EventTarget | null): string {
  if (typeof document !== 'undefined' && target === document) return 'document';
  if (typeof window !== 'undefined' && target === window) return 'window';
  if (!(target instanceof Element)) return '?';
  const own = describeOne(target);
  const anchor = target.parentElement?.closest('[data-testid],[data-onboarding],[aria-label]');
  return (anchor ? `${own} ⊂ ${describeOne(anchor)}` : own).slice(0, 90);
}

export function summarizeUrl(href: string): string {
  try {
    const url = new URL(href, 'http://localhost');
    const kept = URL_KEYS.filter((key) => url.searchParams.has(key)).map((key) => `${key}=${url.searchParams.get(key)}`);
    return kept.length ? `${url.pathname}?${kept.join('&')}` : url.pathname;
  } catch {
    return '?';
  }
}

export function domMarkerPresence(): Record<string, boolean> {
  const presence: Record<string, boolean> = {};
  for (const marker of DOM_MARKERS) presence[marker.key] = document.querySelector(marker.selector) !== null;
  return presence;
}

export function formatDomMarkers(presence: Record<string, boolean> = domMarkerPresence()): string {
  return DOM_MARKERS.map((marker) => `${marker.key}=${presence[marker.key] ? 1 : 0}`).join(' ');
}

export function shortUserAgent(ua: string): string {
  const os = ua.match(/(iPhone OS|CPU OS|Android|Windows NT|Mac OS X) ?[\d_.]*/)?.[0]?.replace(/_/g, '.');
  const version = ua.match(/Version\/[\d.]+/)?.[0];
  const browser =
    ua.match(/(CriOS|FxiOS|EdgiOS|Chrome|Firefox)\/\d+/)?.[0] ?? (/Safari\//.test(ua) ? 'Safari' : undefined);
  return [os, version, browser].filter(Boolean).join(' ') || '?';
}

function styleOf(element: Element | null, properties: Record<string, string>): string {
  if (!element) return '?';
  const style = window.getComputedStyle(element);
  return Object.entries(properties)
    .map(([label, property]) => `${label}=${style.getPropertyValue(property) || '?'}`)
    .join(' ');
}

/** Hlavička: prehliadač, režim, rozmery, computed štýly scrollera `<main>` a experiment. */
export function environmentLine(): string {
  const standalone =
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const viewport = window.visualViewport;
  const main = findDashboardMain();
  return [
    `ENV ${shortUserAgent(navigator.userAgent)}`,
    `standalone=${standalone ? 1 : 0}`,
    `ih=${window.innerHeight}`,
    `vv=${viewport ? Math.round(viewport.height) : '?'}`,
    `dpr=${window.devicePixelRatio}`,
    `main{${styleOf(main, {
      oy: 'overflow-y',
      sb: 'scroll-behavior',
      obY: 'overscroll-behavior-y',
      snap: 'scroll-snap-type',
      anchor: 'overflow-anchor',
    })}}`,
    `html{${styleOf(document.documentElement, { sb: 'scroll-behavior' })}}`,
    `body{${styleOf(document.body, { sb: 'scroll-behavior' })}}`,
    // Experiment B (nový `<main>` pri zmene modulu): `b` zapnutý, `-` vypnutý.
    `scrollfix=${scrollFixLabel()}`,
  ].join(' · ');
}
