/** Nemenný snímok posledného pozorovaného CSRF GET v okamihu začiatku obnovy. */
export type CsrfRequestSnapshot = {
  startedAtMs: number;
  responseAtMs: number | null;
  finishedAtMs: number | null;
  status: number | null;
  failed: boolean;
};

/** Iba príznak zhody pôvodu a časy; adresy pôvodov ani obsah odpovede tu nie sú. */
export type RefreshProvenance = {
  sameOrigin: boolean | null;
  snapshotAtMs: number;
  csrf: CsrfRequestSnapshot | null;
};

/** Bezpečné časové číslo, nikdy ľubovoľná hodnota z diagnostického vstupu. */
function milliseconds(value: unknown): string {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'n/a';
}

/** Formát má pevné polia; nepozorovaný GET nie je dôkaz, že sa vôbec neuskutočnil. */
export function formatRefreshProvenance(value: RefreshProvenance | undefined): string[] {
  const origin = value?.sameOrigin === true ? 'áno' : value?.sameOrigin === false ? 'nie' : 'nezistiteľné';
  const lines = [`        refresh same origin: ${origin}`];
  if (!value) return [...lines, '        refresh preceding csrf GET: nezistiteľné'];
  if (!value.csrf) return [...lines, '        refresh preceding csrf GET: nepozorované'];
  const csrf = value.csrf;
  const status = typeof csrf.status === 'number' && Number.isInteger(csrf.status) && csrf.status >= 100 && csrf.status <= 599
    ? String(csrf.status) : 'n/a';
  return [...lines, '        refresh preceding csrf GET: /api/auth/csrf-token/'
    + ` status=${status} start=${milliseconds(csrf.startedAtMs)} response=${milliseconds(csrf.responseAtMs)}`
    + ` end=${milliseconds(csrf.finishedAtMs)} snapshot=${milliseconds(value.snapshotAtMs)}`
    + ` failed=${csrf.failed === true ? 'áno' : csrf.failed === false ? 'nie' : 'nezistiteľné'}`];
}
