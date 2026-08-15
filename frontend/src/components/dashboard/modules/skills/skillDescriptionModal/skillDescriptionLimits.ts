export const SKILL_DESCRIPTION_MAX_LENGTH = 150;

/**
 * Dĺžka v Unicode code-pointoch, nie v UTF-16 jednotkách.
 *
 * Backend meria ten istý limit Pythonovým `len()`, teda v code-pointoch –
 * emoji je preň jeden znak. `String.length` v JS ho počíta ako dva, takže FE
 * bez tohto blokoval používateľa na polovici toho, čo backend dovolí, a
 * počítadlo pod poľom ukazovalo iné číslo, než podľa čoho sa naozaj validuje.
 *
 * Zložené emoji (ZWJ sekvencie, modifikátory pleti) sú aj tak viac
 * code-pointov – to je zámer, nie nedostatok: cieľom je zhoda s backendom,
 * nie počítanie grafém.
 */
export function countSkillDescriptionLength(value: string): number {
  // Spread iteruje reťazec po code-pointoch, nie po UTF-16 jednotkách.
  return [...value].length;
}

export function limitSkillDescription(value: string): string {
  const codePoints = [...value];
  if (codePoints.length <= SKILL_DESCRIPTION_MAX_LENGTH) return value;
  // Orezanie po code-pointoch – `slice` nad UTF-16 vedelo rozpoliť surrogate
  // pár a nechať v texte osamotenú polovicu emoji.
  return codePoints.slice(0, SKILL_DESCRIPTION_MAX_LENGTH).join('');
}
