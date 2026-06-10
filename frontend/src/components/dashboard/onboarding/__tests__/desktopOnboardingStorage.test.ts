import {
  clearDesktopOnboardingAwaitingSkillCreation,
  clearDesktopOnboardingPostponedForSession,
  clearDesktopOnboardingResumePhase2,
  isDesktopOnboardingAwaitingSkillCreation,
  isDesktopOnboardingResumePhase2,
  isDesktopOnboardingPostponedForSession,
  postponeDesktopOnboardingForSession,
  setDesktopOnboardingAwaitingSkillCreation,
  setDesktopOnboardingResumePhase2,
} from '../desktopOnboardingSession';
import {
  getInitialDesktopOnboardingState,
  isDesktopOnboardingFinished,
  isDesktopOnboardingServerStateBehind,
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

  it('detects desktop step scenes in their owning modules', () => {
    expect(isDesktopOnboardingStepSceneReady('navigation', 'home')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('profile_icon', 'home')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('profile_edit', 'profile')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('edit_form', 'profile')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('search', 'home', false)).toBe(false);
    expect(isDesktopOnboardingStepSceneReady('search', 'home', true)).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('help_request', 'profile', true)).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('requests', 'requests')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('messages', 'messages')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('dashboard_finish', 'home')).toBe(true);
    expect(isDesktopOnboardingStepSceneReady('navigation', 'profile')).toBe(false);
    expect(isDesktopOnboardingStepSceneReady('profile_icon', 'messages')).toBe(false);
    expect(isDesktopOnboardingStepSceneReady('requests', 'search')).toBe(false);
  });

  it('blocks desktop onboarding while temporary desktop UI is open', () => {
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home' })).toBe(false);
    expect(isDesktopOnboardingBlockedByUi({ activeModule: 'home', isSearchOpen: true }))
      .toBe(true);
    expect(
      isDesktopOnboardingBlockedByUi({
        activeModule: 'home',
        isSearchOpen: true,
        onboardingStep: 'search',
      }),
    ).toBe(false);
    expect(
      isDesktopOnboardingBlockedByUi({
        activeModule: 'home',
        isSearchOpen: true,
        onboardingStep: 'help_request',
      }),
    ).toBe(false);
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

  it('detects stale in-progress server snapshots behind local desktop progress', () => {
    expect(
      isDesktopOnboardingServerStateBehind(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        { version: 1, status: 'in_progress', step: 'profile_icon' },
      ),
    ).toBe(true);
    expect(
      isDesktopOnboardingServerStateBehind(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        { version: 1, status: 'in_progress', step: 'profile_edit' },
      ),
    ).toBe(false);
    expect(
      isDesktopOnboardingServerStateBehind(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        { version: 1, status: 'in_progress', step: 'search' },
      ),
    ).toBe(false);
    expect(
      isDesktopOnboardingServerStateBehind(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        { version: 1, status: 'completed', step: 'profile_icon' },
      ),
    ).toBe(false);
  });

  it('stores postponement only in sessionStorage', () => {
    expect(isDesktopOnboardingPostponedForSession()).toBe(false);

    postponeDesktopOnboardingForSession();
    expect(isDesktopOnboardingPostponedForSession()).toBe(true);

    clearDesktopOnboardingPostponedForSession();
    expect(isDesktopOnboardingPostponedForSession()).toBe(false);
  });

  it('stores profile phase resume only in sessionStorage', () => {
    expect(isDesktopOnboardingResumePhase2()).toBe(false);

    setDesktopOnboardingResumePhase2();
    expect(isDesktopOnboardingResumePhase2()).toBe(true);

    clearDesktopOnboardingResumePhase2();
    expect(isDesktopOnboardingResumePhase2()).toBe(false);
  });

  it('stores awaiting skill creation only in sessionStorage', () => {
    expect(isDesktopOnboardingAwaitingSkillCreation()).toBe(false);

    setDesktopOnboardingAwaitingSkillCreation();
    expect(isDesktopOnboardingAwaitingSkillCreation()).toBe(true);

    clearDesktopOnboardingAwaitingSkillCreation();
    expect(isDesktopOnboardingAwaitingSkillCreation()).toBe(false);
  });
});
