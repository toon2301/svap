import type { MobileOnboardingStep } from '@/types';

export type ProfileEditGoNextAction =
  | 'advance_to_phase_2'
  | 'finish_and_navigate'
  | null;

export type ProfileEditHighlightTarget = 'edit' | 'skills';

/** Pure helper for profile_edit "Ďalej" behavior (unit-tested). */
export function resolveProfileEditGoNextAction(
  step: MobileOnboardingStep,
  isProfileEditPhase2: boolean,
  highlightedTarget?: ProfileEditHighlightTarget,
): ProfileEditGoNextAction {
  if (step !== 'profile_edit') return null;
  return isProfileEditPhase2 || highlightedTarget === 'skills'
    ? 'finish_and_navigate'
    : 'advance_to_phase_2';
}

export type ProfileSkillsClickAction =
  | 'finish_and_navigate'
  | 'advance_to_phase_2_only'
  | 'default_navigate';

/** Pure helper for profile_edit skills button during onboarding. */
export function resolveProfileSkillsClickAction(
  step: MobileOnboardingStep,
  isProfileEditPhase2: boolean,
  isOnboardingActive: boolean,
  highlightedTarget?: ProfileEditHighlightTarget,
): ProfileSkillsClickAction {
  if (!isOnboardingActive || step !== 'profile_edit') {
    return 'default_navigate';
  }
  return isProfileEditPhase2 || highlightedTarget === 'skills'
    ? 'finish_and_navigate'
    : 'advance_to_phase_2_only';
}
