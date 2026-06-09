import {
  clearDesktopOnboardingPostponedForSession,
  isDesktopOnboardingPostponedForSession,
  postponeDesktopOnboardingForSession,
} from '../desktopOnboardingSession';
import {
  getInitialDesktopOnboardingState,
  isDesktopOnboardingFinished,
  normalizeDesktopOnboardingState,
} from '../desktopOnboardingStorage';
import {
  isDesktopOnboardingBlockedByUi,
  isDesktopOnboardingStepSceneReady,
} from '../desktopOnboardingScene';

describe('desktopOnboardingState helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('returns default in_progress navigation when server state is missing', () => {
    expect(getInitialDesktopOnboardingState(null)).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'navigation',
    });
  });

  it('normalizes invalid server state to default', () => {
    expect(
      normalizeDesktopOnboardingState({
        version: 1,
        status: 'paused',
        step: 'profile_icon',
      } as Parameters<typeof normalizeDesktopOnboardingState>[0]),
    ).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'navigation',
    });
  });

  it('forces completed state to the current terminal step', () => {
    expect(
      normalizeDesktopOnboardingState({
        version: 1,
        status: 'completed',
        step: 'navigation',
      }),
    ).toEqual({
      version: 1,
      status: 'completed',
      step: 'profile_icon',
    });
  });

  it('detects desktop step scenes on the dashboard only', () => {
    expect(isDesktopOnboardingStepSceneReady('navigation', 'home')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('profile_icon', 'home')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('navigation', 'profile')).toBe(false);
    expect(isDesktopOnboardingStepSceneReady('profile_icon', 'messages')).toBe(false);
  });

  it('blocks desktop onboarding while temporary desktop UI is open', () => {
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home' })).toBe(false);
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home', isSearchOpen: true }))
      .toBe(true);
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home', isRightSidebarOpen: true }))
      .toBe(true);
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home', isNotificationsPanelOpen: true }))
      .toBe(true);
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home', isMobileMenuOpen: true }))
      .toBe(true);
  });

  it('treats completed and skipped as finished', () => {
    expect(isDesktopOnboardingFinished('completed')).toBe(true);
    expect(isDesktopOnboardingFinished('skipped')).toBe(true);
    expect(isDesktopOnboardingFinished('in_progress')).toBe(false);
  });

  it('stores postponement only in sessionStorage', () => {
    expect(isDesktopOnboardingPostponedForSession()).toBe(false);

    postponeDesktopOnboardingForSession();
    expect(isDesktopOnboardingPostponedForSession()).toBe(true);

    clearDesktopOnboardingPostponedForSession();
    expect(isDesktopOnboardingPostponedForSession()).toBe(false);
  });
});
