import { requireSingleCategoryRun } from './notification-category-options';

/** Overený parser CLI, ale samostatná pevná chyba zapisujúcej komentárovej skúšky. */
export function requireSingleCommentRun(args: readonly string[] = process.argv): void {
  try { requireSingleCategoryRun(args); } catch {
    throw new Error('E2E_COMMENTS_REPEATS_REJECTED: Komentárová skúška povoľuje iba repeat-each=1.');
  }
}
