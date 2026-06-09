const DESKTOP_ONBOARDING_POSTPONED_KEY = 'svaplyDesktopOnboardingPostponedV1';

export function isDesktopOnboardingPostponedForSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DESKTOP_ONBOARDING_POSTPONED_KEY) === '1';
  } catch {
    return false;
  }
}

export function postponeDesktopOnboardingForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DESKTOP_ONBOARDING_POSTPONED_KEY, '1');
  } catch {
    // In-memory state still hides onboarding for the current render tree.
  }
}

export function clearDesktopOnboardingPostponedForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(DESKTOP_ONBOARDING_POSTPONED_KEY);
  } catch {
    // Best effort only.
  }
}
