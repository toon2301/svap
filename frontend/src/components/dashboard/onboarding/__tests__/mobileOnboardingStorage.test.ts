import {
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  MOBILE_ONBOARDING_STORAGE_KEY,
  readMobileOnboardingState,
  reconcileOnboardingState,
  writeMobileOnboardingState,
} from '../mobileOnboardingStorage';

describe('mobileOnboardingStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default in_progress home when empty', () => {
    expect(getInitialMobileOnboardingState()).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'home',
    });
  });

  it('migrates legacy paused state to in_progress', () => {
    window.localStorage.setItem(
      'svaplyMobileOnboardingV1',
      JSON.stringify({ version: 1, status: 'paused', step: 'profile_icon' }),
    );
    expect(readMobileOnboardingState()).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'profile_icon',
    });
  });

  it('migrates legacy phase1 storage key', () => {
    window.localStorage.setItem(
      'svaply.mobileOnboarding.phase1.v1',
      JSON.stringify({ status: 'active', stepIndex: 1 }),
    );
    expect(readMobileOnboardingState()).toEqual({
      version: 1,
      status: 'in_progress',
      step: 'profile_icon',
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

  it('getInitialMobileOnboardingState reconciles for active module', () => {
    window.localStorage.setItem(
      MOBILE_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ version: 1, status: 'in_progress', step: 'profile_edit' }),
    );
    expect(getInitialMobileOnboardingState('home', false).step).toBe('home');
  });

  it('treats completed as finished', () => {
    writeMobileOnboardingState({
      version: 1,
      status: 'completed',
      step: 'edit_form',
    });
    expect(isMobileOnboardingFinished('completed')).toBe(true);
    expect(getInitialMobileOnboardingState().status).toBe('completed');
    expect(window.localStorage.getItem(MOBILE_ONBOARDING_STORAGE_KEY)).toContain('completed');
  });
});
