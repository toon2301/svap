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
