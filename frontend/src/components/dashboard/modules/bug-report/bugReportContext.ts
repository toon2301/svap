import { readDesktopSettingsReturnTarget } from '../../hooks/desktopSettingsNavigation';

import type {
  BugReportDeviceType,
  BugReportLocale,
  BugReportPayload,
} from './types';

type BugReportContext = Pick<
  BugReportPayload,
  'source_screen' | 'device_type' | 'locale' | 'app_version' | 'browser'
>;

const SAFE_APP_VERSION_PATTERN = /^[A-Za-z0-9._+-]{1,64}$/;

export function getSemanticScreen(value: string): string {
  let pathname: string;

  try {
    pathname = new URL(value, 'https://svaply.local').pathname
      .replace(/\/+$/, '') || '/';
  } catch {
    return 'unknown';
  }

  if (pathname === '/dashboard') return 'home';

  const segments = pathname.split('/').filter(Boolean);
  const section = segments[1] ?? '';

  if (section === 'users') {
    const profileArea = segments[3] ?? '';
    if (profileArea === 'portfolio') return 'portfolio';
    if (profileArea === 'skills') return 'skills';
    if (profileArea === 'account' || profileArea === 'language' || profileArea === 'privacy') {
      return 'settings';
    }
    return 'profile';
  }

  const screenBySection: Record<string, string> = {
    search: 'search',
    messages: 'messages',
    favorites: 'favorites',
    requests: 'requests',
    notifications: 'notifications',
    statistics: 'statistics',
    profile: 'profile',
    'user-profile': 'profile',
    settings: 'settings',
    'account-type': 'settings',
    privacy: 'settings',
    language: 'settings',
    skills: 'skills',
    'skills-offer': 'skills',
    'skills-search': 'skills',
    'skills-select-category': 'skills',
    'skills-describe': 'skills',
    'skills-add-custom-category': 'skills',
    portfolio: 'portfolio',
    'portfolio-detail': 'portfolio',
    'portfolio-create': 'portfolio',
    reviews: 'reviews',
    'offer-reviews': 'reviews',
    offers: 'reviews',
    create: 'skills',
  };

  return screenBySection[section] ?? 'unknown';
}

export function getDeviceType(viewportWidth: number): BugReportDeviceType {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 'unknown';
  if (viewportWidth < 640) return 'mobile';
  if (viewportWidth < 1024) return 'tablet';
  return 'desktop';
}

export function getBrowserName(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/SamsungBrowser\//i.test(userAgent)) return 'Samsung Internet';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  return 'Other';
}

function getSourceScreen(): string {
  const currentScreen = getSemanticScreen(window.location.pathname);
  if (currentScreen !== 'settings') return currentScreen;

  const returnTarget = readDesktopSettingsReturnTarget(window.history.state);
  return returnTarget ? getSemanticScreen(returnTarget.url) : currentScreen;
}

function getAppVersion(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '';
  return SAFE_APP_VERSION_PATTERN.test(version) ? version : '';
}

export function collectBugReportContext(locale: BugReportLocale): BugReportContext {
  if (typeof window === 'undefined') {
    return {
      source_screen: 'unknown',
      device_type: 'unknown',
      locale,
      app_version: getAppVersion(),
      browser: 'Other',
    };
  }

  return {
    source_screen: getSourceScreen(),
    device_type: getDeviceType(window.innerWidth),
    locale,
    app_version: getAppVersion(),
    browser: getBrowserName(window.navigator.userAgent),
  };
}
