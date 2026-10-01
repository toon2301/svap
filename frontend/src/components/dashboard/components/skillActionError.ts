/** Text chyby z odpovede API (`response.data.error`, potom `detail`); ak chýba, vráti `fallback`. */

export function getSkillActionErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown; detail?: unknown } } })?.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  return fallback;
}
