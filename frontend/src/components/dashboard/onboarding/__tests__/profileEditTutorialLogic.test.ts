import {
  resolveProfileEditGoNextAction,
  resolveProfileSkillsClickAction,
} from '../profileEditTutorialLogic';

describe('profileEditTutorialLogic', () => {
  describe('resolveProfileEditGoNextAction', () => {
    it('advances to phase 2 from profile_edit phase 1', () => {
      expect(resolveProfileEditGoNextAction('profile_edit', false)).toBe('advance_to_phase_2');
      expect(resolveProfileEditGoNextAction('profile_edit', false, 'edit')).toBe(
        'advance_to_phase_2',
      );
    });

    it('advances to search from profile_edit phase 2', () => {
      expect(resolveProfileEditGoNextAction('profile_edit', true)).toBe('advance_to_search');
    });

    it('advances to search when the rotating highlight is on skills', () => {
      expect(resolveProfileEditGoNextAction('profile_edit', false, 'skills')).toBe(
        'advance_to_search',
      );
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
      expect(resolveProfileSkillsClickAction('profile_edit', false, true, 'edit')).toBe(
        'advance_to_phase_2_only',
      );
    });

    it('marks phase 2 and uses default navigation in profile_edit phase 2', () => {
      expect(resolveProfileSkillsClickAction('profile_edit', true, true)).toBe(
        'mark_phase_2_and_navigate',
      );
    });

    it('marks phase 2 and uses default navigation when direct skills click matches the rotating highlight', () => {
      expect(resolveProfileSkillsClickAction('profile_edit', false, true, 'skills')).toBe(
        'mark_phase_2_and_navigate',
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
