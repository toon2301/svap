import type { MobileOnboardingStep } from '@/types';

type MobileOnboardingSceneModule = 'home' | 'profile' | 'search' | 'requests' | 'messages';

type MobileOnboardingUiBlockerInput = {
  activeModule: string;
  activeRightItem?: string | null;
  isRightSidebarOpen?: boolean;
  isMobileMenuOpen?: boolean;
  isSearchOpen?: boolean;
  isNotificationsPanelOpen?: boolean;
  isMessageConversationOpen?: boolean;
};

const ONBOARDING_BLOCKING_MODULES = new Set([
  'settings',
  'notification-settings',
  'language',
  'account-type',
  'privacy',
  'blocked-users',
]);

export function getMobileOnboardingStepModule(
  step: MobileOnboardingStep,
): MobileOnboardingSceneModule {
  if (step === 'home' || step === 'profile_icon' || step === 'dashboard_finish') {
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

  if (requiredModule === 'requests') {
    return activeModule === 'requests';
  }

  if (requiredModule === 'messages') {
    return activeModule === 'messages';
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
  isMessageConversationOpen = false,
}: MobileOnboardingUiBlockerInput): boolean {
  if (isMobileMenuOpen || isSearchOpen || isNotificationsPanelOpen || isMessageConversationOpen) {
    return true;
  }

  if (ONBOARDING_BLOCKING_MODULES.has(activeModule)) {
    return true;
  }

  return isRightSidebarOpen && activeRightItem !== 'edit-profile';
}
