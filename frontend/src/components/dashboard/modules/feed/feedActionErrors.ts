/**
 * Chyba pri interakcii s príspevkom/komentárom.
 *
 * 404 z feed endpointov znamená „nedostupné" – zmazané, sprivátnené ALEBO
 * blokovanie. Hlásime to jednou neutrálnou vetou a ZÁMERNE nerozlišujeme
 * dôvod: rozdielna hláška by prezradila, že ide o blok. Rovnaký vzor a text
 * ako `feed.postUnavailable` z Fázy 4.2.
 */

type Translate = (key: string, fallback: string) => string;

export function translateFeedActionError(t: Translate, error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 404 || status === 403 || status === 410) {
    return t('feed.contentUnavailable', 'Tento obsah už nie je dostupný.');
  }
  return t('feed.likeError', 'Akciu sa nepodarilo uložiť.');
}
