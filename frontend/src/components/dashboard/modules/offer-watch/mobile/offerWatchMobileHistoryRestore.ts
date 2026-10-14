import { dashboardSectionPath } from '../../../components/dashboardRoutes';
import {
  readDesktopSettingsReturnTarget,
  type DesktopSettingsReturnTarget,
} from '../../../hooks/desktopSettingsNavigation';
import {
  readOfferWatchMobileHistory,
  type OfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

const RESULTS_PATH = dashboardSectionPath('watches') ?? '/dashboard/watches';

/** Recognize only a validated results return target, never another Settings session's origin. */
export function readOfferWatchResultsReturnTarget(state: unknown): DesktopSettingsReturnTarget | null {
  const target = readDesktopSettingsReturnTarget(state);
  if (!target || target.moduleId !== 'watches') return null;
  const pathname = new URL(target.url, 'https://swaply.local').pathname.replace(/\/+$/, '');
  return pathname === RESULTS_PATH ? target : null;
}

/** Restore the saved mobile step, or the results list after a desktop-to-mobile handoff. */
export function readRestorableOfferWatchMobileHistory(state: unknown): OfferWatchMobileHistory | null {
  return readOfferWatchMobileHistory(state)
    ?? (readOfferWatchResultsReturnTarget(state)
      ? { version: 2, origin: 'results', view: { kind: 'list' } }
      : null);
}
