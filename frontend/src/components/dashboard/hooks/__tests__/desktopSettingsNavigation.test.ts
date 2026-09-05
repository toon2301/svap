import {
  createDesktopSettingsReturnTarget,
  getDesktopSettingsSectionFromModule,
  getDesktopSettingsSectionFromPath,
  getDesktopSettingsSectionPath,
  normalizeDashboardUrl,
  readDesktopSettingsReturnTarget,
  withDesktopSettingsHistory,
  withoutDesktopSettingsHistory,
} from '../desktopSettingsNavigation';

describe('desktop settings navigation helpers', () => {
  it('captures only full dashboard modules as return targets', () => {
    expect(
      createDesktopSettingsReturnTarget(
        'messages',
        '/dashboard/messages/42?focus=latest',
      ),
    ).toEqual({
      moduleId: 'messages',
      url: '/dashboard/messages/42?focus=latest',
    });

    expect(
      createDesktopSettingsReturnTarget('statistics', '/dashboard/statistics'),
    ).toEqual({
      moduleId: 'statistics',
      url: '/dashboard/statistics',
    });

    expect(createDesktopSettingsReturnTarget('search', '/dashboard/search')).toBeNull();
    expect(
      createDesktopSettingsReturnTarget('notifications', '/dashboard/notifications'),
    ).toBeNull();
    expect(
      createDesktopSettingsReturnTarget('settings', '/dashboard/settings'),
    ).toBeNull();
  });

  it('rejects external and malformed return URLs', () => {
    expect(normalizeDashboardUrl('https://example.com/dashboard/messages')).toBeNull();
    expect(normalizeDashboardUrl('/dashboard-evil')).toBeNull();
    expect(normalizeDashboardUrl('/dashboard/messages?conversationId=7')).toBe(
      '/dashboard/messages?conversationId=7',
    );
  });

  it('round-trips a validated marker without discarding existing history state', () => {
    const target = {
      moduleId: 'requests',
      url: '/dashboard/requests?requestId=9',
    };
    const markedState = withDesktopSettingsHistory({ nextInternal: 'kept' }, target);

    expect(markedState.nextInternal).toBe('kept');
    expect(readDesktopSettingsReturnTarget(markedState)).toEqual(target);
    expect(readDesktopSettingsReturnTarget(withoutDesktopSettingsHistory(markedState))).toBeNull();
  });

  it('maps settings modules and paths to right-sidebar sections', () => {
    const settingsRoutes = [
      ['settings', 'edit-profile', '/dashboard/settings'],
      ['notification-settings', 'notifications', '/dashboard/settings/notifications'],
      ['account-type', 'account-type', '/dashboard/account-type'],
      ['privacy', 'privacy', '/dashboard/privacy'],
      ['language', 'language', '/dashboard/language'],
      ['blocked-users', 'blocked-users', '/dashboard/settings/blocked'],
      ['account-settings', 'account-settings', '/dashboard/settings/account'],
    ] as const;

    settingsRoutes.forEach(([moduleId, section, path]) => {
      expect(getDesktopSettingsSectionFromModule(moduleId)).toBe(section);
      expect(getDesktopSettingsSectionPath(section)).toBe(path);
      expect(getDesktopSettingsSectionFromPath(`${path}/`)).toBe(section);
    });

    expect(getDesktopSettingsSectionFromModule('messages')).toBeNull();
    expect(getDesktopSettingsSectionPath('unknown')).toBeNull();
    expect(getDesktopSettingsSectionPath('offer-watches')).toBe('/dashboard/settings/watches');
    expect(getDesktopSettingsSectionFromPath('/dashboard/settings/watches/')).toBe('offer-watches');
  });
});
