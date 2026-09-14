import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
import type { OfferWatch } from '../types';
import OfferWatchMobileFormScreen from './OfferWatchMobileFormScreen';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    country: 'SK',
    locale: 'sk',
    setCountry: jest.fn(),
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;
const SUBCATEGORY = SUBCATEGORIES[0]!;

function editableWatch(): OfferWatch {
  return {
    id: 7,
    category: CATEGORY,
    subcategory: SUBCATEGORY,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: 'bratislava-i',
    districtLabel: 'Bratislava I',
    priceMin: '10',
    priceMax: '80',
    priceCurrency: '€',
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-14T08:00:00Z',
  };
}

describe('OfferWatchMobileFormScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a toast and keeps the form usable for a price with three decimals', () => {
    const onSave = jest.fn();
    const onBack = jest.fn();
    const onOpenPicker = jest.fn();
    const props = {
      mode: 'create' as const,
      isSubmitting: false,
      onBack,
      onSave,
      onSaved: jest.fn(),
      onUnavailable: jest.fn(),
      onOpenPicker,
      viewportBounds: null,
    };
    const { rerender } = render(
      <OfferWatchMobileFormScreen {...props} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Podkategória:/ }));
    expect(onOpenPicker).toHaveBeenCalledWith('category');

    rerender(<OfferWatchMobileFormScreen {...props} picker='category' />);
    fireEvent.change(screen.getByRole('searchbox', {
      name: 'Začni písať názov podkategórie',
    }), { target: { value: SUBCATEGORY } });
    fireEvent.click(screen.getByText(SUBCATEGORY, { selector: 'span' }).closest('button')!);
    expect(onBack).toHaveBeenCalledTimes(1);
    rerender(<OfferWatchMobileFormScreen {...props} />);

    const currency = screen.getByRole('combobox', { name: 'Mena' });
    expect(currency.tagName).toBe('INPUT');
    expect(currency).toHaveAttribute('readonly');
    expect(currency).toBeDisabled();
    const price = screen.getByPlaceholderText('Cena od');
    fireEvent.change(price, { target: { value: '10.565' } });
    expect(currency).toBeEnabled();
    expect(currency).toHaveValue('€');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(toast.error).toHaveBeenCalledWith('Skontroluj označené údaje a skús to znova.');

    fireEvent.change(price, { target: { value: '10.56' } });
    expect(price).not.toHaveAttribute('aria-invalid');
  });

  it('selects country and district on separate screens without losing the form draft', () => {
    const onBack = jest.fn();
    const onOpenPicker = jest.fn();
    const props = {
      mode: 'create' as const,
      isSubmitting: false,
      onBack,
      onSave: jest.fn(),
      onSaved: jest.fn(),
      onUnavailable: jest.fn(),
      onOpenPicker,
      viewportBounds: null,
    };
    const { rerender } = render(<OfferWatchMobileFormScreen {...props} />);

    fireEvent.change(screen.getByPlaceholderText('Cena od'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /^Krajina:/ }));
    expect(onOpenPicker).toHaveBeenLastCalledWith('country');

    rerender(<OfferWatchMobileFormScreen {...props} picker='country' />);
    const czechia = new Intl.DisplayNames(['sk'], { type: 'region' }).of('CZ') || 'Česko';
    fireEvent.change(screen.getByRole('searchbox', { name: 'Vyhľadaj krajinu' }), {
      target: { value: czechia },
    });
    fireEvent.click(screen.getByText(czechia, { selector: 'span' }).closest('button')!);
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<OfferWatchMobileFormScreen {...props} />);
    expect(screen.getByRole('button', { name: /^Krajina:/ })).toHaveTextContent(czechia);
    expect(screen.getByPlaceholderText('Cena od')).toHaveValue('25');

    onBack.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^Okres \(voliteľný\):/ }));
    expect(onOpenPicker).toHaveBeenLastCalledWith('district');

    rerender(<OfferWatchMobileFormScreen {...props} picker='district' />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Vyhľadaj okres' }), {
      target: { value: 'Benešov' },
    });
    fireEvent.click(screen.getByRole('option', { name: 'Benešov' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<OfferWatchMobileFormScreen {...props} />);
    expect(screen.getByRole('button', { name: /^Okres \(voliteľný\):/ })).toHaveTextContent('Benešov');
    expect(screen.getByPlaceholderText('Cena od')).toHaveValue('25');
  });

  it('returns from a picker without changing or clearing an unfinished draft', () => {
    const onBack = jest.fn();
    const props = {
      mode: 'create' as const,
      isSubmitting: false,
      onBack,
      onSave: jest.fn(),
      onSaved: jest.fn(),
      onUnavailable: jest.fn(),
      onOpenPicker: jest.fn(),
      viewportBounds: null,
    };
    const { rerender } = render(<OfferWatchMobileFormScreen {...props} />);

    fireEvent.change(screen.getByPlaceholderText('Cena do'), { target: { value: '90,50' } });
    rerender(<OfferWatchMobileFormScreen {...props} picker='country' />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Poľsko' } });
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    rerender(<OfferWatchMobileFormScreen {...props} />);
    expect(screen.getByPlaceholderText('Cena do')).toHaveValue('90,50');
    expect(screen.getByRole('button', { name: /^Krajina:/ })).toHaveTextContent('Slovensko');
  });

  it('preserves unfinished edit-mode changes when a nested picker is cancelled', () => {
    const onBack = jest.fn();
    const onOpenPicker = jest.fn();
    const props = {
      mode: 'edit' as const,
      watch: editableWatch(),
      isSubmitting: false,
      onBack,
      onSave: jest.fn(),
      onSaved: jest.fn(),
      onUnavailable: jest.fn(),
      onOpenPicker,
      viewportBounds: null,
    };
    const { rerender } = render(<OfferWatchMobileFormScreen {...props} />);

    fireEvent.change(screen.getByPlaceholderText('Cena od'), { target: { value: '44' } });
    fireEvent.click(screen.getByRole('button', { name: /^Okres \(voliteľný\):/ }));
    expect(onOpenPicker).toHaveBeenCalledWith('district');

    rerender(<OfferWatchMobileFormScreen {...props} picker='district' />);
    expect(screen.getByRole('option', { name: 'Bratislava I' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    rerender(<OfferWatchMobileFormScreen {...props} />);
    expect(screen.getByPlaceholderText('Cena od')).toHaveValue('44');
    expect(screen.getByRole('button', { name: /^Okres \(voliteľný\):/ })).toHaveTextContent(
      'Bratislava I',
    );
  });
});
