import {
  clearMobileOnboardingPostponedForSession,
  clearMobileOnboardingResumePhase2,
  isMobileOnboardingPostponedForSession,
  isMobileOnboardingResumePhase2,
  postponeMobileOnboardingForSession,
  setMobileOnboardingResumePhase2,
} from '@/lib/mobileOnboardingSession';
import {
  clearMobileOnboardingCachedProgress,
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  normalizeMobileOnboardingState,
  readMobileOnboardingCachedProgress,
  reconcileOnboardingState,
  writeMobileOnboardingCachedProgress,
} from '../mobileOnboardingStorage';
import {
  getMobileOnboardingStepModule,
  isMobileOnboardingBlockedByUi,
  isMobileOnboardingStepSceneReady,
} from '../mobileOnboardingScene';

describe('mobileOnboardingState helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('returns default in_progress home when server state is missing', () => {
    expect(getInitialMobileOnboardingState(null)).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'home',
    });
  });

  it('normalizes invalid server state to default', () => {
    expect(
      normalizeMobileOnboardingState({
        version: 1,
        status: 'paused',
        step: 'profile_icon',
      } as Parameters<typeof normalizeMobileOnboardingState>[0]),
    ).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'home',
    });
  });

  it('forces completed state to edit_form step', () => {
    expect(
      normalizeMobileOnboardingState({
        version: 1,
        status: 'completed',
        step: 'home',
      }),
    ).toEqual({
      version: 1,
      status: 'completed',
      step: 'edit_form',
    });
  });

  it('preserves completed search as the new terminal step', () => {
    expect(
      normalizeMobileOnboardingState({
        version: 1,
        status: 'completed',
        step: 'search',
      }),
    ).toEqual({
      version: 1,
      status: 'completed',
      step: 'search',
    });
  });

  it('preserves completed help_request as the final terminal step', () => {
    expect(
      normalizeMobileOnboardingState({
        version: 1,
        status: 'completed',
        step: 'help_request',
      }),
    ).toEqual({
      version: 1,
      status: 'completed',
      step: 'help_request',
    });
  });

  it('does not rewind profile_edit to home when user is on home module', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        'home',
        false,
      ).step,
    ).toBe('profile_edit');
  });

  it('rewinds edit_form to profile_edit on profile when not editing', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'edit_form' },
        'profile',
        false,
      ).step,
    ).toBe('profile_edit');
  });

  it('does not rewind edit_form to home when user is on home module', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'edit_form' },
        'home',
        false,
      ).step,
    ).toBe('edit_form');
  });

  it('keeps initial server progress independent from active module', () => {
    expect(
      getInitialMobileOnboardingState(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        'home',
        false,
      ).step,
    ).toBe('profile_edit');
  });

  it('keeps profile scene visible when user opens profile before earlier steps', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'home' },
        'profile',
        false,
      ).step,
    ).toBe('profile_edit');
  });

  it('detects when a tutorial step scene is ready', () => {
    expect(isMobileOnboardingStepSceneReady('home', 'home', false)).toBe(true);
    expect(isMobileOnboardingStepSceneReady('profile_icon', 'home', false)).toBe(true);
    expect(isMobileOnboardingStepSceneReady('profile_edit', 'profile', false)).toBe(true);
    expect(isMobileOnboardingStepSceneReady('edit_form', 'profile', false)).toBe(true);
    expect(isMobileOnboardingStepSceneReady('search', 'search', false)).toBe(true);
    expect(isMobileOnboardingStepSceneReady('help_request', 'search', false)).toBe(true);

    expect(isMobileOnboardingStepSceneReady('profile_edit', 'home', false)).toBe(false);
    expect(isMobileOnboardingStepSceneReady('profile_edit', 'profile', true)).toBe(false);
    expect(isMobileOnboardingStepSceneReady('search', 'profile', false)).toBe(false);
    expect(isMobileOnboardingStepSceneReady('help_request', 'profile', false)).toBe(false);
  });

  it('maps steps to their owning module for scene-gated display', () => {
    expect(getMobileOnboardingStepModule('home')).toBe('home');
    expect(getMobileOnboardingStepModule('profile_icon')).toBe('home');
    expect(getMobileOnboardingStepModule('profile_edit')).toBe('profile');
    expect(getMobileOnboardingStepModule('edit_form')).toBe('profile');
    expect(getMobileOnboardingStepModule('search')).toBe('search');
    expect(getMobileOnboardingStepModule('help_request')).toBe('search');
  });

  it('keeps profile-scoped progress hidden until the user opens profile', () => {
    expect(isMobileOnboardingStepSceneReady('profile_edit', 'home', false)).toBe(false);
    expect(isMobileOnboardingStepSceneReady('profile_edit', 'messages', false)).toBe(false);
    expect(isMobileOnboardingStepSceneReady('profile_edit', 'profile', false)).toBe(true);
  });

  it('blocks mobile onboarding while temporary UI panels are open', () => {
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'profile', isMobileMenuOpen: true }))
      .toBe(true);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'profile', isSearchOpen: true }))
      .toBe(true);
    expect(isMobileOnboardingBlockedByUi({
      activeModule: 'profile',
      isNotificationsPanelOpen: true,
    })).toBe(true);
  });

  it('blocks mobile onboarding on settings-style modules and side panels', () => {
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'settings' })).toBe(true);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'notification-settings' })).toBe(true);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'language' })).toBe(true);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'account-type' })).toBe(true);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'privacy' })).toBe(true);
    expect(isMobileOnboardingBlockedByUi({
      activeModule: 'profile',
      activeRightItem: 'language',
      isRightSidebarOpen: true,
    })).toBe(true);
  });

  it('does not treat normal scenes or profile edit mode as generic UI blockers', () => {
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'profile' })).toBe(false);
    expect(isMobileOnboardingBlockedByUi({ activeModule: 'home' })).toBe(false);
    expect(isMobileOnboardingBlockedByUi({
      activeModule: 'profile',
      activeRightItem: 'edit-profile',
      isRightSidebarOpen: true,
    })).toBe(false);
  });

  it('treats completed and skipped as finished', () => {
    expect(isMobileOnboardingFinished('completed')).toBe(true);
    expect(isMobileOnboardingFinished('skipped')).toBe(true);
    expect(isMobileOnboardingFinished('in_progress')).toBe(false);
  });

  it('stores postponement only in sessionStorage', () => {
    expect(isMobileOnboardingPostponedForSession()).toBe(false);

    postponeMobileOnboardingForSession();
    expect(isMobileOnboardingPostponedForSession()).toBe(true);

    clearMobileOnboardingPostponedForSession();
    expect(isMobileOnboardingPostponedForSession()).toBe(false);
  });

  it('stores phase2 resume flag only in sessionStorage', () => {
    expect(isMobileOnboardingResumePhase2()).toBe(false);

    setMobileOnboardingResumePhase2();
    expect(isMobileOnboardingResumePhase2()).toBe(true);

    clearMobileOnboardingResumePhase2();
    expect(isMobileOnboardingResumePhase2()).toBe(false);
  });

  it('stores cached onboarding progress per user in localStorage', () => {
    writeMobileOnboardingCachedProgress(10, 'profile_edit', true);
    writeMobileOnboardingCachedProgress(11, 'profile_icon');

    expect(readMobileOnboardingCachedProgress(10)).toEqual({
      version: 1,
      step: 'profile_edit',
      profileEditPhase2: true,
    });
    expect(readMobileOnboardingCachedProgress(11)).toEqual({
      version: 1,
      step: 'profile_icon',
      profileEditPhase2: false,
    });
  });

  it('removes invalid cached onboarding progress', () => {
    window.localStorage.setItem(
      'svaplyMobileOnboardingStepV1:10',
      JSON.stringify({ version: 1, step: 'unknown' }),
    );

    expect(readMobileOnboardingCachedProgress(10)).toBeNull();
    expect(window.localStorage.getItem('svaplyMobileOnboardingStepV1:10')).toBeNull();
  });

  it('clears cached onboarding progress', () => {
    writeMobileOnboardingCachedProgress(10, 'profile_icon');
    clearMobileOnboardingCachedProgress(10);

    expect(readMobileOnboardingCachedProgress(10)).toBeNull();
  });

  it('keeps phase2 resume helpers safe when sessionStorage throws', () => {
    const originalSessionStorage = window.sessionStorage;
    const throwingStorage = {
      getItem: jest.fn(() => {
        throw new Error('get failed');
      }),
      setItem: jest.fn(() => {
        throw new Error('set failed');
      }),
      removeItem: jest.fn(() => {
        throw new Error('remove failed');
      }),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: throwingStorage,
    });

    try {
      expect(() => setMobileOnboardingResumePhase2()).not.toThrow();
      expect(isMobileOnboardingResumePhase2()).toBe(false);
      expect(() => clearMobileOnboardingResumePhase2()).not.toThrow();
      expect(throwingStorage.setItem).toHaveBeenCalled();
      expect(throwingStorage.getItem).toHaveBeenCalled();
      expect(throwingStorage.removeItem).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      });
    }
  });

  it('keeps cached progress helpers safe when localStorage throws', () => {
    const originalLocalStorage = window.localStorage;
    const throwingStorage = {
      getItem: jest.fn(() => {
        throw new Error('get failed');
      }),
      setItem: jest.fn(() => {
        throw new Error('set failed');
      }),
      removeItem: jest.fn(() => {
        throw new Error('remove failed');
      }),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: throwingStorage,
    });

    try {
      expect(() => writeMobileOnboardingCachedProgress(10, 'profile_icon')).not.toThrow();
      expect(readMobileOnboardingCachedProgress(10)).toBeNull();
      expect(() => clearMobileOnboardingCachedProgress(10)).not.toThrow();
      expect(throwingStorage.setItem).toHaveBeenCalled();
      expect(throwingStorage.getItem).toHaveBeenCalled();
      expect(throwingStorage.removeItem).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
