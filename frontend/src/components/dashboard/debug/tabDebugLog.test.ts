/**
 * DOČASNÉ LADENIE – NA ODSTRÁNENIE spolu s priečinkom `debug`.
 *
 * Stráži to jediné, čo tu je rizikové: bez `?debugtabs=1` sa nesmie nazbierať
 * ani riadok, takže bežný používateľ pásik nikdy neuvidí.
 */

describe('ladiaci záznam záložiek', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('bez parametra v adrese nezbiera nič', async () => {
    window.history.replaceState(null, '', '/dashboard/users/peter');
    const mod = await import('./tabDebugLog');

    expect(mod.isTabDebugEnabled()).toBe(false);
    mod.logTabDebug('nemá sa objaviť');

    const seen: string[][] = [];
    mod.subscribeTabDebug((lines) => seen.push(lines));
    expect(seen[0]).toEqual([]);
  });

  it('s parametrom zbiera a pridáva riadky za sebou', async () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?debugtabs=1');
    const mod = await import('./tabDebugLog');

    expect(mod.isTabDebugEnabled()).toBe(true);
    mod.logTabDebug('prvá');
    mod.logTabDebug('druhá');

    let lines: string[] = [];
    mod.subscribeTabDebug((next) => { lines = next; });
    // Poradie udalostí je to, čo sa skúma – riadky sa pridávajú, neprepisujú.
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('prvá');
    expect(lines[1]).toContain('druhá');
  });

  it('parameter sa drží, aj keď ho appka z adresy odstráni', async () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?debugtabs=1');
    const mod = await import('./tabDebugLog');
    expect(mod.isTabDebugEnabled()).toBe(true);

    // Appka si adresu priebežne prepisuje (`?tab=`, kanonizácia slugu) – bez
    // podržania by ladenie zhaslo uprostred meraného scenára.
    window.history.replaceState(null, '', '/dashboard/users/peter?tab=portfolio');

    expect(mod.isTabDebugEnabled()).toBe(true);
  });

  it('drží len posledných pár udalostí', async () => {
    window.history.replaceState(null, '', '/dashboard?debugtabs=1');
    const mod = await import('./tabDebugLog');

    for (let i = 0; i < 25; i += 1) mod.logTabDebug(`udalosť ${i}`);

    let lines: string[] = [];
    mod.subscribeTabDebug((next) => { lines = next; });
    expect(lines.length).toBeLessThanOrEqual(10);
    expect(lines[lines.length - 1]).toContain('udalosť 24');
  });
});
