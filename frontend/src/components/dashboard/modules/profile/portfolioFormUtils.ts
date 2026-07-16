import type { PortfolioItemPayload } from './portfolioApi';

export const PORTFOLIO_TITLE_MAX_LENGTH = 120;
// Musí sedieť s backendom: PortfolioItem.description max_length=500.
export const PORTFOLIO_DESCRIPTION_MAX_LENGTH = 500;
// Musí sedieť s backendom: portfolio.views.MAX_PORTFOLIO_ITEMS. Backend je zdroj
// pravdy (enforce pod zámkom); toto je len preventívny UX guard na FE.
export const PORTFOLIO_ITEMS_MAX_COUNT = 15;
export const PORTFOLIO_IMAGE_MAX_COUNT = 8;
export const PORTFOLIO_IMAGE_MAX_SIZE_MB = 5;
export const PORTFOLIO_IMAGE_MAX_BYTES = PORTFOLIO_IMAGE_MAX_SIZE_MB * 1024 * 1024;
export const PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
] as const;
export const PORTFOLIO_IMAGE_ACCEPT = PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

export const PORTFOLIO_CATEGORY_OPTIONS = [
  'it-a-technologie',
  'remesla-a-vyroba',
  'domacnost-a-sluzby',
  'krasa-a-zdravie',
  'hudba-a-vystupenia',
  'marketing-a-obchod',
  'doprava-a-logistika',
  'zvierata-a-priroda',
  'dobrovolnictvo-a-komunita',
  'zabava-a-hry',
  'cestovanie-a-zazitky',
  'food-a-gastronomia',
  'osobny-rozvoj-a-mentoring',
  'financne-a-pravne-poradenstvo',
  'fotografia-a-videografia',
  'eventy-a-organizacia-podujati',
  'jazykove-sluzby-a-preklady',
  'e-commerce-a-online-predaj',
  'domaca-vyuka-a-tutoring',
  'technicka-podpora-a-servis',
  'psychologia-a-poradenstvo',
  'reklama-a-pr',
  'kutilstvo-a-diy-projekty',
  'modelarstvo-a-hobby-tvorba',
  'zdravotna-starostlivost-a-first-aid',
  'ekologia-a-udrzatelny-zivot',
  'socialne-siete-a-digitalny-obsah',
  'other',
] as const;

export type PortfolioFormValues = {
  title: string;
  category: string;
  description: string;
};

export type PortfolioFormField = keyof PortfolioFormValues;

export type PortfolioFormErrors = Partial<Record<PortfolioFormField, string>>;

type Translator = (key: string, fallback?: string) => string;

export function emptyPortfolioFormValues(): PortfolioFormValues {
  return {
    title: '',
    category: '',
    description: '',
  };
}

export function normalizePortfolioFormValues(values: PortfolioFormValues): PortfolioFormValues {
  return {
    title: values.title.trim(),
    category: values.category.trim(),
    description: values.description.trim(),
  };
}

export function validatePortfolioFormValues(
  values: PortfolioFormValues,
  t: Translator,
): PortfolioFormErrors {
  const normalized = normalizePortfolioFormValues(values);
  const errors: PortfolioFormErrors = {};

  if (!normalized.title) {
    errors.title = t('portfolio.titleRequired');
  } else if (normalized.title.length > PORTFOLIO_TITLE_MAX_LENGTH) {
    errors.title = t('portfolio.titleTooLong');
  }

  if (!normalized.category) {
    errors.category = t('portfolio.categoryRequired');
  } else if (!PORTFOLIO_CATEGORY_OPTIONS.includes(normalized.category as typeof PORTFOLIO_CATEGORY_OPTIONS[number])) {
    errors.category = t('portfolio.categoryRequired');
  }

  if (normalized.description.length > PORTFOLIO_DESCRIPTION_MAX_LENGTH) {
    errors.description = t('portfolio.descriptionTooLong');
  }

  return errors;
}

export function portfolioPayloadFromValues(values: PortfolioFormValues): PortfolioItemPayload {
  const normalized = normalizePortfolioFormValues(values);
  return {
    title: normalized.title,
    category: normalized.category,
    description: normalized.description,
  };
}

export function portfolioPhotosRemainingText(t: Translator, count: number): string {
  const template =
    count === 1
      ? t('portfolio.photosRemaining_one')
      : t('portfolio.photosRemaining_other');
  return template.replace('{count}', String(count));
}

/** Súhrnná success hláška po nahratí dávky fotiek (pluralizácia podľa počtu). */
export function portfolioPhotoUploadSuccessText(t: Translator, count: number): string {
  return count === 1
    ? t('portfolio.photoUploadSuccess_one')
    : t('portfolio.photoUploadSuccess_other');
}

function firstErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim());
    return typeof first === 'string' ? first.trim() : null;
  }
  return null;
}

export function portfolioFormErrorsFromApi(error: unknown): PortfolioFormErrors {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data || typeof data !== 'object') return {};

  const errors: PortfolioFormErrors = {};
  const title = firstErrorMessage(data.title);
  const category = firstErrorMessage(data.category);
  const description = firstErrorMessage(data.description);

  if (title) errors.title = title;
  if (category) errors.category = category;
  if (description) errors.description = description;
  return errors;
}

export function portfolioErrorMessageFromApi(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const message =
    firstErrorMessage(data?.detail) ||
    firstErrorMessage(data?.error) ||
    firstErrorMessage(data?.non_field_errors);
  return message || fallback;
}
