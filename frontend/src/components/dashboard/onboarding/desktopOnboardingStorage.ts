import type {
  DesktopOnboardingState,
  DesktopOnboardingStatus,
  DesktopOnboardingStep,
} from '@/types';

export type { DesktopOnboardingState, DesktopOnboardingStatus, DesktopOnboardingStep };

export const DEFAULT_DESKTOP_ONBOARDING_STATE: DesktopOnboardingState = {
  version: 1,
  status: 'in_progress',
  step: 'navigation',
};

const VALID_STEPS: DesktopOnboardingStep[] = [
  'navigation',
  'profile_icon',
  'profile_edit',
  'edit_form',
  'search',
  'help_request',
  'requests',
  'messages',
  'dashboard_finish',
];
const COMPLETED_STEPS: DesktopOnboardingStep[] = [
  'profile_icon',
  'edit_form',
  'search',
  'help_request',
  'requests',
  'messages',
  'dashboard_finish',
];
const TERMINAL_STATUSES: DesktopOnboardingStatus[] = ['completed', 'skipped'];

function getDesktopOnboardingStepRank(step: DesktopOnboardingStep): number | null {
  const rank = VALID_STEPS.indexOf(step);
  return rank === -1 ? null : rank;
}

export function normalizeDesktopOnboardingState(
  state?: DesktopOnboardingState | null,
): DesktopOnboardingState {
  if (
    !state ||
    state.version !== 1 ||
    !TERMINAL_STATUSES.concat('in_progress').includes(state.status) ||
    !VALID_STEPS.includes(state.step)
  ) {
    return { ...DEFAULT_DESKTOP_ONBOARDING_STATE };
  }

  return {
    version: 1,
    status: state.status,
    step:
      state.status === 'completed' && !COMPLETED_STEPS.includes(state.step)
        ? 'profile_icon'
        : state.step,
  };
}

export function getInitialDesktopOnboardingState(
  state: DesktopOnboardingState | null | undefined,
): DesktopOnboardingState {
  return normalizeDesktopOnboardingState(state);
}

export function isDesktopOnboardingServerStateBehind(
  localState: DesktopOnboardingState,
  serverState: DesktopOnboardingState,
): boolean {
  if (localState.status !== 'in_progress' || serverState.status !== 'in_progress') {
    return false;
  }

  const localRank = getDesktopOnboardingStepRank(localState.step);
  const serverRank = getDesktopOnboardingStepRank(serverState.step);
  if (localRank == null || serverRank == null) {
    return false;
  }

  return serverRank < localRank;
}

export function isDesktopOnboardingFinished(status: DesktopOnboardingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
