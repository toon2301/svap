export const MOBILE_ONBOARDING_STORAGE_KEY = 'svaplyMobileOnboardingV1';

/** @deprecated Replaced by {@link MOBILE_ONBOARDING_STORAGE_KEY} — read for migration only. */
const LEGACY_MOBILE_ONBOARDING_STORAGE_KEY = 'svaply.mobileOnboarding.phase1.v1';

export type MobileOnboardingStep = 'home' | 'profile_icon' | 'profile_edit' | 'edit_form';

export type MobileOnboardingStatus = 'in_progress' | 'paused' | 'completed' | 'skipped';

export type MobileOnboardingState = {
  version: 1;
  status: MobileOnboardingStatus;
  step: MobileOnboardingStep;
};

const DEFAULT_STATE: MobileOnboardingState = {
  version: 1,
  status: 'in_progress',
  step: 'home',
};

const VALID_STEPS: MobileOnboardingStep[] = ['home', 'profile_icon', 'profile_edit', 'edit_form'];
const TERMINAL_STATUSES: MobileOnboardingStatus[] = ['completed', 'skipped'];

/** Maps the old 5-step tutorial indices to the current 4-step flow. */
function mapLegacyStepIndex(stepIndex: number): MobileOnboardingStep {
  if (stepIndex <= 0) return 'home';
  if (stepIndex === 1) return 'profile_icon';
  if (stepIndex === 2) return 'profile_icon';
  if (stepIndex === 3) return 'profile_edit';
  return 'edit_form';
}

/**
 * Keeps the saved step consistent with the screen the user is on.
 * Prevents resuming at step 3 while still on the home feed.
 */
export function reconcileOnboardingState(
  state: MobileOnboardingState,
  activeModule: string,
  isProfileEditMode: boolean,
): MobileOnboardingState {
  if (state.status !== 'in_progress') return state;

  if (activeModule === 'home') {
    if (state.step === 'profile_edit' || state.step === 'edit_form') {
      return { ...state, step: 'home' };
    }
    return state;
  }

  if (activeModule === 'profile') {
    if (isProfileEditMode) {
      if (state.step === 'home' || state.step === 'profile_icon') {
        return { ...state, step: 'edit_form' };
      }
      return state;
    }

    if (state.step === 'edit_form') {
      return { ...state, step: 'profile_edit' };
    }

    if (state.step === 'home' || state.step === 'profile_icon') {
      return { ...state, step: 'profile_edit' };
    }
    return state;
  }

  if (state.step !== 'home') {
    return { ...state, step: 'home' };
  }

  return state;
}

function readLegacyMobileOnboardingState(): MobileOnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_MOBILE_ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      status?: string;
      stepIndex?: number;
    };

    if (parsed.status === 'completed' || parsed.status === 'skipped') {
      return {
        version: 1,
        status: parsed.status,
        step: 'edit_form',
      };
    }

    if (parsed.status === 'active' && typeof parsed.stepIndex === 'number') {
      return {
        version: 1,
        status: 'in_progress',
        step: mapLegacyStepIndex(parsed.stepIndex),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function readMobileOnboardingState(): MobileOnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOBILE_ONBOARDING_STORAGE_KEY);
    if (!raw) return readLegacyMobileOnboardingState();
    const parsed = JSON.parse(raw) as Partial<MobileOnboardingState>;
    if (parsed.version !== 1) return readLegacyMobileOnboardingState();
    if (!parsed.status || !parsed.step) return readLegacyMobileOnboardingState();
    if (!VALID_STEPS.includes(parsed.step)) return readLegacyMobileOnboardingState();
    if (!['in_progress', 'paused', 'completed', 'skipped'].includes(parsed.status)) {
      return readLegacyMobileOnboardingState();
    }

    // "paused" used to hide tutorial permanently — treat as resumable in_progress.
    if (parsed.status === 'paused') {
      return {
        version: 1,
        status: 'in_progress',
        step: parsed.step,
      };
    }

    return parsed as MobileOnboardingState;
  } catch {
    return readLegacyMobileOnboardingState();
  }
}

export function writeMobileOnboardingState(state: MobileOnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOBILE_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    window.localStorage.removeItem(LEGACY_MOBILE_ONBOARDING_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function getInitialMobileOnboardingState(
  activeModule = 'home',
  isProfileEditMode = false,
): MobileOnboardingState {
  const stored = readMobileOnboardingState();
  if (stored && TERMINAL_STATUSES.includes(stored.status)) {
    return stored;
  }
  if (stored && stored.status === 'in_progress') {
    return reconcileOnboardingState(stored, activeModule, isProfileEditMode);
  }
  return { ...DEFAULT_STATE };
}

export function isMobileOnboardingFinished(status: MobileOnboardingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Clears saved progress so the mobile tutorial can start again (e.g. QA or settings). */
export function resetMobileOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MOBILE_ONBOARDING_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_MOBILE_ONBOARDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}
