import {
  canGoBackDesktopOnboarding,
  canGoBackMobileOnboarding,
  getPreviousDesktopOnboardingStep,
  resolveDesktopOnboardingBackTarget,
  resolveMobileOnboardingBackTarget,
} from '../onboardingBackNavigation';

describe('onboardingBackNavigation', () => {
  it('hides back on first and final mobile tutorial steps', () => {
    expect(canGoBackMobileOnboarding('home', false)).toBe(false);
    expect(canGoBackMobileOnboarding('dashboard_finish', false)).toBe(false);
    expect(resolveMobileOnboardingBackTarget('home', false)).toBeNull();
    expect(resolveMobileOnboardingBackTarget('dashboard_finish', false)).toBeNull();
  });

  it('maps mobile profile steps back without losing profile phase behavior', () => {
    expect(resolveMobileOnboardingBackTarget('profile_icon', false)).toEqual({
      step: 'home',
      profileEditPhase2: false,
      openModule: 'home',
    });
    expect(resolveMobileOnboardingBackTarget('profile_edit', false)).toEqual({
      step: 'profile_icon',
      profileEditPhase2: false,
      openModule: 'home',
    });
    expect(resolveMobileOnboardingBackTarget('profile_edit', true)).toEqual({
      step: 'profile_edit',
      profileEditPhase2: false,
    });
  });

  it('maps later mobile steps back to the module that owns the previous scene', () => {
    expect(resolveMobileOnboardingBackTarget('search', false)).toEqual({
      step: 'profile_edit',
      profileEditPhase2: true,
      openModule: 'profile',
    });
    expect(resolveMobileOnboardingBackTarget('help_request', false)).toEqual({
      step: 'search',
      profileEditPhase2: false,
      openModule: 'search',
    });
    expect(resolveMobileOnboardingBackTarget('requests', false)).toEqual({
      step: 'help_request',
      profileEditPhase2: false,
      openModule: 'search',
    });
    expect(resolveMobileOnboardingBackTarget('messages', false)).toEqual({
      step: 'requests',
      profileEditPhase2: false,
      openModule: 'requests',
    });
  });

  it('maps desktop profile steps back without losing phase behavior', () => {
    expect(canGoBackDesktopOnboarding('navigation', false)).toBe(false);
    expect(canGoBackDesktopOnboarding('dashboard_finish', false)).toBe(false);
    expect(getPreviousDesktopOnboardingStep('navigation')).toBeNull();
    expect(getPreviousDesktopOnboardingStep('profile_icon')).toBe('navigation');
    expect(resolveDesktopOnboardingBackTarget('profile_icon', false)).toEqual({
      step: 'navigation',
      profileEditPhase2: false,
      openModule: 'home',
    });
    expect(resolveDesktopOnboardingBackTarget('profile_edit', false)).toEqual({
      step: 'profile_icon',
      profileEditPhase2: false,
      openModule: 'home',
    });
    expect(resolveDesktopOnboardingBackTarget('profile_edit', true)).toEqual({
      step: 'profile_edit',
      profileEditPhase2: false,
    });
  });

  it('maps later desktop steps back to the module that owns the previous scene', () => {
    expect(resolveDesktopOnboardingBackTarget('search', false)).toEqual({
      step: 'profile_edit',
      profileEditPhase2: true,
      openModule: 'profile',
    });
    expect(resolveDesktopOnboardingBackTarget('help_request', false)).toEqual({
      step: 'search',
      profileEditPhase2: false,
      openModule: 'search',
    });
    expect(resolveDesktopOnboardingBackTarget('requests', false)).toEqual({
      step: 'help_request',
      profileEditPhase2: false,
      openModule: 'search',
    });
    expect(resolveDesktopOnboardingBackTarget('messages', false)).toEqual({
      step: 'requests',
      profileEditPhase2: false,
      openModule: 'requests',
    });
  });
});
