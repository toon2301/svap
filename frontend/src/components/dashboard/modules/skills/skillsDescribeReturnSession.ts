type SkillsDescribeReturnModule = 'profile';

type StoredSkillsDescribeReturn = {
  module: SkillsDescribeReturnModule;
  skillId: number;
};

const STORAGE_KEY = 'skillsDescribeReturnModule';

function readStoredReturn(): StoredSkillsDescribeReturn | null {
  if (typeof window === 'undefined') return null;

  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSkillsDescribeReturn>;
    if (
      parsed.module === 'profile' &&
      typeof parsed.skillId === 'number' &&
      Number.isSafeInteger(parsed.skillId)
    ) {
      return {
        module: parsed.module,
        skillId: parsed.skillId,
      };
    }
  } catch {
    // Invalid or legacy value. Treat it as stale.
  }

  clearSkillsDescribeReturnModule();
  return null;
}

export function setSkillsDescribeProfileReturn(skillId: number): void {
  if (typeof window === 'undefined' || !Number.isSafeInteger(skillId)) return;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        module: 'profile',
        skillId,
      } satisfies StoredSkillsDescribeReturn),
    );
  } catch {
    // Navigation still works; only the optional profile return hint is unavailable.
  }
}

export function getSkillsDescribeReturnModule(
  skillId: number | null | undefined,
): SkillsDescribeReturnModule | null {
  const stored = readStoredReturn();
  if (!stored) return null;

  if (stored.skillId !== skillId) {
    clearSkillsDescribeReturnModule();
    return null;
  }

  return stored.module;
}

export function clearSkillsDescribeReturnModule(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
