export const SKILL_DESCRIPTION_MAX_LENGTH = 150;

export function limitSkillDescription(value: string): string {
  return value.slice(0, SKILL_DESCRIPTION_MAX_LENGTH);
}
