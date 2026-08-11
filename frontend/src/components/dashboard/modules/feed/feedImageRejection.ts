/**
 * Ľudský preklad dôvodu zamietnutia fotky.
 *
 * Backend ukladá `rejected_reason` ako voľný text v jednom jazyku a bez
 * diakritiky („Obrazok bol zamietnuty kvoli nevhodnemu obsahu."). Taký reťazec
 * sa nesmie zobraziť priamo – je technický a pre neslovenského používateľa
 * nezrozumiteľný. Mapujeme ho preto na lokalizovanú hlášku, rovnaký vzor ako
 * `translateReportError` / `translatePortfolioApiError`.
 *
 * Mapa je primárne kľúčovaná STABILNÝMI KÓDMI – to je cieľový tvar, keby BE
 * niekedy dostal pole `rejected_code`. Súčasné texty z backendu sú vedené ako
 * aliasy na tie isté kódy, takže prechod bude znamenať len zmazanie aliasov.
 *
 * Zhoda je zámerne krehká smerom k BEZPEČNEJ strane: neznámy vstup padne na
 * všeobecnú hlášku – nikdy nie na surový technický text.
 */

type Translate = (key: string, fallback: string) => string;

type RejectionMessage = { key: string; fallback: string };

const CONTENT: RejectionMessage = {
  key: 'feed.imageRejectedContent',
  fallback: 'Táto fotka nespĺňa pravidlá obsahu.',
};
const FORMAT: RejectionMessage = {
  key: 'feed.imageRejectedFormat',
  fallback: 'Tento formát fotky sa nepodarilo spracovať.',
};
const PROCESSING: RejectionMessage = {
  key: 'feed.imageRejectedProcessing',
  fallback: 'Spracovanie tejto fotky sa nepodarilo dokončiť.',
};

/**
 * `Object.create(null)` – bez prototypu, takže `constructor`, `toString` či
 * `__proto__` z backendu nemôžu prejsť ako „známy" kľúč.
 */
const REASON_MESSAGES: Record<string, RejectionMessage> = Object.assign(
  Object.create(null) as Record<string, RejectionMessage>,
  {
    // --- stabilné kódy (cieľový tvar) ---
    image_rejected_content: CONTENT,
    image_rejected_format: FORMAT,
    image_rejected_processing: PROCESSING,

    // --- aliasy na súčasné texty z backendu ---
    'Obrazok bol zamietnuty kvoli nevhodnemu obsahu.': CONTENT,
    'Neplatny alebo nepodporovany format obrazka.': FORMAT,
    'Neplatny typ suboru.': FORMAT,
    'Neplatny subor.': FORMAT,
    'Spracovanie obrazka zlyhalo.': PROCESSING,
    'Spracovanie fotky sa nepodarilo spustit. Skus fotku nahrat znova.': PROCESSING,
    'Overenie obrazka zlyhalo.': PROCESSING,
    'Upload sa nedokoncil.': PROCESSING,
    'Upload nebol najdeny.': PROCESSING,
  },
);

export function translateImageRejection(
  t: Translate,
  reason?: string | null,
): string {
  const known = reason ? REASON_MESSAGES[reason.trim()] : undefined;
  if (known) return t(known.key, known.fallback);
  return t('feed.imageRejectedGeneric', 'Túto fotku sa nepodarilo nahrať.');
}
