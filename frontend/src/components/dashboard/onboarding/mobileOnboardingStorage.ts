import type {
  MobileOnboardingState,
  MobileOnboardingStatus,
  MobileOnboardingStep,
} from '@/types';

export type { MobileOnboardingState, MobileOnboardingStatus, MobileOnboardingStep };

export const DEFAULT_MOBILE_ONBOARDING_STATE: MobileOnboardingState = {
  version: 1,
  status: 'in_progress',
  step: 'home',
};

type MobileOnboardingCachedProgress = {
  version: 1;
  step: MobileOnboardingStep;
  profileEditPhase2?: boolean;
};

const VALID_STEPS: MobileOnboardingStep[] = [
  'home',
  'profile_icon',
  'profile_edit',
  'edit_form',
  'search',
  'help_request',
  'requests',
];
const COMPLETED_STEPS: MobileOnboardingStep[] = ['edit_form', 'search', 'help_request', 'requests'];
const TERMINAL_STATUSES: MobileOnboardingStatus[] = ['completed', 'skipped'];
const MOBILE_ONBOARDING_PROGRESS_KEY_PREFIX = 'svaplyMobileOnboardingStepV1';

function isValidStep(step: unknown): step is MobileOnboardingStep {
  return VALID_STEPS.includes(step as MobileOnboardingStep);
}

function getCachedProgressKey(userId?: number | null): string | null {
  if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) return null;
  return `${MOBILE_ONBOARDING_PROGRESS_KEY_PREFIX}:${userId}`;
}

export function normalizeMobileOnboardingState(
  state?: MobileOnboardingState | null,
): MobileOnboardingState {
  if (
    !state ||
    state.version !== 1 ||
    !TERMINAL_STATUSES.concat('in_progress').includes(state.status) ||
    !VALID_STEPS.includes(state.step)
  ) {
    return { ...DEFAULT_MOBILE_ONBOARDING_STATE };
  }

  return {
    version: 1,
    status: state.status,
    step:
      state.status === 'completed' && !COMPLETED_STEPS.includes(state.step)
        ? 'edit_form'
        : state.step,
  };
}

/**
 * Keeps profile edit-mode-only progress consistent with the current profile scene
 * without rewinding the persisted tutorial progress back to the beginning.
 */
export function reconcileOnboardingState(
  state: MobileOnboardingState,
  activeModule: string,
  isProfileEditMode: boolean,
): MobileOnboardingState {
  if (state.status !== 'in_progress') return state;

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
  }

  return state;
}

export function getInitialMobileOnboardingState(
  state: MobileOnboardingState | null | undefined,
  activeModule = 'home',
  isProfileEditMode = false,
): MobileOnboardingState {
  void activeModule;
  void isProfileEditMode;
  return normalizeMobileOnboardingState(state);
}

export function isMobileOnboardingFinished(status: MobileOnboardingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function readMobileOnboardingCachedProgress(
  userId?: number | null,
): MobileOnboardingCachedProgress | null {
  const key = getCachedProgressKey(userId);
  if (!key || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MobileOnboardingCachedProgress>;

    if (parsed.version !== 1 || !isValidStep(parsed.step)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return {
      version: 1,
      step: parsed.step,
      profileEditPhase2: parsed.profileEditPhase2 === true,
    };
  } catch {
    return null;
  }
}

export function writeMobileOnboardingCachedProgress(
  userId: number | null | undefined,
  step: MobileOnboardingStep,
  profileEditPhase2 = false,
): void {
  const key = getCachedProgressKey(userId);
  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        step,
        profileEditPhase2,
      } satisfies MobileOnboardingCachedProgress),
    );
  } catch {
    // Best effort only. DB remains the source of truth.
  }
}

export function clearMobileOnboardingCachedProgress(userId?: number | null): void {
  const key = getCachedProgressKey(userId);
  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best effort only.
  }
}
