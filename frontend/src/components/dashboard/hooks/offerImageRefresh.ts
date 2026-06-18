import type { DashboardSkill } from './useSkillsModals';

const REFRESH_MAX_ATTEMPTS = 5;
const REFRESH_DELAY_MS = 1500;

/**
 * Spustí background polling konkrétnej karty po uploade obrázka.
 * Pokračuje kým sú pending obrázky alebo kým neskončia pokusy.
 * Neblokuje UI — iba aktualizuje lokálny stav cez applySkillUpdate.
 */
export function startBoundedImageRefresh(
  skillId: number,
  fetchSkillDetail: (id: number) => Promise<DashboardSkill>,
  applySkillUpdate: (skill: DashboardSkill) => void,
): void {
  let attempt = 0;
  const poll = async () => {
    attempt++;
    if (attempt > REFRESH_MAX_ATTEMPTS) return;
    try {
      const latest = await fetchSkillDetail(skillId);
      applySkillUpdate(latest);
      const hasPending = (latest.images ?? []).some((img) => img.status === 'pending');
      if (hasPending) {
        setTimeout(poll, REFRESH_DELAY_MS);
      }
    } catch {
      // silent — background polling failure should not disrupt the UI
    }
  };
  setTimeout(poll, REFRESH_DELAY_MS);
}
