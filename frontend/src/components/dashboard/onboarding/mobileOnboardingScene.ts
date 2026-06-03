import type { MobileOnboardingState, MobileOnboardingStep } from '@/types';

type MobileOnboardingSceneModule = 'home' | 'profile';

export function getMobileOnboardingStepModule(
  step: MobileOnboardingStep,
): MobileOnboardingSceneModule {
  if (step === 'home' || step === 'profile_icon') {
    return 'home';
  }

  return 'profile';
}

export function isMobileOnboardingStepSceneReady(
  step: MobileOnboardingStep,
  activeModule: string,
  isProfileEditMode: boolean,
): boolean {
  const requiredModule = getMobileOnboardingStepModule(step);

  if (requiredModule === 'home') {
    return activeModule === 'home';
  }

  return activeModule === 'profile' && !isProfileEditMode;
}

export function shouldResumeMobileOnboardingProfileScene(
  state: MobileOnboardingState,
  activeModule: string,
  isProfileEditMode: boolean,
): boolean {
  if (state.status !== 'in_progress') return false;
  if (activeModule !== 'home' || isProfileEditMode) return false;

  return getMobileOnboardingStepModule(state.step) === 'profile';
}
