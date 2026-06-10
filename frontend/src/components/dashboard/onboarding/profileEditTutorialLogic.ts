import type { DesktopOnboardingStep, MobileOnboardingStep } from '@/types';

type ProfileOnboardingStep = DesktopOnboardingStep | MobileOnboardingStep;

export type ProfileEditGoNextAction =
  | 'advance_to_phase_2'
  | 'advance_to_search'
  | null;

export type ProfileEditHighlightTarget = 'edit' | 'skills';

/** Pure helper for profile_edit "Ďalej" behavior (unit-tested). */
export function resolveProfileEditGoNextAction(
  step: ProfileOnboardingStep,
  isProfileEditPhase2: boolean,
  highlightedTarget?: ProfileEditHighlightTarget,
): ProfileEditGoNextAction {
  if (step !== 'profile_edit') return null;
  return isProfileEditPhase2 || highlightedTarget === 'skills'
    ? 'advance_to_search'
    : 'advance_to_phase_2';
}

export type ProfileSkillsClickAction =
  | 'mark_phase_2_and_navigate'
  | 'advance_to_phase_2_only'
  | 'default_navigate';

/** Pure helper for profile_edit skills button during onboarding. */
export function resolveProfileSkillsClickAction(
  step: ProfileOnboardingStep,
  isProfileEditPhase2: boolean,
  isOnboardingActive: boolean,
  highlightedTarget?: ProfileEditHighlightTarget,
): ProfileSkillsClickAction {
  if (!isOnboardingActive || step !== 'profile_edit') {
    return 'default_navigate';
  }
  return isProfileEditPhase2 || highlightedTarget === 'skills'
    ? 'mark_phase_2_and_navigate'
    : 'advance_to_phase_2_only';
}
