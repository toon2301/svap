import {
  createDesktopSettingsReturnTarget,
  createDesktopSettingsStepState,
  createOfferWatchesSettingsHistoryState,
  createProfileEditHistoryState,
  getDesktopSettingsSectionFromModule,
  getDesktopSettingsSectionFromPath,
  getDesktopSettingsSectionPath,
  getDesktopSettingsStepsToOrigin,
  normalizeDashboardUrl,
  normalizeSettingsTargetUser,
  readDesktopSettingsDepth,
  readDesktopSettingsOriginTarget,
  readDesktopSettingsReturnTarget,
  withDesktopSettingsOriginHistory,
  withDesktopSettingsHistory,
  withDesktopSettingsStep,
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

    expect(
      createDesktopSettingsReturnTarget('watches', '/dashboard/watches?watch=7'),
    ).toEqual({
      moduleId: 'watches',
      url: '/dashboard/watches?watch=7',
    });

    expect(
      createDesktopSettingsReturnTarget('skills', '/dashboard'),
    ).toEqual({
      moduleId: 'skills',
      url: '/dashboard/skills',
    });

    expect(
      createDesktopSettingsReturnTarget(
        'profile',
        '/dashboard/users/anton/portfolio/42?photo=2#gallery',
      ),
    ).toEqual({
      moduleId: 'portfolio-detail',
      url: '/dashboard/users/anton/portfolio/42?photo=2#gallery',
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

  it('keeps a durable nested origin only on the origin history entry', () => {
    const target = {
      moduleId: 'portfolio-detail',
      url: '/dashboard/users/anton/portfolio/42',
    };
    const originState = withDesktopSettingsOriginHistory(
      { nextInternal: 'kept' },
      target,
    );

    expect(originState.nextInternal).toBe('kept');
    expect(readDesktopSettingsOriginTarget(originState)).toEqual(target);

    const settingsState = withDesktopSettingsHistory(originState, target);
    expect(readDesktopSettingsReturnTarget(settingsState)).toEqual(target);
    expect(readDesktopSettingsOriginTarget(settingsState)).toBeNull();
    expect(settingsState.nextInternal).toBe('kept');
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

describe('desktop settings history depth', () => {
  const profileTarget = { moduleId: 'profile', url: '/dashboard/users/anton?tab=offers' };
  const messagesTarget = { moduleId: 'messages', url: '/dashboard/messages' };

  function rawMarkerState(depth: unknown) {
    return {
      __svaplyDesktopSettings: { version: 1, returnTarget: profileTarget, depth },
    };
  }

  it('stores a depth on the marker and counts the steps back to the origin from it', () => {
    const state = withDesktopSettingsHistory({ nextInternal: 'kept' }, profileTarget, 2);

    expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
    expect(readDesktopSettingsDepth(state)).toBe(2);
    expect(getDesktopSettingsStepsToOrigin(state)).toBe(3);
    expect(getDesktopSettingsStepsToOrigin(withDesktopSettingsHistory(null, profileTarget, 0))).toBe(1);
  });

  it('treats a marker without a depth as unknown and falls back to a single step', () => {
    const state = withDesktopSettingsHistory(null, profileTarget);

    expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
    expect(readDesktopSettingsDepth(state)).toBeNull();
    expect(getDesktopSettingsStepsToOrigin(state)).toBe(1);
  });

  it('reports no depth for history state without a marker', () => {
    expect(readDesktopSettingsDepth(null)).toBeNull();
    expect(readDesktopSettingsDepth(undefined)).toBeNull();
    expect(readDesktopSettingsDepth({ nextInternal: 'kept' })).toBeNull();
    expect(getDesktopSettingsStepsToOrigin(null)).toBe(1);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 500, '2', null, {}])(
    'ignores the invalid depth %p when reading a marker',
    (depth) => {
      const state = rawMarkerState(depth);

      expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
      expect(readDesktopSettingsDepth(state)).toBeNull();
      expect(getDesktopSettingsStepsToOrigin(state)).toBe(1);
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 500])(
    'does not write the invalid depth %p',
    (depth) => {
      const state = withDesktopSettingsHistory(null, profileTarget, depth);

      expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
      expect(readDesktopSettingsDepth(state)).toBeNull();
    },
  );

  it('steps a whole-state copy one record deeper and keeps unrelated history state', () => {
    const state = withDesktopSettingsHistory({ __NA: true, nextInternal: 'kept' }, profileTarget, 1);
    const next = withDesktopSettingsStep(state) as Record<string, unknown>;

    expect(next).not.toBe(state);
    expect(next.__NA).toBe(true);
    expect(next.nextInternal).toBe('kept');
    expect(readDesktopSettingsReturnTarget(next)).toEqual(profileTarget);
    expect(readDesktopSettingsDepth(next)).toBe(2);
    expect(readDesktopSettingsDepth(state)).toBe(1);
  });

  it('leaves history state without a known depth exactly as it is', () => {
    const unknownDepth = withDesktopSettingsHistory({ nextInternal: 'kept' }, profileTarget);
    const withoutMarker = { nextInternal: 'kept' };

    expect(withDesktopSettingsStep(unknownDepth)).toBe(unknownDepth);
    expect(withDesktopSettingsStep(withoutMarker)).toBe(withoutMarker);
    expect(withDesktopSettingsStep(null)).toBeNull();
  });

  it('never tracks more steps than a browser history can hold and keeps the marker', () => {
    let state: unknown = withDesktopSettingsHistory(null, messagesTarget, 0);

    for (let index = 0; index < 100; index += 1) {
      state = withDesktopSettingsStep(state);
      const depth = readDesktopSettingsDepth(state);
      if (depth !== null) expect(depth).toBeLessThan(50);
    }

    expect(readDesktopSettingsDepth(state)).toBeNull();
    expect(readDesktopSettingsReturnTarget(state)).toEqual(messagesTarget);
    expect(getDesktopSettingsStepsToOrigin(state)).toBe(1);
  });

  it('creates a fresh marker-only state one step deeper for pushes that carried no state', () => {
    const state = withDesktopSettingsHistory({ __NA: true, nextInternal: 'kept' }, profileTarget, 2);
    const next = createDesktopSettingsStepState(state);

    expect(next).not.toBeNull();
    expect(Object.keys(next as object)).toHaveLength(1);
    expect(readDesktopSettingsReturnTarget(next)).toEqual(profileTarget);
    expect(readDesktopSettingsDepth(next)).toBe(3);
  });

  it('keeps the plain push (null) without a marker or with an unknown depth', () => {
    expect(createDesktopSettingsStepState(null)).toBeNull();
    expect(createDesktopSettingsStepState({ nextInternal: 'kept' })).toBeNull();
    expect(createDesktopSettingsStepState(withDesktopSettingsHistory(null, profileTarget))).toBeNull();
  });

  it('stops creating marker-only steps before the browser history limit', () => {
    let state: unknown = withDesktopSettingsHistory(null, profileTarget, 0);
    let stopped = false;

    for (let index = 0; index < 100 && !stopped; index += 1) {
      const next = createDesktopSettingsStepState(state);
      if (next === null) {
        stopped = true;
      } else {
        expect(readDesktopSettingsDepth(next)).toBeLessThan(50);
        state = next;
      }
    }

    expect(stopped).toBe(true);
  });

  describe('createProfileEditHistoryState', () => {
    const ownProfilePath = '/dashboard/users/anton';

    it('starts a session at depth 0 whose origin is the own profile page the user clicked from', () => {
      const state = createProfileEditHistoryState(
        null,
        '/dashboard/users/anton?tab=offers',
        ownProfilePath,
      );

      expect(Object.keys(state as object)).toHaveLength(1);
      expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
      expect(readDesktopSettingsDepth(state)).toBe(0);
      expect(getDesktopSettingsStepsToOrigin(state)).toBe(1);
    });

    it('recognises the own profile address with a trailing slash', () => {
      const state = createProfileEditHistoryState(null, '/dashboard/users/anton/', ownProfilePath);

      expect(readDesktopSettingsReturnTarget(state)).toEqual({
        moduleId: 'profile',
        url: '/dashboard/users/anton/',
      });
      expect(readDesktopSettingsDepth(state)).toBe(0);
    });

    it('continues the session when the current record already carries a known depth', () => {
      const current = withDesktopSettingsHistory(null, profileTarget, 3);
      const state = createProfileEditHistoryState(
        current,
        '/dashboard/users/anton/edit',
        ownProfilePath,
      );

      expect(readDesktopSettingsReturnTarget(state)).toEqual(profileTarget);
      expect(readDesktopSettingsDepth(state)).toBe(4);
    });

    it.each<[string, unknown, string]>([
      ['a screen other than the own profile', null, '/dashboard/messages'],
      ['the profile of somebody else', null, '/dashboard/users/bob'],
      ['the edit page itself', null, '/dashboard/users/anton/edit?tab=offers'],
      [
        'a session with an unknown depth',
        withDesktopSettingsHistory(null, profileTarget),
        '/dashboard/users/anton',
      ],
      ['an address outside the dashboard', null, 'https://example.com/dashboard/users/anton'],
    ])('keeps the plain push (null) for %s', (_label, historyState, currentUrl) => {
      expect(createProfileEditHistoryState(historyState, currentUrl, ownProfilePath)).toBeNull();
    });
  });

  describe('createOfferWatchesSettingsHistoryState', () => {
    const fallbackTarget = { moduleId: 'profile', url: '/dashboard/users/anton' };

    it('keeps the session origin and goes one record deeper when the depth is known', () => {
      const current = withDesktopSettingsHistory({ __NA: true }, messagesTarget, 1);
      const state = createOfferWatchesSettingsHistoryState(current, fallbackTarget);

      expect(readDesktopSettingsReturnTarget(state)).toEqual(messagesTarget);
      expect(readDesktopSettingsDepth(state)).toBe(2);
      expect((state as Record<string, unknown>).__NA).toBe(true);
    });

    it('uses the fallback target without a depth otherwise, as before', () => {
      const plain = createOfferWatchesSettingsHistoryState({ nextInternal: 'kept' }, fallbackTarget);
      const unknownDepth = createOfferWatchesSettingsHistoryState(
        withDesktopSettingsHistory(null, messagesTarget),
        fallbackTarget,
      );

      expect(readDesktopSettingsReturnTarget(plain)).toEqual(fallbackTarget);
      expect(readDesktopSettingsDepth(plain)).toBeNull();
      expect((plain as Record<string, unknown>).nextInternal).toBe('kept');
      expect(readDesktopSettingsReturnTarget(unknownDepth)).toEqual(fallbackTarget);
      expect(readDesktopSettingsDepth(unknownDepth)).toBeNull();
    });
  });

  describe('normalizeSettingsTargetUser', () => {
    it.each([
      ['a user with id and slug', { id: 7, slug: 'anton' }],
      ['a user with only an id', { id: 7 }],
      ['a user with only a slug', { slug: 'anton' }],
    ])('returns %s unchanged', (_label, candidate) => {
      expect(normalizeSettingsTargetUser(candidate)).toBe(candidate);
    });

    it.each<[string, unknown]>([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'anton'],
      ['a number', 7],
      ['an empty object', {}],
      ['a user whose slug is null and id missing', { slug: null }],
      ['an event-like object from a click handler', { type: 'click', nativeEvent: {}, target: {} }],
    ])('returns null for %s', (_label, candidate) => {
      expect(normalizeSettingsTargetUser(candidate as never)).toBeNull();
    });
  });
});
