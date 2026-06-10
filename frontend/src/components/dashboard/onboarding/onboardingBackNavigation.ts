import type { DesktopOnboardingStep, MobileOnboardingStep } from '@/types';

export type MobileOnboardingBackModule = 'home' | 'profile' | 'search' | 'requests';
export type DesktopOnboardingBackModule = MobileOnboardingBackModule;

export type MobileOnboardingBackTarget = {
  step: MobileOnboardingStep;
  profileEditPhase2: boolean;
  openModule?: MobileOnboardingBackModule;
};

export type DesktopOnboardingBackTarget = {
  step: DesktopOnboardingStep;
  profileEditPhase2: boolean;
  openModule?: DesktopOnboardingBackModule;
};

export function resolveMobileOnboardingBackTarget(
  step: MobileOnboardingStep,
  isProfileEditPhase2: boolean,
): MobileOnboardingBackTarget | null {
  if (step === 'home' || step === 'dashboard_finish') return null;

  if (step === 'profile_icon') {
    return { step: 'home', profileEditPhase2: false, openModule: 'home' };
  }

  if (step === 'profile_edit') {
    if (isProfileEditPhase2) {
      return { step: 'profile_edit', profileEditPhase2: false };
    }
    return { step: 'profile_icon', profileEditPhase2: false, openModule: 'home' };
  }

  if (step === 'edit_form') {
    return { step: 'profile_edit', profileEditPhase2: false, openModule: 'profile' };
  }

  if (step === 'search') {
    return { step: 'profile_edit', profileEditPhase2: true, openModule: 'profile' };
  }

  if (step === 'help_request') {
    return { step: 'search', profileEditPhase2: false, openModule: 'search' };
  }

  if (step === 'requests') {
    return { step: 'help_request', profileEditPhase2: false, openModule: 'search' };
  }

  if (step === 'messages') {
    return { step: 'requests', profileEditPhase2: false, openModule: 'requests' };
  }

  return null;
}

export function canGoBackMobileOnboarding(
  step: MobileOnboardingStep,
  isProfileEditPhase2: boolean,
): boolean {
  return resolveMobileOnboardingBackTarget(step, isProfileEditPhase2) !== null;
}

export function getPreviousDesktopOnboardingStep(
  step: DesktopOnboardingStep,
): DesktopOnboardingStep | null {
  const target = resolveDesktopOnboardingBackTarget(step, false);
  return target?.step ?? null;
}

export function resolveDesktopOnboardingBackTarget(
  step: DesktopOnboardingStep,
  isProfileEditPhase2: boolean,
): DesktopOnboardingBackTarget | null {
  if (step === 'navigation' || step === 'dashboard_finish') return null;

  if (step === 'profile_icon') {
    return { step: 'navigation', profileEditPhase2: false, openModule: 'home' };
  }

  if (step === 'profile_edit') {
    if (isProfileEditPhase2) {
      return { step: 'profile_edit', profileEditPhase2: false };
    }
    return { step: 'profile_icon', profileEditPhase2: false, openModule: 'home' };
  }

  if (step === 'edit_form') {
    return { step: 'profile_edit', profileEditPhase2: false, openModule: 'profile' };
  }

  if (step === 'search') {
    return { step: 'profile_edit', profileEditPhase2: true, openModule: 'profile' };
  }

  if (step === 'help_request') {
    return { step: 'search', profileEditPhase2: false, openModule: 'search' };
  }

  if (step === 'requests') {
    return { step: 'help_request', profileEditPhase2: false, openModule: 'search' };
  }

  if (step === 'messages') {
    return { step: 'requests', profileEditPhase2: false, openModule: 'requests' };
  }

  return null;
}

export function canGoBackDesktopOnboarding(
  step: DesktopOnboardingStep,
  isProfileEditPhase2: boolean,
): boolean {
  return resolveDesktopOnboardingBackTarget(step, isProfileEditPhase2) !== null;
}
