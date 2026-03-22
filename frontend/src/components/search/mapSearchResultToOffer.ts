import type { Offer, ExperienceUnit } from '@/components/dashboard/modules/profile/profileOffersTypes';
import type { OpeningHours } from '@/components/dashboard/modules/skills/skillDescriptionModal/types';

export function mapSearchResultToOffer(s: Record<string, unknown>): Offer {
  const rawPrice = s.price_from;
  const parsedPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string' && String(rawPrice).trim() !== ''
        ? parseFloat(String(rawPrice))
        : null;

  const exp = s.experience as { value?: number; unit?: string } | undefined;
  const experience = exp
    ? {
        value: typeof exp.value === 'number' ? exp.value : parseFloat(String(exp.value || 0)),
        unit: (exp.unit === 'years' || exp.unit === 'months' ? exp.unit : 'years') as ExperienceUnit,
      }
    : undefined;

  const imagesRaw = Array.isArray(s.images) ? s.images : [];
  const images = imagesRaw.map((im: Record<string, unknown>) => ({
    id: Number(im.id) || 0,
    image_url: (im.image_url || im.image || null) as string | null,
    order: im.order as number | undefined,
  }));

  const base: Offer = {
    id: Number(s.id),
    category: String(s.category || ''),
    subcategory: String(s.subcategory || ''),
    description: String(s.description || ''),
    detailed_description: String(s.detailed_description || ''),
    images,
    price_from: parsedPrice,
    price_currency:
      typeof s.price_currency === 'string' && s.price_currency.trim() !== '' ? s.price_currency : '€',
    district: typeof s.district === 'string' ? s.district : '',
    location: typeof s.location === 'string' ? s.location : '',
    experience,
    tags: Array.isArray(s.tags) ? s.tags : [],
    opening_hours: (s.opening_hours || undefined) as OpeningHours | undefined,
    is_seeking: s.is_seeking === true,
    urgency:
      typeof s.urgency === 'string' && s.urgency.trim() !== ''
        ? (s.urgency.trim() as 'low' | 'medium' | 'high' | '')
        : '',
    duration_type: (s.duration_type || null) as Offer['duration_type'],
    is_hidden: s.is_hidden === true,
    average_rating: s.average_rating as number | null | undefined,
    reviews_count: typeof s.reviews_count === 'number' ? s.reviews_count : 0,
  };
  return {
    ...base,
    user_display_name: typeof s.user_display_name === 'string' ? s.user_display_name : '',
    owner_user_type: typeof s.owner_user_type === 'string' ? s.owner_user_type : 'individual',
    user_id: typeof s.user_id === 'number' ? s.user_id : undefined,
    owner_slug: typeof s.owner_slug === 'string' && s.owner_slug.trim() ? s.owner_slug : undefined,
    owner_avatar_url: typeof s.owner_avatar_url === 'string' && s.owner_avatar_url.trim() ? s.owner_avatar_url : undefined,
  } as Offer & { user_display_name?: string; owner_user_type?: string; user_id?: number; owner_slug?: string; owner_avatar_url?: string };
}

