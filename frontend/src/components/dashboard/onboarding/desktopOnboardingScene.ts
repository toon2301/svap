import type { DesktopOnboardingStep } from '@/types';

type DesktopOnboardingSceneModule = 'home' | 'profile' | 'search' | 'requests' | 'messages';

const DESKTOP_SEARCH_ONBOARDING_STEPS = new Set<DesktopOnboardingStep>([
  'search',
  'help_request',
]);

type DesktopOnboardingUiBlockerInput = {
  isRightSidebarOpen?: boolean;
  isSearchOpen?: boolean;
  isNotificationsPanelOpen?: boolean;
  isMobileMenuOpen?: boolean;
  onboardingStep?: DesktopOnboardingStep | null;
};

const DESKTOP_ONBOARDING_STEPS_ON_HOME = new Set<DesktopOnboardingStep>([
  'navigation',
  'profile_icon',
  'dashboard_finish',
]);

export function getDesktopOnboardingStepModule(
  step: DesktopOnboardingStep,
): DesktopOnboardingSceneModule {
  if (DESKTOP_ONBOARDING_STEPS_ON_HOME.has(step)) {
    return 'home';
  }

  if (step === 'search' || step === 'help_request') {
    return 'search';
  }

  if (step === 'requests') {
    return 'requests';
  }

  if (step === 'messages') {
    return 'messages';
  }

  return 'profile';
}

export function isDesktopOnboardingStepSceneReady(
  step: DesktopOnboardingStep,
  activeModule: string,
  isSearchOpen = false,
): boolean {
  const requiredModule = getDesktopOnboardingStepModule(step);

  if (requiredModule === 'search') {
    return isSearchOpen;
  }

  return requiredModule === activeModule;
}

export function isDesktopOnboardingBlockedByUi({
  isRightSidebarOpen = false,
  isSearchOpen = false,
  isNotificationsPanelOpen = false,
  isMobileMenuOpen = false,
  onboardingStep = null,
}: DesktopOnboardingUiBlockerInput): boolean {
  if (isMobileMenuOpen || isNotificationsPanelOpen || isRightSidebarOpen) {
    return true;
  }

  const isSearchOnboardingScene =
    onboardingStep != null && DESKTOP_SEARCH_ONBOARDING_STEPS.has(onboardingStep);

  if (isSearchOpen && !isSearchOnboardingScene) {
    return true;
  }

  return false;
}
