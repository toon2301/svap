/**
 * Preklad chýb z nahlasovacích endpointov.
 *
 * Backend vracia stabilný `code` a k nemu technický `error` text – preklad je
 * na FE, rovnaký vzor ako `translatePortfolioApiError`. Bez toho by sa
 * používateľovi zobrazila hláška v jazyku servera, nie appky.
 */

type Translator = (key: string, fallback: string) => string;

const CODE_KEYS: Record<string, { key: string; fallback: string }> = {
  description_required: {
    key: 'reports.descriptionRequired',
    fallback: 'Pri dôvode „iné" je popis povinný.',
  },
};

function apiErrorData(error: unknown): { code?: string; error?: string } | undefined {
  return (error as { response?: { data?: { code?: string; error?: string } } })
    ?.response?.data;
}

export function translateReportError(
  t: Translator,
  error: unknown,
  fallback: string,
): string {
  const data = apiErrorData(error);
  const entry = data?.code ? CODE_KEYS[data.code] : undefined;
  if (entry) return t(entry.key, entry.fallback);
  return data?.error || fallback;
}
