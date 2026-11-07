/**
 * Náhrada za fotku, ktorej načítanie zlyhalo (nález 279): ikona a krátky text, v malých dlaždiciach len ikona.
 *
 * Predtým to bol prázdny obdĺžnik, ktorý v tmavom režime vyzeral ako veľká čierna plocha bez vysvetlenia.
 */

import { render, renderHook, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import cs from '../../../../../messages/cs.json';
import de from '../../../../../messages/de.json';
import en from '../../../../../messages/en.json';
import hu from '../../../../../messages/hu.json';
import pl from '../../../../../messages/pl.json';
import sk from '../../../../../messages/sk.json';
import ImageLoadFailed, { useImageLoadFailedLabel } from './ImageLoadFailed';

const LABEL = 'Fotku sa nepodarilo načítať';

/** Preklad, ktorý si test môže podmeniť; predvolene vráti záložný text, ako to robia ostatné testy. */
let mockTranslate: (key: string, fallback?: string) => string = (_key, fallback) => fallback ?? '';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => mockTranslate(key, fallback) }),
}));

beforeEach(() => {
  mockTranslate = (_key, fallback) => fallback ?? '';
});

describe('ImageLoadFailed', () => {
  it('predvolený variant ukáže ikonu aj text a ten je aj pre čítačky obrazovky', () => {
    const { container } = render(<ImageLoadFailed />);

    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: LABEL })).toBe(screen.getByTestId('image-load-failed'));
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('kompaktný variant (malá dlaždica) ukáže len ikonu, text nesie `aria-label`', () => {
    const { container } = render(<ImageLoadFailed variant="compact" />);

    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: LABEL })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('variant na tmavom podklade má svetlé farby a žiadne farby svetlého režimu', () => {
    render(<ImageLoadFailed variant="onDark" />);
    const box = screen.getByTestId('image-load-failed');

    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(box).toHaveClass('text-white/70', 'bg-white/5');
    expect(box.className).not.toMatch(/bg-gray-100|text-gray-|dark:/);
  });

  it('predvolený variant má v svetlom aj tmavom režime vlastné farby', () => {
    render(<ImageLoadFailed />);

    expect(screen.getByTestId('image-load-failed')).toHaveClass(
      'bg-gray-100',
      'text-gray-600',
      'dark:bg-[#0e0e0f]',
      'dark:text-gray-400',
    );
  });

  it('`testId` a `className` sa prenesú na obal', () => {
    render(<ImageLoadFailed testId="vlastny-obal" className="rounded-2xl" />);

    expect(screen.getByTestId('vlastny-obal')).toHaveClass('rounded-2xl');
    expect(screen.queryByTestId('image-load-failed')).not.toBeInTheDocument();
  });

  it('text berie z prekladu `common.imageLoadFailed`', () => {
    mockTranslate = (key) => (key === 'common.imageLoadFailed' ? 'Preklad z kľúča' : `iný kľúč: ${key}`);

    render(<ImageLoadFailed />);

    expect(screen.getByText('Preklad z kľúča')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Preklad z kľúča' })).toBeInTheDocument();
  });

  it('hook `useImageLoadFailedLabel` vráti ten istý text z kľúča `common.imageLoadFailed`', () => {
    mockTranslate = (key) => (key === 'common.imageLoadFailed' ? 'Preklad z kľúča' : `iný kľúč: ${key}`);

    const { result } = renderHook(() => useImageLoadFailedLabel());

    expect(result.current).toBe('Preklad z kľúča');
  });

  it('hook bez prekladu vráti záložný slovenský text', () => {
    const { result } = renderHook(() => useImageLoadFailedLabel());

    expect(result.current).toBe(LABEL);
  });

  it('záložný text v kóde sa zhoduje so slovenským prekladom a kľúč má všetkých šesť jazykov', () => {
    expect(sk.common.imageLoadFailed).toBe(LABEL);
    [sk, cs, en, pl, de, hu].forEach((messages) => {
      expect(typeof messages.common.imageLoadFailed).toBe('string');
      expect(messages.common.imageLoadFailed.trim()).not.toBe('');
    });
  });
});
