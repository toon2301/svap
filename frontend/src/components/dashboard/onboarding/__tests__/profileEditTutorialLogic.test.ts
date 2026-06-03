import {
  resolveProfileEditGoNextAction,
  resolveProfileSkillsClickAction,
} from '../profileEditTutorialLogic';

describe('profileEditTutorialLogic', () => {
  describe('resolveProfileEditGoNextAction', () => {
    it('advances to phase 2 from profile_edit phase 1', () => {
      expect(resolveProfileEditGoNextAction('profile_edit', false)).toBe('advance_to_phase_2');
    });

    it('finishes onboarding and navigates from profile_edit phase 2', () => {
      expect(resolveProfileEditGoNextAction('profile_edit', true)).toBe('finish_and_navigate');
    });

    it('returns null for other steps', () => {
      expect(resolveProfileEditGoNextAction('home', false)).toBeNull();
    });
  });

  describe('resolveProfileSkillsClickAction', () => {
    it('only advances phase in profile_edit phase 1', () => {
      expect(resolveProfileSkillsClickAction('profile_edit', false, true)).toBe(
        'advance_to_phase_2_only',
      );
    });

    it('finishes and navigates in profile_edit phase 2', () => {
      expect(resolveProfileSkillsClickAction('profile_edit', true, true)).toBe(
        'finish_and_navigate',
      );
    });

    it('uses default navigation outside onboarding step', () => {
      expect(resolveProfileSkillsClickAction('home', false, true)).toBe('default_navigate');
      expect(resolveProfileSkillsClickAction('profile_edit', false, false)).toBe(
        'default_navigate',
      );
    });
  });
});
