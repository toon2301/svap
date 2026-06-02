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

const VALID_STEPS: MobileOnboardingStep[] = ['home', 'profile_icon', 'profile_edit', 'edit_form'];
const TERMINAL_STATUSES: MobileOnboardingStatus[] = ['completed', 'skipped'];

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
    step: state.status === 'completed' ? 'edit_form' : state.step,
  };
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

export function getInitialMobileOnboardingState(
  state: MobileOnboardingState | null | undefined,
  activeModule = 'home',
  isProfileEditMode = false,
): MobileOnboardingState {
  return reconcileOnboardingState(
    normalizeMobileOnboardingState(state),
    activeModule,
    isProfileEditMode,
  );
}

export function isMobileOnboardingFinished(status: MobileOnboardingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
