import {
  createDesktopSettingsReturnTarget,
  withDesktopSettingsHistory,
} from '../../hooks/desktopSettingsNavigation';

import {
  collectBugReportContext,
  getBrowserName,
  getDeviceType,
  getSemanticScreen,
} from './bugReportContext';

describe('bug report context', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  it('reduces dynamic paths, queries and fragments to a semantic screen', () => {
    expect(
      getSemanticScreen('/dashboard/users/105?email=user@example.com#private'),
    ).toBe('profile');
    expect(getSemanticScreen('/dashboard/messages/987?token=secret')).toBe('messages');
    expect(getSemanticScreen('/dashboard/offers/42/reviews?author=105')).toBe('reviews');
    expect(getSemanticScreen('/dashboard/users/105/portfolio/17')).toBe('portfolio');
    expect(getSemanticScreen('/dashboard/users/105/skills')).toBe('skills');
    expect(getSemanticScreen('/dashboard/users/105/privacy')).toBe('settings');
    expect(getSemanticScreen('/unexpected/private/value')).toBe('unknown');
  });

  it('uses the safe desktop return target while settings are open', () => {
    const returnTarget = createDesktopSettingsReturnTarget(
      'messages',
      '/dashboard/messages/987?conversation=private',
    );
    expect(returnTarget).not.toBeNull();

    window.history.replaceState(
      withDesktopSettingsHistory({}, returnTarget!),
      '',
      '/dashboard/settings',
    );
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

    expect(collectBugReportContext('sk')).toMatchObject({
      source_screen: 'messages',
      device_type: 'desktop',
      locale: 'sk',
    });
  });

  it('collects only bounded generic technical context', () => {
    window.history.replaceState({}, '', '/dashboard/statistics?user=105');
    process.env.NEXT_PUBLIC_APP_VERSION = '2026.07.30+web';
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 720 });

    expect(collectBugReportContext('en')).toEqual({
      source_screen: 'statistics',
      device_type: 'tablet',
      locale: 'en',
      app_version: '2026.07.30+web',
      browser: 'Other',
    });
  });

  it('classifies viewport and browser without retaining versions', () => {
    expect(getDeviceType(390)).toBe('mobile');
    expect(getDeviceType(800)).toBe('tablet');
    expect(getDeviceType(1440)).toBe('desktop');
    expect(getDeviceType(Number.NaN)).toBe('unknown');
    expect(getBrowserName('Mozilla/5.0 Edg/126.0.0.0')).toBe('Edge');
    expect(getBrowserName('Mozilla/5.0 Firefox/127.0')).toBe('Firefox');
    expect(getBrowserName('unknown agent with user data')).toBe('Other');
  });

  it('drops an invalid public app version instead of sending it', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = 'invalid version with spaces and / paths';
    window.history.replaceState({}, '', '/dashboard');

    expect(collectBugReportContext('de').app_version).toBe('');
  });
});
