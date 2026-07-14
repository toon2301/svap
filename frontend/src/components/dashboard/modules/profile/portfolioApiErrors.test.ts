import {
  portfolioItemsLimitMessage,
  translatePortfolioApiError,
  translatePortfolioFormErrors,
} from './portfolioApiErrors';

const TRANSLATIONS: Record<string, string> = {
  'portfolio.itemsLimitReached': 'Dosiahol si maximálny počet položiek portfólia ({max}).',
  'portfolio.maxPhotosLimit': 'Môžeš pridať maximálne 8 fotiek',
  'portfolio.itemNotFound': 'Položka portfólia nebola nájdená.',
  'portfolio.htmlNotAllowed': 'HTML nie je povolené.',
  'portfolio.invalidCategory': 'Neplatná kategória portfólia.',
  'portfolio.titleRequired': 'Názov je povinný',
};

// t() vracia kľúč, keď preklad chýba – rovnaké správanie ako LanguageContext.
const t = (key: string, fallback?: string) => TRANSLATIONS[key] ?? fallback ?? key;

function apiError(data: unknown) {
  return { response: { data } };
}

describe('portfolioApiErrors', () => {
  it('translates a known top-level code and fills the {max} placeholder', () => {
    const message = translatePortfolioApiError(
      t,
      apiError({ error: 'Dosiahol si maximalny pocet poloziek portfolia (15).', code: 'portfolio_items_limit_reached' }),
      'fallback',
    );
    expect(message).toBe('Dosiahol si maximálny počet položiek portfólia (15).');
  });

  it('falls back to the backend error text for an unknown code', () => {
    const message = translatePortfolioApiError(
      t,
      apiError({ error: 'Backend only message', code: 'some_future_code' }),
      'fallback',
    );
    expect(message).toBe('Backend only message');
  });

  it('falls back to the provided fallback when there is no usable payload', () => {
    expect(translatePortfolioApiError(t, new Error('boom'), 'fallback')).toBe('fallback');
  });

  it('translates field errors via the codes map and keeps raw text without codes', () => {
    const errors = translatePortfolioFormErrors(
      t,
      apiError({
        title: ['HTML nie je povolene.'],
        category: ['Neplatna kategoria portfolia.'],
        description: ['Nejaka nova BE hlaska.'],
        codes: {
          title: ['html_not_allowed'],
          category: ['invalid_category'],
          description: ['some_unknown_code'],
        },
      }),
    );
    expect(errors.title).toBe('HTML nie je povolené.');
    expect(errors.category).toBe('Neplatná kategória portfólia.');
    // Neznámy kód -> pôvodný BE text (spätná kompatibilita).
    expect(errors.description).toBe('Nejaka nova BE hlaska.');
  });

  it('keeps raw field errors when the response has no codes map', () => {
    const errors = translatePortfolioFormErrors(
      t,
      apiError({ title: ['Toto pole je povinne.'] }),
    );
    expect(errors.title).toBe('Toto pole je povinne.');
  });

  it('builds the items limit hint with the FE constant', () => {
    expect(portfolioItemsLimitMessage(t)).toBe(
      'Dosiahol si maximálny počet položiek portfólia (15).',
    );
  });
});
