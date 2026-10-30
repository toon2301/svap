import fs from 'fs';
import path from 'path';

/** Diagnostika opisuje iba časy a počty; nikdy nečíta ani nekopíruje prihlasovací stav. */
export type SessionEventKind = 'initial-storage' | 'attempt-start' | 'refresh-start' | 'refresh-response'
  | 'refresh-success' | 'refresh-failure' | 'storage-start' | 'storage-success' | 'storage-failure';
export type SessionErrorKind = 'http' | 'timeout' | 'filesystem' | 'other';
export type SessionDiagnosticInput = { kind: SessionEventKind; status?: number; errorKind?: SessionErrorKind };
export type SessionDiagnosticEvent = {
  kind: SessionEventKind;
  at: number;
  attempt: number;
  generation: number;
  status: number | null;
  errorKind: SessionErrorKind | null;
};
export type SessionDiagnosticsSnapshot = {
  runStartedAt: number;
  generation: number;
  storedAt: number;
  events: SessionDiagnosticEvent[];
};
export interface SessionDiagnosticsRecorder {
  record(event: SessionDiagnosticInput): void;
  flush(): Promise<void>;
}

const EVENT_KINDS = new Set<SessionEventKind>([
  'initial-storage', 'attempt-start', 'refresh-start', 'refresh-response', 'refresh-success',
  'refresh-failure', 'storage-start', 'storage-success', 'storage-failure',
]);
const ERROR_KINDS = new Set<SessionErrorKind>(['http', 'timeout', 'filesystem', 'other']);
const MAX_EVENTS = 40;
const MAX_FILE_BYTES = 32_768;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const httpStatus = (value: unknown): value is number => integer(value) && value >= 100 && value <= 599;

/** Odvodí iba cestu vedľajšieho diagnostického súboru; obsah storageState sa nikdy neotvára. */
export function sessionDiagnosticsPath(storageStatePath: string): string {
  return path.join(path.dirname(storageStatePath), 'session-diagnostics.json');
}

/** Z chyby vracia len pevný druh; do výpisu nejde message, stack, cesta ani adresa. */
export function sessionErrorKind(error: unknown, phase: 'refresh' | 'storage'): SessionErrorKind {
  if (phase === 'storage') return 'filesystem';
  if (error instanceof Error && /^HTTP [1-5]\d{2}(?:\r?\n|$)/.test(error.message)) return 'http';
  return error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'other';
}

/** Existujúce varovanie zachová len bezpečný HTTP kód alebo pevný druh, nie surový text chyby. */
export function safeSessionError(error: unknown, phase: 'refresh' | 'storage'): string {
  const http = error instanceof Error ? /^HTTP ([1-5]\d{2})(?:\r?\n|$)/.exec(error.message) : null;
  return http ? `HTTP ${http[1]}` : sessionErrorKind(error, phase);
}

/** Vyberie len povolené skaláre aj z podvrhnutého alebo staršieho diagnostického súboru. */
export function parseSessionDiagnostics(value: unknown): SessionDiagnosticsSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!integer(raw.runStartedAt) || !integer(raw.generation) || !integer(raw.storedAt) || !Array.isArray(raw.events)) return null;
  const events: SessionDiagnosticEvent[] = [];
  for (const value of raw.events.slice(-MAX_EVENTS)) {
    if (!value || typeof value !== 'object') continue;
    const event = value as Record<string, unknown>;
    if (!EVENT_KINDS.has(event.kind as SessionEventKind) || !integer(event.at)
      || !integer(event.attempt) || !integer(event.generation)) continue;
    events.push({
      kind: event.kind as SessionEventKind,
      at: event.at,
      attempt: event.attempt,
      generation: event.generation,
      status: httpStatus(event.status) ? event.status : null,
      errorKind: ERROR_KINDS.has(event.errorKind as SessionErrorKind) ? event.errorKind as SessionErrorKind : null,
    });
  }
  return { runStartedAt: raw.runStartedAt, generation: raw.generation, storedAt: raw.storedAt, events };
}

/** Časový snímok vedľajších metadát; nie dôkaz, aké cookies sa naozaj aplikovali v browser context. */
export async function readSessionDiagnostics(storageStatePath: string): Promise<SessionDiagnosticsSnapshot | null> {
  try {
    const file = sessionDiagnosticsPath(storageStatePath);
    if ((await fs.promises.stat(file)).size > MAX_FILE_BYTES) return null;
    return parseSessionDiagnostics(JSON.parse(await fs.promises.readFile(file, 'utf8')));
  } catch {
    return null;
  }
}

/** Jediný riadok z povolených metadát; vstupné status/errorKind sa znovu filtrujú. */
export function formatSessionDiagnostic(event: SessionDiagnosticEvent): string {
  const safe = parseSessionDiagnostics({ runStartedAt: 0, generation: 0, storedAt: 0, events: [event] })?.events[0];
  if (!safe) return '[E2E-SESSION] kind=other';
  return `[E2E-SESSION] kind=${safe.kind} at=${safe.at} attempt=${safe.attempt} generation=${safe.generation}`
    + ` status=${safe.status ?? 'n/a'} errorKind=${safe.errorKind ?? 'n/a'}`;
}

/** Whitelistovaný časový snímok; generácia súboru nepotvrdzuje cookies použité v už vytvorenom kontexte. */
export function formatSessionDiagnostics(snapshot: SessionDiagnosticsSnapshot | null, observedAt = Date.now()): string {
  const at = integer(observedAt) ? observedAt : 0;
  const safe = parseSessionDiagnostics(snapshot);
  if (!safe) return `[E2E-SESSION] snapshot=unavailable observedAt=${at}`;
  return [
    `[E2E-SESSION] snapshot=available observedAt=${at} runStartedAt=${safe.runStartedAt}`
      + ` generation=${safe.generation} storedAt=${safe.storedAt} relation=temporal-only`,
    ...safe.events.map(formatSessionDiagnostic),
  ].join('\n');
}

/**
 * Zapína len pozorovanie po úspešnom prvom zápise prihlásenia. Diagnostické zápisy sú sériové a best-effort;
 * ich chyba nikdy nezopakuje refresh, nezablokuje zápis cookies ani nezmení výsledok prihlásenia.
 */
export async function createSessionDiagnostics(
  storageStatePath: string,
  emit: (line: string) => void = (line) => console.log(line),
): Promise<SessionDiagnosticsRecorder> {
  const startedAt = Date.now();
  const snapshot: SessionDiagnosticsSnapshot = { runStartedAt: startedAt, generation: 1, storedAt: startedAt, events: [] };
  const target = sessionDiagnosticsPath(storageStatePath);
  const temporary = `${target}.${process.pid}.tmp`;
  let attempt = 0;
  let pending = Promise.resolve();
  const publish = (line: string) => {
    try { emit(line); } catch { /* Zlyhanie diagnostického výstupu nesmie zmeniť prihlásenie. */ }
  };
  const recorder: SessionDiagnosticsRecorder = {
    record(input) {
      if (!EVENT_KINDS.has(input.kind)) return;
      if (input.kind === 'attempt-start') attempt += 1;
      const at = Date.now();
      if (input.kind === 'storage-success') {
        snapshot.generation += 1;
        snapshot.storedAt = at;
      }
      const event: SessionDiagnosticEvent = {
        kind: input.kind, at, attempt, generation: snapshot.generation,
        status: httpStatus(input.status) ? input.status : null,
        errorKind: ERROR_KINDS.has(input.errorKind as SessionErrorKind) ? input.errorKind! : null,
      };
      snapshot.events.push(event);
      snapshot.events = snapshot.events.slice(-MAX_EVENTS);
      publish(formatSessionDiagnostic(event));
      const content = JSON.stringify(snapshot);
      pending = pending.then(async () => {
        try {
          await fs.promises.writeFile(temporary, content, { mode: 0o600 });
          await fs.promises.rename(temporary, target);
        } catch {
          await fs.promises.rm(temporary, { force: true }).catch(() => undefined);
          publish('[E2E-SESSION] kind=diagnostics-write-failure errorKind=filesystem');
        }
      });
    },
    async flush() { await pending; },
  };
  recorder.record({ kind: 'initial-storage' });
  await recorder.flush();
  return recorder;
}
