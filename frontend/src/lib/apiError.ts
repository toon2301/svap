/**
 * Jednotné čítanie chybovej hlášky z API odpovede.
 *
 * Backend používa jednotný tvar (Shape V+): `data.error` je vždy ľudský string.
 * Pre spätnú kompatibilitu a sieťové chyby zachovávame fallback reťazec:
 *   data.error → data.detail → data.message → (axios) error.message → fallback
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
};

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
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
