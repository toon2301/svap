/**
 * Ohraničí iba zber diagnostiky; chybu alebo prekročenie rozpočtu vráti ako `null`.
 * Neovplyvňuje timeouty ani výsledok pôvodnej asercie a nikdy nevypisuje text chyby.
 */
export function captureWithin<T>(operation: () => Promise<T>, budgetMs: number): Promise<T | null> {
  // Node väčší alebo neplatný timeout skracuje; taký rozpočet radšej vôbec nespúšťame.
  if (!Number.isFinite(budgetMs) || budgetMs <= 0 || budgetMs > 2_147_483_647) return Promise.resolve(null);

  return new Promise<T | null>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (value: T | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    timer = setTimeout(() => finish(null), budgetMs);
    // `then` zachytí aj synchronický throw. Rejection handler ostáva pripojený aj po deadline,
    // takže neskorá chyba pôvodnej operácie nevytvorí unhandledRejection.
    void Promise.resolve().then(operation).then(finish, () => finish(null));
  });
}
