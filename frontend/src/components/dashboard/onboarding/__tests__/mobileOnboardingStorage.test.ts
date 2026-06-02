import {
  clearMobileOnboardingPostponedForSession,
  isMobileOnboardingPostponedForSession,
  postponeMobileOnboardingForSession,
} from '@/lib/mobileOnboardingSession';
import {
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  normalizeMobileOnboardingState,
  reconcileOnboardingState,
} from '../mobileOnboardingStorage';

describe('mobileOnboardingState helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
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
        status: 'paused' as any,
        step: 'profile_icon',
      }),
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

  it('rewinds profile_edit to home when user is on home module', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        'home',
        false,
      ).step,
    ).toBe('home');
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

  it('rewinds edit_form to home when user is on home module', () => {
    expect(
      reconcileOnboardingState(
        { version: 1, status: 'in_progress', step: 'edit_form' },
        'home',
        false,
      ).step,
    ).toBe('home');
  });

  it('reconciles initial server state for active module', () => {
    expect(
      getInitialMobileOnboardingState(
        { version: 1, status: 'in_progress', step: 'profile_edit' },
        'home',
        false,
      ).step,
    ).toBe('home');
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
});
