import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';
import { AddReviewModalMobile } from '../AddReviewModalMobile';

/** Skutočné jazykové súbory aplikácie: zástupný `t` z nich číta preklady vo vybranom jazyku. */
const mockCatalogs: Record<string, unknown> = { sk, cs, en, pl, de, hu };
let mockLocale = 'sk';

/** Preklad podľa bodkovej cesty v súbore aktuálneho jazyka; ak kľúč chýba, vráti záložný text z kódu. */
const mockTranslate = (key: string, fallback?: string): string => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      mockCatalogs[mockLocale],
    );
  return typeof value === 'string' ? value : (fallback ?? key);
};

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({ locale: mockLocale, searchCountry: 'SK', t: mockTranslate }),
}));

/**
 * Tlačidlá na pridanie plusu a mínusu v mobilnom formulári recenzie v každom z šiestich jazykov (nález 327): názov
 * tlačidla je v jazyku rozhrania (kľúče `reviews.addPro` a `reviews.addCon`) a tlačidlo funguje.
 */
const LOCALES = ['sk', 'cs', 'en', 'pl', 'de', 'hu'] as const;

const catalogText = (locale: string, key: 'addPro' | 'addCon'): string =>
  (mockCatalogs[locale] as { reviews: Record<'addPro' | 'addCon', string> }).reviews[key];

describe.each(LOCALES)('AddReviewModalMobile: tlačidlá plus a mínus, jazyk %s (nález 327)', (locale) => {
  beforeEach(() => {
    mockLocale = locale;
  });

  afterEach(() => {
    mockLocale = 'sk';
  });

  it('názov tlačidla plus a mínus je v jazyku rozhrania a tlačidlo pridá napísaný text', () => {
    render(<AddReviewModalMobile open onClose={jest.fn()} reviewerName="Peter Novák" onSubmit={jest.fn()} />);

    const addPro = screen.getByRole('button', { name: catalogText(locale, 'addPro') });
    const addCon = screen.getByRole('button', { name: catalogText(locale, 'addCon') });
    expect(addPro).toBeDisabled();
    expect(addCon).toBeDisabled();

    const placeholderOf = (key: 'prosPlaceholder' | 'consPlaceholder') =>
      (mockCatalogs[locale] as { reviews: Record<string, string> }).reviews[key];
    fireEvent.change(screen.getByPlaceholderText(placeholderOf('prosPlaceholder')), { target: { value: 'Plus v jazyku' } });
    fireEvent.click(addPro);
    expect(screen.getByText('Plus v jazyku')).toBeInTheDocument();

    if (locale !== 'sk') {
      expect(catalogText(locale, 'addPro')).not.toBe(catalogText('sk', 'addPro'));
      expect(catalogText(locale, 'addCon')).not.toBe(catalogText('sk', 'addCon'));
    }
  });
});
