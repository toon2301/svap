import type { DesktopOnboardingStep } from '@/types';

type DesktopOnboardingUiBlockerInput = {
  activeModule: string;
  isRightSidebarOpen?: boolean;
  isSearchOpen?: boolean;
  isNotificationsPanelOpen?: boolean;
  isMobileMenuOpen?: boolean;
};

const DESKTOP_ONBOARDING_STEPS_ON_HOME = new Set<DesktopOnboardingStep>([
  'navigation',
  'profile_icon',
]);

export function isDesktopOnboardingStepSceneReady(
  step: DesktopOnboardingStep,
  activeModule: string,
): boolean {
  return DESKTOP_ONBOARDING_STEPS_ON_HOME.has(step) && activeModule === 'home';
}

export function isDesktopOnboardingBlockedByUi({
  isRightSidebarOpen = false,
  isSearchOpen = false,
  isNotificationsPanelOpen = false,
  isMobileMenuOpen = false,
}: DesktopOnboardingUiBlockerInput): boolean {
  return isRightSidebarOpen || isSearchOpen || isNotificationsPanelOpen || isMobileMenuOpen;
}
