import type { Offer } from './profileOffersTypes';
import { slugifyLabel } from './profileOffersTypes';

type Translate = (key: string, defaultValue: string) => string;

export function getOfferShareTitle(offer: Offer, t: Translate): string {
  const description = offer.description?.trim();
  if (description) return description;

  const catSlug = offer.category ? slugifyLabel(offer.category) : '';
  const subSlug = offer.subcategory ? slugifyLabel(offer.subcategory) : '';
  if (offer.subcategory && catSlug && subSlug) {
    return t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, offer.subcategory);
  }
  if (offer.category && catSlug) {
    return t(`skillsCatalog.categories.${catSlug}`, offer.category);
  }
  return offer.subcategory || offer.category || t('skills.noDescription', 'Bez popisu');
}

export function getOfferShareLocation(offer: Offer): string | null {
  return offer.location?.trim() || offer.district?.trim() || null;
}

export function getOfferShareImageUrl(offer: Offer): string | null {
  const image = offer.images?.find((item) => item?.image_url || item?.image);
  return image?.image_url || image?.image || null;
}
