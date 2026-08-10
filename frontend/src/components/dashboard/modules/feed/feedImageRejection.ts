/**
 * Ľudský preklad dôvodu zamietnutia fotky.
 *
 * Backend ukladá `rejected_reason` ako voľný text v jednom jazyku a bez
 * diakritiky („Obrazok bol zamietnuty kvoli nevhodnemu obsahu."). Taký reťazec
 * sa nesmie zobraziť priamo – je technický a pre neslovenského používateľa
 * nezrozumiteľný. Mapujeme ho preto na lokalizovanú hlášku, rovnaký vzor ako
 * `translateReportError` / `translatePortfolioApiError`.
 *
 * Zhoda na presný reťazec je zámerne krehká smerom k BEZPEČNEJ strane: keď sa
 * text na backende zmení, spadne to na všeobecnú hlášku – nikdy nie na surový
 * technický text.
 */

type Translate = (key: string, fallback: string) => string;

const REASON_MESSAGES: Record<string, [string, string]> = {
  'Obrazok bol zamietnuty kvoli nevhodnemu obsahu.': [
    'feed.imageRejectedContent',
    'Táto fotka nespĺňa pravidlá obsahu.',
  ],
  'Neplatny alebo nepodporovany format obrazka.': [
    'feed.imageRejectedFormat',
    'Tento formát fotky sa nepodarilo spracovať.',
  ],
  'Neplatny typ suboru.': [
    'feed.imageRejectedFormat',
    'Tento formát fotky sa nepodarilo spracovať.',
  ],
  'Neplatny subor.': [
    'feed.imageRejectedFormat',
    'Tento formát fotky sa nepodarilo spracovať.',
  ],
};

export function translateImageRejection(
  t: Translate,
  reason?: string | null,
): string {
  const known = reason ? REASON_MESSAGES[reason.trim()] : undefined;
  if (known) return t(known[0], known[1]);
  return t('feed.imageRejectedGeneric', 'Túto fotku sa nepodarilo nahrať.');
}
