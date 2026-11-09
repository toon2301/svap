/**
 * Jednotné čítanie chybovej hlášky z API odpovede.
 *
 * Backend používa jednotný tvar (Shape V+): `data.error` je vždy ľudský string.
 * Pre spätnú kompatibilitu zachovávame fallback reťazec:
 *   data.error → data.detail → data.message → error.message → fallback
 * Chyba axiosu bez odpovede servera (offline, výpadok, časový limit) nesie len anglickú technickú hlášku
 * („Network Error“), preto sa pri nej vždy vráti fallback (nález 306).
 */
type ApiErrorLike = {
  response?: {
    data?: {
      error?: unknown;
      detail?: unknown;
      message?: unknown;
    };
  };
  message?: unknown;
  code?: unknown;
  isAxiosError?: unknown;
};

/** Kódy axiosu, pri ktorých server neodpovedal (rovnaký zoznam ako `isNetworkFailure` v profile cudzieho používateľa). */
const NETWORK_FAILURE_CODES = ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'];

/**
 * Server neodpovedal: chyba knižnice axios bez `response` (príznak `isAxiosError` alebo kód výpadku siete, DNS či
 * časového limitu). Obyčajné `Error` s vlastnou správou, bez kódu a bez príznaku axiosu, to nie je.
 */
function isAxiosErrorWithoutResponse(error: unknown): boolean {
  const candidate = error as ApiErrorLike | null | undefined;
  if (!candidate || candidate.response) return false;
  return candidate.isAxiosError === true || NETWORK_FAILURE_CODES.includes(String(candidate.code));
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

/**
 * Text chyby API pre používateľa. Chyba axiosu bez odpovede servera (offline, výpadok, časový limit) vráti `fallback`,
 * nie anglickú hlášku knižnice; inak platí poradie z hlavičky súboru.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosErrorWithoutResponse(error)) return fallback;
  const data = (error as ApiErrorLike)?.response?.data;
  return (
    firstNonEmptyString(
      data?.error,
      data?.detail,
      data?.message,
      (error as ApiErrorLike)?.message,
    ) ?? fallback
  );
}

type FieldErrorData = {
  error?: unknown;
  rating?: unknown;
  pros?: unknown;
  cons?: unknown;
  text?: unknown;
};

function firstListItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

/**
 * Chybová hláška pre formuláre s per-field DRF chybami (list per pole).
 * Poradie: `data.error` → prvý prvok `rating`/`pros`/`cons`/`text` → fallback.
 * Volajúci môže do `fallback` vložiť napr. `error.message` a tým rozšíriť reťazec.
 */
export function getFieldErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: FieldErrorData } })?.response?.data;
  return (
    firstNonEmptyString(
      data?.error,
      firstListItem(data?.rating),
      firstListItem(data?.pros),
      firstListItem(data?.cons),
      firstListItem(data?.text),
    ) ?? fallback
  );
}
