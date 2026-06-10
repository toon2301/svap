const DESKTOP_ONBOARDING_POSTPONED_KEY = 'svaplyDesktopOnboardingPostponedV1';
const DESKTOP_ONBOARDING_PHASE2_KEY = 'svaplyDesktopOnboardingPhase2V1';
const DESKTOP_ONBOARDING_AWAITING_SKILL_KEY = 'svaplyDesktopOnboardingAwaitingSkillV1';

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

export function setDesktopOnboardingResumePhase2(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DESKTOP_ONBOARDING_PHASE2_KEY, '1');
  } catch {
    // Best effort only.
  }
}

export function isDesktopOnboardingResumePhase2(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DESKTOP_ONBOARDING_PHASE2_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearDesktopOnboardingResumePhase2(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(DESKTOP_ONBOARDING_PHASE2_KEY);
  } catch {
    // Best effort only.
  }
}

export function setDesktopOnboardingAwaitingSkillCreation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DESKTOP_ONBOARDING_AWAITING_SKILL_KEY, '1');
  } catch {
    // Best effort only.
  }
}

export function isDesktopOnboardingAwaitingSkillCreation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DESKTOP_ONBOARDING_AWAITING_SKILL_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearDesktopOnboardingAwaitingSkillCreation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(DESKTOP_ONBOARDING_AWAITING_SKILL_KEY);
  } catch {
    // Best effort only.
  }
}
