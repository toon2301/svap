import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { skillsCategories } from '@/constants/skillsCategories';
import { validateOfferWatchDraft } from '../offerWatchDraft';
import type { OfferWatchDraft } from '../types';
import OfferWatchForm from './OfferWatchForm';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk', setCountry: jest.fn(), t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;

function renderForm(mobile: boolean, overrides: Partial<OfferWatchDraft> = {}) {
  const onSubmit = jest.fn();
  function Form() {
    const [draft, setDraft] = useState<OfferWatchDraft>({
      category: CATEGORY, subcategory: SUBCATEGORIES[0]!, isSeeking: false,
      countryCode: 'SK', districtCode: '', priceMin: '', priceMax: '', priceCurrency: '',
      ...overrides,
    });
    return (
      <OfferWatchForm
        idPrefix='zero-watch' draft={draft} errors={{}} onChange={setDraft}
        onSubmit={() => onSubmit(validateOfferWatchDraft(draft))}
        submitLabel='Uložiť' submittingLabel='Ukladám' isSubmitting={false}
        onOpenMobilePicker={mobile ? jest.fn() : undefined}
      />
    );
  }
  render(<Form />);
  return onSubmit;
}

describe.each([false, true])('shared price controls (mobile=%s)', (mobile) => {
  it.each(['Cena od', 'Cena do'])('clears a standalone zero only on blur of %s', (label) => {
    renderForm(mobile);
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: '0,00' } });
    expect(input).toHaveValue('0,00');
    fireEvent.blur(input);
    expect(input).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveValue('');
  });

  it.each(['0,50', '0.50'])('allows typing %s and preserves a manually chosen currency', async (price) => {
    const user = userEvent.setup();
    renderForm(mobile, { priceMin: '1', priceCurrency: '$' });
    const input = screen.getByLabelText('Cena od');
    await user.click(input);
    (input as HTMLInputElement).setSelectionRange(0, 1);
    await user.keyboard(price);
    expect(input).toHaveValue(price);
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveValue('$');
    fireEvent.blur(input);
    expect(input).toHaveValue(price);
  });

  it('keeps currency enabled when the opposite bound remains positive', () => {
    renderForm(mobile, { priceMin: '0', priceMax: '100', priceCurrency: 'Ft' });
    fireEvent.blur(screen.getByLabelText('Cena od'));
    expect(screen.getByLabelText('Cena od')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveValue('Ft');
  });

  it('normalizes zero on submit even without a blur event', () => {
    const onSubmit = renderForm(mobile);
    fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Cena do'), { target: { value: '0' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Uložiť' }).closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith({
      ok: true,
      input: expect.objectContaining({ priceMin: '100', priceMax: null, priceCurrency: '€' }),
    });
  });

  it('does not discard malformed text on blur', () => {
    renderForm(mobile);
    fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: '0.000' } });
    fireEvent.blur(screen.getByLabelText('Cena od'));
    expect(screen.getByLabelText('Cena od')).toHaveValue('0.000');
  });

  it('clears only errors belonging to normalized fields, not the invalid opposite bound', () => {
    const onChange = jest.fn();
    render(<OfferWatchForm
      idPrefix='zero-errors'
      draft={{ category: '', subcategory: '', isSeeking: false, countryCode: 'SK',
        districtCode: '', priceMin: '-1', priceMax: '0', priceCurrency: '€' }}
      errors={{ priceMin: 'invalid_price' }} onChange={onChange} onSubmit={jest.fn()}
      submitLabel='Uložiť' submittingLabel='Ukladám' isSubmitting={false}
      onOpenMobilePicker={mobile ? jest.fn() : undefined}
    />);
    fireEvent.blur(screen.getByLabelText('Cena do'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: '-1', priceMax: '', priceCurrency: '€' }),
      ['priceMax'],
    );
    expect(screen.getByLabelText('Cena od')).toHaveAttribute('aria-invalid', 'true');
  });
});
