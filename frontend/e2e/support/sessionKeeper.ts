import fs from 'fs';
import { safeSessionError, sessionErrorKind, type SessionDiagnosticsRecorder } from './session-diagnostics';

/**
 * Strážca prihlásenia pre E2E testy (nález 202).
 *
 * `global-setup.ts` sa prihlási raz a všetky testy štartujú zo súboru s uloženým stavom prehliadača. Prihlásenie
 * (access token) platí 15 minút a jeho obnova je jednorazová: backend pri nej vydá nový refresh token a starý zablokuje.
 * Keď prihlásenie vyprší, prvý test ho obnoví len vo svojom prehliadači a všetky ostatné ostanú so zablokovaným tokenom,
 * takže ich appka odhlási. Strážca preto počas celého behu v pravidelných intervaloch obnoví prihlásenie sám a súbor
 * prepíše. Každý nový test tak štartuje s čerstvým prihlásením a žiadny test ho nemusí obnovovať.
 *
 * Modul nezávisí od Playwrightu (obnovu dostane ako funkciu), takže ho vie otestovať Jest.
 */

/** Uložený stav prehliadača (Playwright `storageState`): cookies a localStorage. */
export interface StoredBrowserState {
  cookies: unknown[];
  origins: unknown[];
}

export interface SessionKeeperOptions {
  /** Súbor s uloženým stavom, z ktorého štartujú testy. */
  storageStatePath: string;
  /** Obnoví prihlásenie a vráti nový uložený stav; pri zlyhaní nech vyhodí chybu bez tajných údajov v texte. */
  refresh: () => Promise<StoredBrowserState>;
  /** Ako často obnovovať, v milisekundách (predvolene 5 minút; prihlásenie platí 15). */
  intervalMs?: number;
  /** Kam ísť s varovaním (predvolene `console.warn`). */
  warn?: (message: string) => void;
  /** Voliteľné anonymné časovanie; chyba pozorovateľa nesmie meniť obnovu prihlásenia. */
  diagnostics?: SessionDiagnosticsRecorder;
}

export interface SessionKeeper {
  /** Zastaví obnovovanie; ďalšia sa už nespustí a vrátený sľub čaká, kým sa dokončí práve rozbehnutá obnova. */
  stop(): Promise<void>;
}

export const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60_000;

/** Windows občas nepustí prepísať súbor, ktorý práve číta iný proces. */
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const MAX_RENAME_ATTEMPTS = 5;

/**
 * Zapíše súbor tak, aby ho čitateľ nikdy nevidel rozpísaný: najprv dočasný súbor v tom istom priečinku, potom premenovanie.
 * Súbor nesie prihlásenie, preto má na POSIX systémoch práva len pre vlastníka.
 */
export async function writeFileAtomically(target: string, content: string): Promise<void> {
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    // Aj zlyhanie uprostred zápisu (plný disk) nesmie nechať čiastočný súbor s prihlásením na disku.
    await fs.promises.writeFile(temporary, content, { mode: 0o600 });
    for (let attempt = 1; ; attempt += 1) {
      try {
        await fs.promises.rename(temporary, target);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? '';
        if (!RETRYABLE_RENAME_CODES.has(code) || attempt >= MAX_RENAME_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }
  } catch (error) {
    await fs.promises.rm(temporary, { force: true });
    throw error;
  }
}

/** Spustí obnovovanie prihlásenia v pravidelných intervaloch; vráti ovládač na jeho zastavenie. */
export function startSessionKeeper(options: SessionKeeperOptions): SessionKeeper {
  const intervalMs = options.intervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  let failuresInRow = 0;
  // Čerstvo obnovený stav, ktorý sa ešte nepodarilo zapísať. Obnova je jednorazová (server už starý refresh token zablokoval), takže
  // ho nesmieme zahodiť: ďalšia obnova zo zastaraného súboru by už nikdy nepreišla. Ďalší pokus ho preto len zapíše.
  let unsavedState: StoredBrowserState | null = null;
  const record: SessionDiagnosticsRecorder['record'] = (event) => {
    try { options.diagnostics?.record(event); } catch { /* Diagnostika je iba pozorovateľ. */ }
  };

  const refreshNow = async () => {
    record({ kind: 'attempt-start' });
    let step = 'obnova';
    try {
      if (!unsavedState) {
        record({ kind: 'refresh-start' });
        unsavedState = await options.refresh();
        record({ kind: 'refresh-success' });
      }
      step = 'zápis';
      record({ kind: 'storage-start' });
      await writeFileAtomically(options.storageStatePath, JSON.stringify(unsavedState, null, 2));
      unsavedState = null;
      failuresInRow = 0;
      record({ kind: 'storage-success' });
    } catch (error) {
      failuresInRow += 1;
      const phase = step === 'zápis' ? 'storage' : 'refresh';
      record({ kind: phase === 'storage' ? 'storage-failure' : 'refresh-failure', errorKind: sessionErrorKind(error, phase) });
      warn(
        step === 'zápis'
          ? `Strážca prihlásenia: obnova prebehla, no zápis súboru zlyhal (${failuresInRow}. pokus za sebou): ${safeSessionError(error, phase)}. ` +
              'Nový stav ostal v pamäti a zápis sa zopakuje pri ďalšom pokuse; do vtedy testy štartujú so starším prihlásením.'
          : `Strážca prihlásenia: obnova zlyhala (${failuresInRow}. pokus za sebou): ${safeSessionError(error, phase)}. ` +
              'Súbor s prihlásením ostal bez zmeny, testy po vypršaní prihlásenia môžu padať.',
      );
    }
  };

  const timer = setInterval(() => {
    // Pomalá obnova nesmie narážať do ďalšej: rotácia tokenu je jednorazová.
    if (stopped || inFlight) return;
    inFlight = refreshNow().finally(() => {
      inFlight = null;
    });
  }, intervalMs);
  // Nedrží proces nažive, ak by runner skončil skôr.
  timer.unref?.();

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}
