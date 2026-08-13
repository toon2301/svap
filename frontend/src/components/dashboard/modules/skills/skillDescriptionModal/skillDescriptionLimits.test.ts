import {
  limitSkillDescription,
  SKILL_DESCRIPTION_MAX_LENGTH,
} from './skillDescriptionLimits';

describe('skillDescriptionLimits', () => {
  it('accepts exactly 150 characters', () => {
    const value = 'a'.repeat(150);

    expect(limitSkillDescription(value)).toBe(value);
    expect(SKILL_DESCRIPTION_MAX_LENGTH).toBe(150);
  });

  it('clips pasted text to the first 150 characters', () => {
    const value = `${'a'.repeat(150)}discarded`;

    expect(limitSkillDescription(value)).toBe('a'.repeat(150));
  });
});
