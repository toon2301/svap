import type { MobileOnboardingStep } from '@/types';

type MobileOnboardingSceneModule = 'home' | 'profile' | 'search';

type MobileOnboardingUiBlockerInput = {
  activeModule: string;
  activeRightItem?: string | null;
  isRightSidebarOpen?: boolean;
  isMobileMenuOpen?: boolean;
  isSearchOpen?: boolean;
  isNotificationsPanelOpen?: boolean;
};

const ONBOARDING_BLOCKING_MODULES = new Set([
  'settings',
  'notification-settings',
  'language',
  'account-type',
  'privacy',
]);

export function getMobileOnboardingStepModule(
  step: MobileOnboardingStep,
): MobileOnboardingSceneModule {
  if (step === 'home' || step === 'profile_icon') {
    return 'home';
  }

  if (step === 'search') {
    return 'search';
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

  if (requiredModule === 'search') {
    return activeModule === 'search';
  }

  return activeModule === 'profile' && !isProfileEditMode;
}

export function isMobileOnboardingBlockedByUi({
  activeModule,
  activeRightItem,
  isRightSidebarOpen = false,
  isMobileMenuOpen = false,
  isSearchOpen = false,
  isNotificationsPanelOpen = false,
}: MobileOnboardingUiBlockerInput): boolean {
  if (isMobileMenuOpen || isSearchOpen || isNotificationsPanelOpen) {
    return true;
  }

  if (ONBOARDING_BLOCKING_MODULES.has(activeModule)) {
    return true;
  }

  return isRightSidebarOpen && activeRightItem !== 'edit-profile';
}
