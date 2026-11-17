import { requireSingleCategoryRun } from './notification-category-options';

/** Rovnaká poistka CLI ako pri UI scenári; API má vlastnú pevnú správu bez vstupných hodnôt. */
export function requireSinglePreferenceRun(args: readonly string[] = process.argv): void {
  try { requireSingleCategoryRun(args); } catch {
    throw new Error('E2E_PREFERENCES_REPEATS_REJECTED: API skúška povoľuje iba repeat-each=1.');
  }
}
