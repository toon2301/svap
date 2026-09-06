import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import { OfferWatchApiError } from '../offerWatchApi';
import type { OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';

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
    createdAt: '2026-09-06T08:00:00Z',
    updatedAt: '2026-09-06T08:00:00Z',
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

function renderMobile(
  view: { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; watchId: number },
) {
  const callbacks = {
    onBack: jest.fn(),
    onPushView: jest.fn(),
  };
  render(<OfferWatchSettingsMobile view={view} {...callbacks} />);
  return callbacks;
}

function selectCategory() {
  fireEvent.click(screen.getByRole('button', { name: /Podkateg/ }));
  fireEvent.change(screen.getByRole('combobox', { name: /Za.*p.*sa.*n.*zov podkateg/ }), {
    target: { value: SUBCATEGORY },
  });
  const result = screen.getByText(SUBCATEGORY, { selector: 'span' });
  fireEvent.click(result.closest('button')!);
}

describe('OfferWatchSettingsMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
    mockedUseOfferWatches.mockReturnValue(hookResult());
  });

  afterEach(() => window.localStorage.clear());

  it('opens create/edit as full-screen views and deletes only after confirmation', async () => {
    const savedWatch = watch(7);
    const state = hookResult({ watches: [savedWatch] });
    mockedUseOfferWatches.mockReturnValue(state);
    const callbacks = renderMobile({ kind: 'list' });

    fireEvent.click(screen.getByRole('button', { name: /Vytvori.*sledovanie/ }));
    expect(callbacks.onPushView).toHaveBeenCalledWith({ kind: 'create' });

    fireEvent.click(screen.getByRole('button', { name: /Upravi.*sledovanie/ }));
    expect(callbacks.onPushView).toHaveBeenCalledWith({ kind: 'edit', watchId: 7 });

    fireEvent.click(screen.getByRole('button', { name: /Vymaza.*sledovanie/ }));
    let dialog = await screen.findByTestId('offer-watch-delete-dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Zru/ }));
    expect(state.deleteWatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Vymaza.*sledovanie/ }));
    dialog = await screen.findByTestId('offer-watch-delete-dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Vymaza/ }));

    await waitFor(() => expect(state.deleteWatch).toHaveBeenCalledWith(7));
    expect(toast.success).toHaveBeenCalled();
  });

  it('validates locally and creates a watch without losing the mobile screen', async () => {
    const state = hookResult();
    mockedUseOfferWatches.mockReturnValue(state);
    const callbacks = renderMobile({ kind: 'create' });

    fireEvent.click(screen.getByRole('button', { name: /Ulo.*sledovanie/ }));
    expect(state.createWatch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();

    selectCategory();
    fireEvent.click(screen.getByRole('button', { name: /Dopyty/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ulo.*sledovanie/ }));

    await waitFor(() => expect(state.createWatch).toHaveBeenCalledWith(expect.objectContaining({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: true,
      countryCode: 'SK',
    })));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('cancels editing without a write and saves the prefilled edit explicitly', async () => {
    const savedWatch = watch(11, { isSeeking: true });
    const state = hookResult({ watches: [savedWatch] });
    mockedUseOfferWatches.mockReturnValue(state);
    const callbacks = renderMobile({ kind: 'edit', watchId: 11 });

    fireEvent.click(screen.getByRole('button', { name: /Zru/ }));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
    expect(state.updateWatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Ulo.*zmeny/ }));
    await waitFor(() => expect(state.updateWatch).toHaveBeenCalledWith(11, expect.objectContaining({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: true,
      countryCode: 'SK',
    })));
    expect(callbacks.onBack).toHaveBeenCalledTimes(2);
  });

  it('enforces the five-watch limit, recovers stale edit links and retries loading', async () => {
    const fullState = hookResult({
      watches: Array.from({ length: 5 }, (_, index) => watch(index + 1)),
    });
    mockedUseOfferWatches.mockReturnValue(fullState);
    const listCallbacks = renderMobile({ kind: 'list' });

    expect(screen.getByRole('button', { name: /Vytvori.*sledovanie/ })).toBeDisabled();
    expect(screen.getByText(/limit 5/)).toBeInTheDocument();
    expect(listCallbacks.onPushView).not.toHaveBeenCalled();
  });

  it('returns stale edits to the list and allows retry after an initial load failure', async () => {
    const onBack = jest.fn();
    mockedUseOfferWatches.mockReturnValue(hookResult());
    const { unmount } = render(
      <OfferWatchSettingsMobile
        view={{ kind: 'edit', watchId: 999 }}
        onBack={onBack}
        onPushView={jest.fn()}
      />,
    );
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
    unmount();

    const reload = jest.fn().mockResolvedValue({ ok: true, value: [] });
    mockedUseOfferWatches.mockReturnValue(hookResult({
      error: new OfferWatchApiError('network'),
      reload,
    }));
    renderMobile({ kind: 'list' });
    fireEvent.click(screen.getByRole('button', { name: /Sk.*znova/ }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
