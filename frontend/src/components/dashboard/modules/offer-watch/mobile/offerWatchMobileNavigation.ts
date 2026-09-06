export const OFFER_WATCH_MOBILE_REQUEST_EVENT = 'svaply:offer-watch-mobile-request';
export const OFFER_WATCH_SETTINGS_PATH = '/dashboard/settings/watches';

const HISTORY_KEY = '__svaplyOfferWatchMobile';

export type OfferWatchMobileView =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; watchId: number };

export type OfferWatchMobileHistory = {
  version: 1;
  origin: 'settings' | 'direct';
  view: OfferWatchMobileView;
};

type HistoryRecord = Record<string, unknown>;

function asHistoryRecord(value: unknown): HistoryRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as HistoryRecord
    : {};
}

function isValidView(value: unknown): value is OfferWatchMobileView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<OfferWatchMobileView>;
  if (candidate.kind === 'list' || candidate.kind === 'create') return true;
  return candidate.kind === 'edit'
    && Number.isSafeInteger(candidate.watchId)
    && Number(candidate.watchId) > 0;
}

export function isOfferWatchSettingsPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === OFFER_WATCH_SETTINGS_PATH;
}

export function requestOfferWatchMobile(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT));
}

export function readOfferWatchMobileHistory(state: unknown): OfferWatchMobileHistory | null {
  const value = asHistoryRecord(state)[HISTORY_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<OfferWatchMobileHistory>;
  if (
    candidate.version !== 1
    || (candidate.origin !== 'settings' && candidate.origin !== 'direct')
    || !isValidView(candidate.view)
  ) {
    return null;
  }
  return candidate as OfferWatchMobileHistory;
}

export function withOfferWatchMobileHistory(
  state: unknown,
  marker: OfferWatchMobileHistory,
): HistoryRecord {
  return { ...asHistoryRecord(state), [HISTORY_KEY]: marker };
}

export function withoutOfferWatchMobileHistory(state: unknown): HistoryRecord {
  const next = { ...asHistoryRecord(state) };
  delete next[HISTORY_KEY];
  return next;
}

