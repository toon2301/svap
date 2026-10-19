import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { api } from '@/lib/api';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import SearchModule, { invalidateSearchCacheForUser } from '../SearchModule';
import { useSearchApi } from './hooks/useSearchApi';
import { useSearchState } from './hooks/useSearchState';
import sk from '../../../../../messages/sk.json';
import cs from '../../../../../messages/cs.json';
import en from '../../../../../messages/en.json';
import de from '../../../../../messages/de.json';
import pl from '../../../../../messages/pl.json';
import hu from '../../../../../messages/hu.json';

jest.unmock('@/contexts/LanguageContext');
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/dashboard/search/', searchRecommendations: '/recommendations/' } },
}));

const mockGet = api.get as jest.Mock;
const account = { id: 71, username: 'tester', email: 'unused@example.invalid', user_type: 'individual' } as User;
const messages = { sk, cs, en, de, pl, hu };
const title = 'Diagnostika vyhľadávania';
const searchCalls = () => mockGet.mock.calls.filter(([endpoint]) => endpoint === '/dashboard/search/');

function mount(props: Partial<React.ComponentProps<typeof SearchModule>> = {}) {
  return render(<LanguageProvider><SearchModule user={account} {...props} /></LanguageProvider>);
}

function enable(label = title) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  return screen.getByRole('region', { name: label });
}

function value(region: HTMLElement, label: string) {
  return within(region).getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;
}

async function flush(ms = 0) {
  await act(async () => { jest.advanceTimersByTime(ms); });
}

describe('SearchModule diagnostics actual UI/API pipeline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    localStorage.clear();
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('appLastManualOfferCountryV1', 'CZ');
    localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }));
    mockGet.mockResolvedValue({ data: { skills: [], users: [] }, status: 200 });
    const reset = renderHook(() => {
      const state = useSearchState();
      return useSearchApi({ searchState: state });
    }, { wrapper: LanguageProvider });
    reset.result.current.invalidateCache();
    reset.unmount();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.className = '';
  });

  it('preserves the public cache-invalidation export for existing panel consumers', () => {
    expect(() => invalidateSearchCacheForUser(71)).not.toThrow();
  });

  it.each(Object.entries(messages))('provides translated, local-only diagnostics in %s', async (locale, dictionary) => {
    localStorage.setItem('appLocale', locale);
    mount();
    await flush();
    const copy = dictionary.searchDiagnostics;
    const trigger = screen.getByRole('button', { name: copy.title });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    const region = enable(copy.title);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', region.id);
    expect(within(region).getByText(copy.privacy)).toBeInTheDocument();
    expect(within(region).getByText(copy.snapshotNote)).toBeInTheDocument();
    expect(within(region).getByRole('status')).toHaveTextContent(copy.waiting);
    expect(value(region, copy.currentCountry)).toBe('SK');
    expect(value(region, copy.showSkills)).toBe(copy.yes);
    expect(value(region, copy.showUsers)).toBe(copy.yes);
    expect(region.textContent).not.toContain('searchDiagnostics.');
    expect(searchCalls()).toHaveLength(0);
    fireEvent.click(trigger);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(searchCalls()).toHaveLength(0);
  });

  it('uses IP country independently of the manual form country in requests and diagnostics', async () => {
    mount({ isOverlay: true });
    const region = enable();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'MoNiTo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0][1].params.country).toBe('SK');
    expect(value(region, 'Krajina filtra')).toBe('SK');
    expect(value(region, 'Odoslaná krajina')).toBe('SK');
    expect(value(region, 'Zdroj výsledku')).toBe('Sieť');
    expect(value(region, 'HTTP stav')).toBe('200');
    expect(value(region, 'Počet vrátených kariet')).toBe('0');
    expect(value(region, 'Uložená ručná voľba krajiny')).toBe('CZ');
    expect(value(region, 'Uložená krajina z IP detekcie')).toBe('SK');
    expect(region.textContent).not.toContain('MoNiTo');
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(searchCalls()).toHaveLength(2);
    expect(value(region, 'Zdroj výsledku')).toBe('Sieť');
    expect(value(region, 'Odoslaná krajina')).toBe('SK');
    expect(value(region, 'HTTP stav')).toBe('200');
  });

  it('does not restart or postpone the scheduled debounce on any diagnostics toggle', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Scheduled' } });
    await flush(200);
    enable();
    await flush(199);
    expect(searchCalls()).toHaveLength(0);
    await flush(1);
    expect(searchCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: title }));
    enable();
    await flush(800);
    expect(searchCalls()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(sk.searchDiagnostics.waiting);
  });

  it('does not enable diagnostics or fetch recommendations for a hidden overlay', async () => {
    const view = mount({ isOverlay: true, isActive: false });
    fireEvent.click(screen.getByRole('button', { name: title }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hidden' } });
    await flush(500);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
    view.rerender(<LanguageProvider><SearchModule user={account} isOverlay isActive /></LanguageProvider>);
    await flush(400);
    expect(mockGet).toHaveBeenCalledWith('/recommendations/', { params: { limit: 10 } });
    expect(searchCalls()).toHaveLength(1);
  });

  it('clears captured diagnostic evidence when the panel is hidden or account changes', async () => {
    const view = mount({ isOverlay: true });
    enable();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Account evidence' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    await flush();
    expect(screen.getByText('HTTP stav')).toBeInTheDocument();
    view.rerender(<LanguageProvider><SearchModule user={account} isOverlay isActive={false} /></LanguageProvider>);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    view.rerender(<LanguageProvider><SearchModule user={{ ...account, id: 72 }} isOverlay /></LanguageProvider>);
    const region = enable();
    expect(within(region).queryByText('HTTP stav')).not.toBeInTheDocument();
    expect(within(region).getByRole('status')).toHaveTextContent(sk.searchDiagnostics.waiting);
  });

  it('preserves real filter editing and resets without exposing raw prices', async () => {
    mount();
    const region = enable();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Filtered' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(document.body).toHaveClass('filter-modal-open');
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Ponúkam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hľadám' }));
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '12' } });
    fireEvent.change(screen.getByPlaceholderText('∞'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Použiť filtre' }));
    await flush();
    expect(document.body).not.toHaveClass('filter-modal-open');
    expect(searchCalls()[0][1].params).toMatchObject({ offer_type: 'seeking', price_min: '12', price_max: '99', only_my_location: '1' });
    expect(value(region, 'Zobrazovať ponuky a dopyty')).toBe('Nie');
    expect(value(region, 'Zobrazovať používateľov')).toBe('Nie');
    expect(value(region, 'Cena od je vyplnená')).toBe('Áno');
    expect(value(region, 'Cena do je vyplnená')).toBe('Áno');
    expect(region.textContent).not.toMatch(/12|99/);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resetovať' }));
    fireEvent.click(screen.getByRole('button', { name: 'Všetko' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
    expect(document.body).not.toHaveClass('filter-modal-open');
  });

  it('retains Escape, close callback, form submit and cleared search behavior', async () => {
    const close = jest.fn();
    mount({ onClose: close });
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'a' });
    expect(searchCalls()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(document.body).not.toHaveClass('filter-modal-open');
    fireEvent.change(input, { target: { value: 'Submit' } });
    fireEvent.submit(input.closest('form')!);
    await flush();
    expect(searchCalls()).toHaveLength(1);
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText(sk.search.noResults)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zatvoriť vyhľadávací panel' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard shortcuts limited to desktop and non-input targets', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    mount();
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(document.body, { key: '/' });
    await flush(100);
    expect(input).toHaveFocus();
    const editable = document.createElement('textarea');
    document.body.appendChild(editable);
    editable.focus();
    fireEvent.keyDown(editable, { key: '/' });
    await flush(100);
    expect(editable).toHaveFocus();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    button.focus();
    fireEvent.keyDown(button, { key: '/' });
    await flush(100);
    expect(button).toHaveFocus();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 393 });
    fireEvent.keyDown(document.body, { key: '/' });
    await flush(100);
    expect(button).toHaveFocus();
    editable.remove();
    dialog.remove();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  });
});
