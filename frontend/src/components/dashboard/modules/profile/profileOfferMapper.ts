import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import type { ExperienceUnit, Offer, OfferImage } from './profileOffersTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toExperience(value: unknown): Offer['experience'] {
  if (!isRecord(value)) return undefined;
  const rawValue = value.value;
  const parsedValue =
    typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue || 0));
  const unit = value.unit === 'years' || value.unit === 'months' ? value.unit : 'years';

  return {
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    unit: unit as ExperienceUnit,
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toImages(value: unknown): OfferImage[] {
  if (!Array.isArray(value)) return [];

  return value.map((raw) => {
    const image = isRecord(raw) ? raw : {};
    const imageUrl = image.image_url || image.image || null;
    return {
      id: Number(image.id) || 0,
      image_url: typeof imageUrl === 'string' ? imageUrl : null,
      order: typeof image.order === 'number' ? image.order : undefined,
      status: typeof image.status === 'string' ? image.status : null,
      rejected_reason:
        typeof image.rejected_reason === 'string' ? image.rejected_reason : null,
    };
  });
}

export function mapApiOfferToProfileOffer(raw: unknown): Offer {
  const s = isRecord(raw) ? raw : {};
  const rawCurrency = s.price_currency;
  const rawUrgency = toStringValue(s.urgency).trim();

  return {
    id: Number(s.id),
    category: toStringValue(s.category),
    subcategory: toStringValue(s.subcategory),
    description: toStringValue(s.description),
    detailed_description: toStringValue(s.detailed_description),
    images: toImages(s.images),
    price_from: toPrice(s.price_from),
    price_currency:
      typeof rawCurrency === 'string' && rawCurrency.trim() !== '' ? rawCurrency : '\u20ac',
    price_negotiable: s.price_negotiable === true,
    district: toStringValue(s.district),
    location: toStringValue(s.location),
    experience: toExperience(s.experience),
    tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
    opening_hours: (s.opening_hours || undefined) as OpeningHours | undefined,
    is_seeking: s.is_seeking === true,
    urgency: rawUrgency ? (rawUrgency as Offer['urgency']) : '',
    duration_type: (s.duration_type || null) as Offer['duration_type'],
    is_hidden: s.is_hidden === true,
    average_rating: toNullableNumber(s.average_rating),
    reviews_count: toNonNegativeNumber(s.reviews_count),
    likes_count: toNonNegativeNumber(s.likes_count),
    is_liked_by_me: s.is_liked_by_me === true,
    already_reviewed:
      typeof s.already_reviewed === 'boolean' ? s.already_reviewed : undefined,
    my_request_status: toOptionalString(s.my_request_status),
    user_display_name: toOptionalString(s.user_display_name),
    user_id: toNullableNumber(s.user_id) ?? undefined,
    owner_user_type: toOptionalString(s.owner_user_type) ?? null,
    owner_slug: toOptionalString(s.owner_slug) ?? null,
    owner_avatar_url: toOptionalString(s.owner_avatar_url) ?? null,
  };
}

export function mergeProfileOffer(current: Offer, next: Offer): Offer {
  return {
    ...current,
    ...next,
    already_reviewed: next.already_reviewed ?? current.already_reviewed,
    my_request_status: next.my_request_status ?? current.my_request_status,
  };
}
