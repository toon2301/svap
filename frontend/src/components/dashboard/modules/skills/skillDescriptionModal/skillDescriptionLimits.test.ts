import {
  countSkillDescriptionLength,
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

  // Backend meria limit Pythonovým len(), teda v code-pointoch. JS
  // String.length počíta emoji ako 2 – bez zhody by FE blokoval na polovici.
  it('counts an emoji as one character, like the backend does', () => {
    expect(countSkillDescriptionLength('😀')).toBe(1);
    expect('😀'.length).toBe(2);
  });

  it('accepts exactly 150 emoji', () => {
    const value = '😀'.repeat(150);

    expect(countSkillDescriptionLength(value)).toBe(150);
    expect(limitSkillDescription(value)).toBe(value);
  });

  it('accepts 149 ASCII characters followed by an emoji', () => {
    const value = `${'a'.repeat(149)}😀`;

    expect(countSkillDescriptionLength(value)).toBe(150);
    expect(limitSkillDescription(value)).toBe(value);
  });

  it('never leaves half of an emoji behind when clipping', () => {
    const value = `${'a'.repeat(149)}😀😀`;

    const clipped = limitSkillDescription(value);

    expect(countSkillDescriptionLength(clipped)).toBe(150);
    expect(clipped).toBe(`${'a'.repeat(149)}😀`);
    // Osamotený surrogate by sa vykreslil ako „�".
    expect(clipped).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('clips a mixed string by code points, not by UTF-16 units', () => {
    const value = '😀'.repeat(200);

    expect(limitSkillDescription(value)).toBe('😀'.repeat(150));
  });
});
