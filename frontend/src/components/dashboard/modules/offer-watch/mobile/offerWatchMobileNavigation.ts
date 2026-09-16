import type { OfferWatchPickerKind } from '../offerWatchSelectionOptions';
import { dashboardSectionPath } from '../../../components/dashboardRoutes';

export const OFFER_WATCH_MOBILE_REQUEST_EVENT = 'svaply:offer-watch-mobile-request';

// Obe adresy hovorí `DASHBOARD_ROUTES`, aby mobilný hosť a zvyšok appky nemali
// dve rôzne predstavy o tej istej obrazovke. Náhrada za `null` je len typová
// podlaha – že sa nepoužije, drží test zapisovačov.
export const OFFER_WATCH_SETTINGS_PATH =
  dashboardSectionPath('settings', 'offer-watches') ?? '/dashboard/settings/watches';
/** Adresa Nastavení – návratový bod pod obrazovkou sledovaných ponúk. */
export const OFFER_WATCH_RETURN_PATH = dashboardSectionPath('settings') ?? '/dashboard/settings';

const HISTORY_KEY = '__svaplyOfferWatchMobile';
const SETTINGS_RETURN_KEY = '__svaplyOfferWatchSettingsReturn';

export type OfferWatchMobilePicker = OfferWatchPickerKind;

export type OfferWatchMobileView =
  | { kind: 'list' }
  | { kind: 'create'; picker?: OfferWatchMobilePicker }
  | { kind: 'edit'; watchId: number; picker?: OfferWatchMobilePicker };

export type OfferWatchMobileHistory = {
  version: 2;
  origin: 'settings' | 'direct';
  view: OfferWatchMobileView;
};

type OfferWatchSettingsReturnHistory = {
  version: 1;
};

type HistoryRecord = Record<string, unknown>;

function asHistoryRecord(value: unknown): HistoryRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as HistoryRecord
    : {};
}

function readValidPicker(value: unknown): OfferWatchMobilePicker | null {
  return value === 'category' || value === 'country' || value === 'district'
    ? value
    : null;
}

function readValidView(value: unknown): OfferWatchMobileView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const hasPicker = Object.prototype.hasOwnProperty.call(candidate, 'picker');
  const picker = hasPicker ? readValidPicker(candidate.picker) : null;
  if (candidate.kind === 'list') return hasPicker ? null : { kind: 'list' };
  if (candidate.kind === 'create') {
    if (hasPicker && !picker) return null;
    return picker ? { kind: 'create', picker } : { kind: 'create' };
  }
  if (
    candidate.kind !== 'edit'
    || !Number.isSafeInteger(candidate.watchId)
    || Number(candidate.watchId) <= 0
    || (hasPicker && !picker)
  ) {
    return null;
  }
  const watchId = Number(candidate.watchId);
  return picker ? { kind: 'edit', watchId, picker } : { kind: 'edit', watchId };
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
  const view = readValidView(candidate.view);
  if (
    candidate.version !== 2
    || (candidate.origin !== 'settings' && candidate.origin !== 'direct')
    || !view
  ) {
    return null;
  }
  return {
    version: 2,
    origin: candidate.origin,
    view,
  };
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

export function hasOfferWatchSettingsReturnHistory(state: unknown): boolean {
  const value = asHistoryRecord(state)[SETTINGS_RETURN_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (value as Partial<OfferWatchSettingsReturnHistory>).version === 1;
}

export function withOfferWatchSettingsReturnHistory(state: unknown): HistoryRecord {
  return {
    ...asHistoryRecord(state),
    [SETTINGS_RETURN_KEY]: { version: 1 } satisfies OfferWatchSettingsReturnHistory,
  };
}

export function withoutOfferWatchSettingsReturnHistory(state: unknown): HistoryRecord {
  const next = { ...asHistoryRecord(state) };
  delete next[SETTINGS_RETURN_KEY];
  return next;
}
