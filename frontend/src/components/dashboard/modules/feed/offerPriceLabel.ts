/**
 * Text ceny ponuky pre feed kartu aj zdieľací dialóg.
 *
 * Jedna implementácia zámerne: karta vo feede a náhľad v dialógu musia ukázať
 * to isté, inak používateľ pri zdieľaní vidí iný údaj než ten, čo o chvíľu
 * pristane vo feede.
 *
 * `price_negotiable` má prednosť pred sumou – ponuka bez pevnej ceny je
 * „Dohodou", nie prázdne miesto.
 */

type Translate = (key: string, fallback: string) => string;

export type OfferPriceFields = {
  price_negotiable?: boolean | null;
  price_from?: string | number | null;
  price_currency?: string | null;
};

export function formatOfferPriceLabel(
  t: Translate,
  locale: string | undefined,
  price: OfferPriceFields | null | undefined,
): string {
  if (!price) return '';
  if (price.price_negotiable) return t('skills.priceNegotiable', 'Dohodou');
  if (price.price_from === null || price.price_from === undefined) return '';

  const amount = Number(price.price_from);
  if (!Number.isFinite(amount)) return '';

  // Absolútny dátum/číslo sleduje jazyk appky, nie locale prehliadača.
  const formatted = amount.toLocaleString(locale || undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${price.price_currency || '€'}`;
}
