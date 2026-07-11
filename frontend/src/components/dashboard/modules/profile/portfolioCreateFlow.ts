import {
  PORTFOLIO_CATEGORY_OPTIONS,
  PORTFOLIO_DESCRIPTION_MAX_LENGTH,
  PORTFOLIO_TITLE_MAX_LENGTH,
  type PortfolioFormErrors,
  type PortfolioFormValues,
} from './portfolioFormUtils';

export const PORTFOLIO_CREATE_STEPS = ['title', 'category', 'description', 'photos'] as const;

export type PortfolioCreateStep = typeof PORTFOLIO_CREATE_STEPS[number];

export type PortfolioTranslator = (key: string, fallback?: string) => string;

export function portfolioCreateProgressText(
  t: PortfolioTranslator,
  current: number,
  total: number,
): string {
  return t('portfolio.createStepProgress', 'Step {current} of {total}')
    .replace('{current}', String(current))
    .replace('{total}', String(total));
}

export function hasPortfolioCreateDraft(
  values: PortfolioFormValues,
  photoFiles: File[],
): boolean {
  return Boolean(
    values.title.trim() ||
      values.category.trim() ||
      values.description.trim() ||
      photoFiles.length > 0,
  );
}

export function portfolioCreateTitleError(
  values: PortfolioFormValues,
  t: PortfolioTranslator,
): string | undefined {
  const title = values.title.trim();
  if (!title) return t('portfolio.titleRequired');
  if (title.length > PORTFOLIO_TITLE_MAX_LENGTH) return t('portfolio.titleTooLong');
  return undefined;
}

export function portfolioCreateCategoryError(
  values: PortfolioFormValues,
  t: PortfolioTranslator,
): string | undefined {
  const category = values.category.trim();
  if (!category) return t('portfolio.categoryRequired');
  if (!PORTFOLIO_CATEGORY_OPTIONS.includes(category as typeof PORTFOLIO_CATEGORY_OPTIONS[number])) {
    return t('portfolio.categoryRequired');
  }
  return undefined;
}

export function portfolioCreateDescriptionError(
  values: PortfolioFormValues,
  t: PortfolioTranslator,
): string | undefined {
  if (values.description.trim().length > PORTFOLIO_DESCRIPTION_MAX_LENGTH) {
    return t('portfolio.descriptionTooLong');
  }
  return undefined;
}

export function portfolioCreateErrorStep(errors: PortfolioFormErrors): PortfolioCreateStep {
  if (errors.title) return 'title';
  if (errors.category) return 'category';
  if (errors.description) return 'description';
  return 'photos';
}

export function portfolioCreateStepLabel(
  step: PortfolioCreateStep,
  t: PortfolioTranslator,
): string {
  if (step === 'title') return t('portfolio.titleLabel');
  if (step === 'category') return t('portfolio.categoryLabel');
  if (step === 'description') return t('portfolio.descriptionLabel');
  return t('portfolio.photosLabel');
}

export function requiredPortfolioLabel(label: string): string {
  return `${label} *`;
}
