const MOBILE_ONBOARDING_POSTPONED_KEY = 'svaplyMobileOnboardingPostponedV1';
const MOBILE_ONBOARDING_PHASE2_KEY = 'svaplyMobileOnboardingPhase2V1';

export function isMobileOnboardingPostponedForSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MOBILE_ONBOARDING_POSTPONED_KEY) === '1';
  } catch {
    return false;
  }
}

export function postponeMobileOnboardingForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MOBILE_ONBOARDING_POSTPONED_KEY, '1');
  } catch {
    // The in-memory state still hides the tutorial for the current render tree.
  }
}

export function clearMobileOnboardingPostponedForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MOBILE_ONBOARDING_POSTPONED_KEY);
  } catch {
    // Best effort only.
  }
}

export function setMobileOnboardingResumePhase2(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MOBILE_ONBOARDING_PHASE2_KEY, '1');
  } catch {
    // Best effort only.
  }
}

export function isMobileOnboardingResumePhase2(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MOBILE_ONBOARDING_PHASE2_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearMobileOnboardingResumePhase2(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MOBILE_ONBOARDING_PHASE2_KEY);
  } catch {
    // Best effort only.
  }
}
