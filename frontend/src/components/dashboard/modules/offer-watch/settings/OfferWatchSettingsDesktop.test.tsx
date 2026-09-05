import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import { OfferWatchApiError } from '../offerWatchApi';
import type { OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchSettingsDesktop from './OfferWatchSettingsDesktop';

jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: 'SK',
    setCountry: jest.fn(),
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;
const SUBCATEGORY = SUBCATEGORIES[0]!;
const mockedUseOfferWatches = jest.mocked(useOfferWatches);

function watch(id: number, overrides: Partial<OfferWatch> = {}): OfferWatch {
  return {
    id,
    category: CATEGORY,
    subcategory: SUBCATEGORY,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
    ...overrides,
  };
}

function hookResult(overrides: Partial<UseOfferWatchesResult> = {}): UseOfferWatchesResult {
  return {
    watches: [],
    isLoading: false,
    mutation: null,
    error: null,
    reload: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    createWatch: jest.fn().mockResolvedValue({ ok: true, value: watch(1) }),
    updateWatch: jest.fn().mockResolvedValue({ ok: true, value: watch(1) }),
    deleteWatch: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    clearError: jest.fn(),
    ...overrides,
  };
}

async function selectCategory(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Podkategória' }));
  const search = screen.getByRole('combobox', { name: 'Začni písať názov podkategórie' });
  await user.type(search, SUBCATEGORY);
  const resultLabel = await screen.findByText(SUBCATEGORY, { selector: 'span' });
  await user.click(resultLabel.closest('button')!);
}

describe('OfferWatchSettingsDesktop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
    mockedUseOfferWatches.mockReturnValue(hookResult());
  });

  afterEach(() => window.localStorage.clear());

  it('validates locally, creates a canonical watch and resets the form after success', async () => {
    const user = userEvent.setup();
    const state = hookResult();
    mockedUseOfferWatches.mockReturnValue(state);
    render(<OfferWatchSettingsDesktop />);

    await user.click(screen.getByRole('button', { name: 'Uložiť sledovanie' }));
    expect(state.createWatch).not.toHaveBeenCalled();
    expect(screen.getByText('Vyber podkategóriu.')).toBeInTheDocument();

    await selectCategory(user);
    await user.click(screen.getByRole('button', { name: 'Dopyty' }));
    await user.type(screen.getByPlaceholderText('Cena od'), '10,50');
    await user.selectOptions(screen.getByLabelText('Mena'), '€');
    await user.click(screen.getByRole('button', { name: 'Uložiť sledovanie' }));

    await waitFor(() => expect(state.createWatch).toHaveBeenCalledWith({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: true,
      countryCode: 'SK',
      districtCode: '',
      priceMin: '10.5',
      priceMax: null,
      priceCurrency: '€',
    }));
    expect(toast.success).toHaveBeenCalledWith('Sledovanie bolo uložené.');
    expect(screen.getByRole('button', { name: 'Podkategória' })).toHaveTextContent('Vyber podkategóriu');
  });

  it('keeps the draft usable when the server rejects a duplicate', async () => {
    const user = userEvent.setup();
    const state = hookResult({
      createWatch: jest.fn().mockResolvedValue({
        ok: false,
        error: new OfferWatchApiError('duplicate', { status: 400 }),
      }),
    });
    mockedUseOfferWatches.mockReturnValue(state);
    render(<OfferWatchSettingsDesktop />);

    await selectCategory(user);
    await user.click(screen.getByRole('button', { name: 'Uložiť sledovanie' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Takéto sledovanie už máš vytvorené.'));
    expect(screen.getByRole('button', { name: 'Podkategória' })).toHaveTextContent(SUBCATEGORY);
    expect(screen.getByRole('button', { name: 'Uložiť sledovanie' })).toBeEnabled();
  });

  it('edits only after save and deletes only after confirmation', async () => {
    const user = userEvent.setup();
    const savedWatch = watch(7);
    const state = hookResult({ watches: [savedWatch] });
    mockedUseOfferWatches.mockReturnValue(state);
    render(<OfferWatchSettingsDesktop />);

    const editTrigger = screen.getByRole('button', { name: 'Upraviť sledovanie' });
    await user.click(editTrigger);
    let dialog = await screen.findByTestId('offer-watch-edit-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Dopyty' }));
    await user.click(within(dialog).getByRole('button', { name: 'Zrušiť' }));
    expect(state.updateWatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('offer-watch-edit-dialog')).not.toBeInTheDocument();

    await user.click(editTrigger);
    dialog = await screen.findByTestId('offer-watch-edit-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Uložiť zmeny' }));
    await waitFor(() => expect(state.updateWatch).toHaveBeenCalledWith(7, expect.objectContaining({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: false,
    })));

    const deleteTrigger = screen.getByRole('button', { name: 'Vymazať sledovanie' });
    await user.click(deleteTrigger);
    let deleteDialog = await screen.findByTestId('offer-watch-delete-dialog');
    expect(state.deleteWatch).not.toHaveBeenCalled();
    await user.click(within(deleteDialog).getByRole('button', { name: 'Zrušiť' }));
    expect(state.deleteWatch).not.toHaveBeenCalled();

    await user.click(deleteTrigger);
    deleteDialog = await screen.findByTestId('offer-watch-delete-dialog');
    await user.click(within(deleteDialog).getByRole('button', { name: 'Vymazať' }));
    await waitFor(() => expect(state.deleteWatch).toHaveBeenCalledWith(7));
    expect(toast.success).toHaveBeenCalledWith('Sledovanie bolo vymazané.');
  });

  it('disables new creation at five watches and retries an initial load error', async () => {
    const retry = jest.fn().mockResolvedValue({ ok: true, value: [] });
    const { rerender } = render(<OfferWatchSettingsDesktop />);
    mockedUseOfferWatches.mockReturnValue(hookResult({
      watches: Array.from({ length: 5 }, (_, index) => watch(index + 1)),
    }));
    rerender(<OfferWatchSettingsDesktop />);
    expect(screen.getByText(/Dosiahol si limit 5 sledovaní/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložiť sledovanie' })).toBeDisabled();

    mockedUseOfferWatches.mockReturnValue(hookResult({
      error: new OfferWatchApiError('network'),
      reload: retry,
    }));
    rerender(<OfferWatchSettingsDesktop />);
    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));
    await waitFor(() => expect(retry).toHaveBeenCalled());
  });
});
