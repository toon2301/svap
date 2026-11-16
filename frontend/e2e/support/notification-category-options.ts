/**
 * CLI repeatEach sa v Playwrighte aplikuje v runnerovi, nie do public projektu
 * workeru. Zápis preto odmietne už konfigurácia rodiča, pred global setupom.
 */
export function requireSingleCategoryRun(args: readonly string[] = process.argv): void {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--repeat-each') {
      if (args[index + 1] !== '1') throw new Error('E2E_CATEGORY_REPEATS_REJECTED: UI skúška povoľuje iba repeat-each=1.');
      index += 1;
    } else if (argument.startsWith('--repeat-each=')) {
      if (argument !== '--repeat-each=1') throw new Error('E2E_CATEGORY_REPEATS_REJECTED: UI skúška povoľuje iba repeat-each=1.');
    }
  }
}
