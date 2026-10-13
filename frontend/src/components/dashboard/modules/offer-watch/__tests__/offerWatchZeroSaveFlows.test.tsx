import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import type { OfferWatch } from '../types';
import { useOfferWatches } from '../useOfferWatches';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import OfferWatchSettingsDesktop from '../settings/OfferWatchSettingsDesktop';
import OfferWatchEditDialog from '../settings/OfferWatchEditDialog';
import OfferWatchMobileFormScreen from '../mobile/OfferWatchMobileFormScreen';

jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('react-hot-toast', () => ({
  __esModule: true, default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk', country: 'SK', setCountry: jest.fn(),
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;
const SUBCATEGORY = SUBCATEGORIES[0]!;

/** Supply a saved priced watch that can also represent a legacy zero-valued fixture. */
function watch(overrides: Partial<OfferWatch> = {}): OfferWatch {
  return {
    id: 7, category: CATEGORY, subcategory: SUBCATEGORY, isSeeking: false,
    countryCode: 'SK', districtCode: '', districtLabel: '', priceMin: '10.00',
    priceMax: '100.00', priceCurrency: '€',
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

/** Mock successful persistence so the real desktop/mobile forms can be tested in isolation. */
function hook(): UseOfferWatchesResult {
  return {
    watches: [watch()], isLoading: false, mutation: null, error: null,
    createWatch: jest.fn().mockResolvedValue({ ok: true, value: watch() }),
    updateWatch: jest.fn().mockResolvedValue({ ok: true, value: watch() }),
    deleteWatch: jest.fn(), clearError: jest.fn(), reload: jest.fn(),
  };
}

/** Update both controlled price inputs without introducing an implicit blur event. */
function fillPrices(min: string, max: string) {
  fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: min } });
  fireEvent.change(screen.getByLabelText('Cena do'), { target: { value: max } });
}

describe('zero bounds through all save flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
  });
  afterEach(() => window.localStorage.clear());

  it('desktop create saves an unpriced watch and resets the controls', async () => {
    const state = hook();
    jest.mocked(useOfferWatches).mockReturnValue(state);
    render(<OfferWatchSettingsDesktop />);
    const category = screen.getByRole('combobox', { name: 'Podkategória' });
    fireEvent.focus(category);
    fireEvent.change(category, { target: { value: SUBCATEGORY } });
    fireEvent.click(screen.getByText(SUBCATEGORY, { selector: 'span' }).closest('button')!);
    fillPrices('0', '0,00');
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť sledovanie' }));
    await waitFor(() => expect(state.createWatch).toHaveBeenCalledWith(expect.objectContaining({
      priceMin: null, priceMax: null, priceCurrency: '',
    })));
    await waitFor(() => expect(screen.getByLabelText('Cena od')).toHaveValue(''));
    expect(screen.getByRole('combobox', { name: 'Mena' })).toBeDisabled();
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('desktop edit saves a zero maximum as an absent upper bound', async () => {
    const onSave = jest.fn().mockResolvedValue({ ok: true, value: watch() });
    const onClose = jest.fn();
    render(<OfferWatchEditDialog watch={watch()} isSubmitting={false}
      onSave={onSave} onClose={onClose} onUnavailable={jest.fn()} />);
    fillPrices('100', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť zmeny' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(7, expect.objectContaining({
      priceMin: '100', priceMax: null, priceCurrency: '€',
    })));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('desktop cancellation never persists normalization of legacy zero values', () => {
    const original = watch({ priceMin: '0.00', priceMax: '0.00' });
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<OfferWatchEditDialog watch={original} isSubmitting={false}
      onSave={onSave} onClose={onClose} onUnavailable={jest.fn()} />);
    expect(screen.getByLabelText('Cena od')).toHaveValue('');
    expect(screen.getByLabelText('Cena do')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(original.priceMin).toBe('0.00');
  });

  it.each(['create', 'edit'] as const)('mobile %s saves zeros through the shared validator', async (mode) => {
    const onSave = jest.fn().mockResolvedValue({ ok: true, value: watch() });
    const onSaved = jest.fn();
    const props = {
      mode, watch: mode === 'edit' ? watch() : undefined, isSubmitting: false,
      onSave, onSaved, onBack: jest.fn(), onUnavailable: jest.fn(),
      onOpenPicker: jest.fn(), viewportBounds: null,
    };
    const { rerender } = render(<OfferWatchMobileFormScreen {...props} />);
    if (mode === 'create') {
      rerender(<OfferWatchMobileFormScreen {...props} picker='category' />);
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: SUBCATEGORY } });
      fireEvent.click(screen.getByText(SUBCATEGORY, { selector: 'span' }).closest('button')!);
      rerender(<OfferWatchMobileFormScreen {...props} />);
    }
    fillPrices('0,00', '0');
    fireEvent.click(screen.getByRole('button', { name: mode === 'edit' ? 'Uložiť zmeny' : 'Uložiť' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      priceMin: null, priceMax: null, priceCurrency: '',
    })));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('mobile cancellation discards a zero draft instead of writing a watch', () => {
    const onSave = jest.fn();
    const onBack = jest.fn();
    render(<OfferWatchMobileFormScreen mode='edit' watch={watch()}
      isSubmitting={false} onSave={onSave} onBack={onBack} onSaved={jest.fn()}
      onUnavailable={jest.fn()} onOpenPicker={jest.fn()} viewportBounds={null} />);
    fillPrices('0', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
