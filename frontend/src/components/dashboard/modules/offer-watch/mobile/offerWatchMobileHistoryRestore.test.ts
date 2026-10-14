import { withDesktopSettingsHistory } from '../../../hooks/desktopSettingsNavigation';
import { withOfferWatchMobileHistory } from './offerWatchMobileNavigation';
import {
  readOfferWatchResultsReturnTarget,
  readRestorableOfferWatchMobileHistory,
} from './offerWatchMobileHistoryRestore';

describe('Offer Watch results history shared across mobile and desktop', () => {
  it.each(['/dashboard/watches?watch=7#results', '/dashboard/watches/?from=results#list'])(
    'preserves the exact results return target %s', (url) => {
      const target = { moduleId: 'watches', url };
      const state = withDesktopSettingsHistory({ nextInternal: 'kept' }, target, 2);
      expect(readOfferWatchResultsReturnTarget(state)).toEqual(target);
      expect(readRestorableOfferWatchMobileHistory(state)).toEqual({
        version: 2, origin: 'results', view: { kind: 'list' },
      });
      expect(state.nextInternal).toBe('kept');
    },
  );

  it.each([
    null, undefined, [], 'state',
    { __svaplyDesktopSettings: { version: 2, returnTarget: { moduleId: 'watches', url: '/dashboard/watches' } } },
    withDesktopSettingsHistory({}, { moduleId: 'profile', url: '/dashboard/users/7' }),
    withDesktopSettingsHistory({}, { moduleId: 'watches', url: '/dashboard/watches/extra' }),
    withDesktopSettingsHistory({}, { moduleId: 'watches', url: '/dashboard/settings/watches' }),
    withDesktopSettingsHistory({}, { moduleId: 'watches', url: 'https://outside.example/dashboard/watches' }),
  ])('does not turn unrelated or invalid history into a results return %#', (state) => {
    expect(readOfferWatchResultsReturnTarget(state)).toBeNull();
    expect(readRestorableOfferWatchMobileHistory(state)).toBeNull();
  });

  it('prioritizes an actual saved mobile step over desktop fallback metadata', () => {
    const marker = { version: 2, origin: 'results', view: { kind: 'edit', watchId: 7, picker: 'country' } } as const;
    const state = withOfferWatchMobileHistory(
      withDesktopSettingsHistory({}, { moduleId: 'watches', url: '/dashboard/watches' }, 2),
      marker,
    );
    expect(readRestorableOfferWatchMobileHistory(state)).toEqual(marker);
  });

  it('keeps the legacy Settings origin even if unrelated desktop metadata is present', () => {
    const marker = { version: 2, origin: 'settings', view: { kind: 'create' } } as const;
    const state = withOfferWatchMobileHistory(
      withDesktopSettingsHistory({}, { moduleId: 'watches', url: '/dashboard/watches' }),
      marker,
    );
    expect(readRestorableOfferWatchMobileHistory(state)).toEqual(marker);
  });

  it('uses the canonical results path fallback if the registry cannot resolve it', () => {
    jest.doMock('../../../components/dashboardRoutes', () => ({ dashboardSectionPath: () => null }));
    try {
      jest.isolateModules(() => {
        const fallback = require('./offerWatchMobileHistoryRestore');
        const state = withDesktopSettingsHistory({}, { moduleId: 'watches', url: '/dashboard/watches' });
        expect(fallback.readOfferWatchResultsReturnTarget(state)).toEqual({ moduleId: 'watches', url: '/dashboard/watches' });
      });
    } finally {
      jest.dontMock('../../../components/dashboardRoutes');
    }
  });
});
