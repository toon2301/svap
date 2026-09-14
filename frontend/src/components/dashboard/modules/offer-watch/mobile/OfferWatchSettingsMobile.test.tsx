import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { skillsCategories } from '@/constants/skillsCategories';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import { OfferWatchApiError } from '../offerWatchApi';
import type { OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import { useOfferWatches } from '../useOfferWatches';
import { useVisualViewportBounds } from '../../../hooks/useVisualViewportBounds';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';
import type { OfferWatchMobileView } from './offerWatchMobileNavigation';

jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('../../../hooks/useVisualViewportBounds', () => ({
  ...jest.requireActual('../../../hooks/useVisualViewportBounds'),
  useVisualViewportBounds: jest.fn(),
}));
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
const mockedUseVisualViewportBounds = jest.mocked(useVisualViewportBounds);

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

function renderMobile(view: OfferWatchMobileView) {
  const callbacks = {
    onBack: jest.fn(),
    onPushView: jest.fn(),
  };
  const rendered = render(<OfferWatchSettingsMobile view={view} {...callbacks} />);
  return {
    ...callbacks,
    rerenderView: (nextView: OfferWatchMobileView) => {
      rendered.rerender(<OfferWatchSettingsMobile view={nextView} {...callbacks} />);
    },
  };
}

function selectCategory(controls: ReturnType<typeof renderMobile>) {
  fireEvent.click(screen.getByRole('button', { name: /Podkateg/ }));
  expect(controls.onPushView).toHaveBeenCalledWith({
    kind: 'create',
    picker: 'category',
  });

  controls.rerenderView({ kind: 'create', picker: 'category' });
  fireEvent.change(screen.getByRole('searchbox', {
    name: 'Začni písať názov podkategórie',
  }), {
    target: { value: SUBCATEGORY },
  });
  const result = screen.getByText(SUBCATEGORY, { selector: 'span' });
  fireEvent.click(result.closest('button')!);
  expect(controls.onBack).toHaveBeenCalledTimes(1);

  controls.rerenderView({ kind: 'create' });
  controls.onBack.mockClear();
  controls.onPushView.mockClear();
}

describe('OfferWatchSettingsMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
    mockedUseOfferWatches.mockReturnValue(hookResult());
    mockedUseVisualViewportBounds.mockReturnValue(null);
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

    fireEvent.click(screen.getByRole('button', { name: /^Uložiť$/ }));
    expect(state.createWatch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();

    selectCategory(callbacks);
    fireEvent.click(screen.getByRole('button', { name: /Dopyty/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Uložiť$/ }));

    await waitFor(() => expect(state.createWatch).toHaveBeenCalledWith(expect.objectContaining({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: true,
      countryCode: 'SK',
    })));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('fits create and edit forms into the visible viewport above the keyboard', () => {
    mockedUseVisualViewportBounds.mockReturnValue({
      top: 72,
      left: 0,
      width: 390,
      height: 420,
      right: 390,
      bottom: 492,
    });

    const { unmount } = render(
      <OfferWatchSettingsMobile
        view={{ kind: 'create' }}
        onBack={jest.fn()}
        onPushView={jest.fn()}
      />,
    );

    expect(mockedUseVisualViewportBounds).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('offer-watch-mobile-screen')).toHaveStyle({
      top: '72px',
      height: '420px',
    });
    expect(screen.getByTestId('offer-watch-mobile-screen')).not.toHaveStyle({ height: '492px' });
    unmount();

    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(7)] }));
    render(
      <OfferWatchSettingsMobile
        view={{ kind: 'edit', watchId: 7 }}
        onBack={jest.fn()}
        onPushView={jest.fn()}
      />,
    );
    expect(screen.getByTestId('offer-watch-mobile-screen')).toHaveStyle({
      top: '72px',
      height: '420px',
    });
  });

  it('keeps a nested picker inside the visual viewport and names the dialog from its heading', () => {
    mockedUseVisualViewportBounds.mockReturnValue({
      top: 48,
      left: 0,
      width: 390,
      height: 430,
      right: 390,
      bottom: 478,
    });

    renderMobile({ kind: 'create', picker: 'country' });

    expect(screen.getByRole('dialog', { name: 'Krajina' })).toHaveStyle({
      top: '48px',
      height: '430px',
    });
    expect(screen.getByTestId('offer-watch-mobile-picker-list')).not.toContainElement(
      screen.getByRole('searchbox', { name: 'Vyhľadaj krajinu' }),
    );
  });

  it('keeps both form actions inside the remaining scrollable viewport', () => {
    mockedUseVisualViewportBounds.mockReturnValue({
      top: 0,
      left: 0,
      width: 390,
      height: 480,
      right: 390,
      bottom: 480,
    });
    renderMobile({ kind: 'create' });

    const saveButton = screen.getByRole('button', { name: /^Uložiť$/ });
    const cancelButton = screen.getByRole('button', { name: /Zru/ });
    const scrollArea = saveButton.closest('.overflow-y-auto');

    expect(scrollArea).not.toBeNull();
    expect(scrollArea).toContainElement(cancelButton);
    expect(scrollArea).toContainElement(saveButton);
    expect(saveButton.parentElement).toHaveClass('grid', 'min-w-0', 'grid-cols-2');
    expect(cancelButton).toHaveClass('w-full', 'min-w-0');
    expect(saveButton).toHaveClass('w-full', 'min-w-0');
    expect(saveButton).not.toHaveClass('min-w-40');
    expect(scrollArea?.firstElementChild).toHaveClass(
      'pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5rem))]',
    );
  });

  it('does not opt the non-editable list screen into keyboard viewport sizing', () => {
    renderMobile({ kind: 'list' });

    expect(mockedUseVisualViewportBounds).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('offer-watch-mobile-screen')).not.toHaveAttribute('style');
  });

  it('returns only once and does not report a limit after saving the fifth watch', async () => {
    const existing = Array.from({ length: 4 }, (_, index) => watch(index + 1));
    const created = watch(5);
    const createWatch = jest.fn().mockResolvedValue({ ok: true, value: created });
    mockedUseOfferWatches.mockReturnValue(hookResult({
      watches: existing,
      createWatch,
    }));
    const callbacks = renderMobile({ kind: 'create' });

    selectCategory(callbacks);
    fireEvent.click(screen.getByRole('button', { name: /^Uložiť$/ }));

    await waitFor(() => expect(createWatch).toHaveBeenCalledTimes(1));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();

    mockedUseOfferWatches.mockReturnValue(hookResult({
      watches: [created, ...existing],
      createWatch,
    }));
    callbacks.rerenderView({ kind: 'create' });

    await waitFor(() => expect(callbacks.onBack).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rejects a restored create screen when five watches already exist', async () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({
      watches: Array.from({ length: 5 }, (_, index) => watch(index + 1)),
    }));

    const callbacks = renderMobile({ kind: 'create' });

    await waitFor(() => expect(callbacks.onBack).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('Môžeš mať maximálne 5 sledovaní.');
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

    expect(screen.queryByRole('button', { name: /Vytvori.*sledovanie/ })).not.toBeInTheDocument();
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
