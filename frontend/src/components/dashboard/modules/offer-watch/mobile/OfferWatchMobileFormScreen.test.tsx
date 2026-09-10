import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
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

const SUBCATEGORY = Object.values(skillsCategories)[0]![0]!;

describe('OfferWatchMobileFormScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a toast and keeps the form usable for a price with three decimals', () => {
    const onSave = jest.fn();
    render(
      <OfferWatchMobileFormScreen
        mode='create'
        isSubmitting={false}
        onBack={jest.fn()}
        onSave={onSave}
        onSaved={jest.fn()}
        onUnavailable={jest.fn()}
      />,
    );

    const category = screen.getByRole('combobox', { name: 'Podkategória' });
    fireEvent.focus(category);
    fireEvent.change(category, { target: { value: SUBCATEGORY } });
    fireEvent.click(screen.getByText(SUBCATEGORY, { selector: 'span' }).closest('button')!);

    const currency = screen.getByRole('combobox', { name: 'Mena' });
    expect(currency).toBeDisabled();
    const price = screen.getByPlaceholderText('Cena od');
    fireEvent.change(price, { target: { value: '10.565' } });
    expect(currency).toBeEnabled();
    expect(currency).toHaveValue('€');
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť sledovanie' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(toast.error).toHaveBeenCalledWith('Skontroluj označené údaje a skús to znova.');

    fireEvent.change(price, { target: { value: '10.56' } });
    expect(price).not.toHaveAttribute('aria-invalid');
  });
});
