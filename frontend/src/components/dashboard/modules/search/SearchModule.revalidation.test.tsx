import { act, fireEvent, render, screen } from '@testing-library/react';
import { api } from '@/lib/api';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import SearchModule from '../SearchModule';
import { clearSearchResultsCache, invalidateSearchResultsForUser } from './hooks/searchResultsCache';

jest.unmock('@/contexts/LanguageContext');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/dashboard/search/', searchRecommendations: '/recommendations/' } },
}));

const mockGet = api.get as jest.Mock;
const account = { id: 71 } as User;
const empty = { skills: [], users: [] };
const populated = { skills: [{ id: 81, user_id: 72, category: 'Synthetic',
  subcategory: 'Kontrola pamäte', description: '', is_seeking: false }], users: [] };
const calls = () => mockGet.mock.calls.filter(([endpoint]) => endpoint === '/dashboard/search/');

/** Mount the public module with real country, state, cache, transport orchestration and result rendering. */
function mount(active = true) {
  return render(<LanguageProvider><SearchModule user={account} isOverlay isActive={active} /></LanguageProvider>);
}

/** Keep an API boundary pending while assertions observe the actual user-facing intermediate state. */
function deferred() {
  let resolve!: (value: { data: typeof populated; status: number }) => void;
  const promise = new Promise<{ data: typeof populated; status: number }>((yes) => { resolve = yes; });
  return { promise, resolve };
}

/** Complete microtasks and only the explicitly requested debounce interval. */
async function flush(ms = 0) {
  await act(async () => { jest.advanceTimersByTime(ms); });
}

/** Search through the real Enter handler, including cancellation of the scheduled debounce. */
async function search(query = 'Kontrola') {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await flush();
  return input;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  localStorage.clear();
  clearSearchResultsCache();
  localStorage.setItem('appLocale', 'sk');
  localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }));
  mockGet.mockImplementation((endpoint) => Promise.resolve({ data: endpoint === '/dashboard/search/' ? populated : empty, status: 200 }));
});

afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('keeps a visible preview only while genuinely checking the server, then accepts an empty replacement', async () => {
  mount();
  const input = await search();
  const pending = deferred();
  mockGet.mockReturnValueOnce(pending.promise);
  const history = localStorage.getItem('searchRecentResults_71');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(calls()).toHaveLength(2);
  expect(screen.getByRole('button', { name: /Kontrola pamäte/ })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveAttribute('data-search-revalidating', 'true');
  expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
  expect(localStorage.getItem('searchRecentResults_71')).toBe(history);
  await act(async () => { pending.resolve({ data: empty, status: 200 }); });
  expect(screen.queryByRole('button', { name: /Kontrola pamäte/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByText('Pre zadané vyhľadávanie sa nenašli žiadne výsledky.')).toBeInTheDocument();
});

it('does not announce a cached empty result as final until its new server response arrives', async () => {
  mount();
  mockGet.mockResolvedValueOnce({ data: empty, status: 200 });
  const input = await search();
  const pending = deferred();
  mockGet.mockReturnValueOnce(pending.promise);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('status')).toHaveTextContent('Načítavam výsledky...');
  expect(screen.queryByText('Pre zadané vyhľadávanie sa nenašli žiadne výsledky.')).not.toBeInTheDocument();
  await act(async () => { pending.resolve({ data: populated, status: 200 }); });
  expect(screen.getByRole('button', { name: /Kontrola pamäte/ })).toBeInTheDocument();
});

it.each(['apply', 'submit'])('%s cancels the scheduled debounce even if its explicit request finishes quickly', async (method) => {
  mount();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Scheduled' } });
  if (method === 'apply') {
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ponúkam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Použiť filtre' }));
  } else fireEvent.submit(screen.getByRole('textbox').closest('form')!);
  await flush();
  expect(calls()).toHaveLength(1);
  await flush(800);
  expect(calls()).toHaveLength(1);
});

it('deduplicates repeated Enter during one pending attempt but verifies again after completion', async () => {
  mount();
  const pending = deferred();
  mockGet.mockReturnValueOnce(pending.promise);
  const input = await search();
  fireEvent.keyDown(input, { key: 'Enter' });
  await flush(800);
  expect(calls()).toHaveLength(1);
  await act(async () => { pending.resolve({ data: populated, status: 200 }); });
  fireEvent.keyDown(input, { key: 'Enter' });
  await flush();
  expect(calls()).toHaveLength(2);
});

it('reopens with immediate verification and never flashes a snapshot evicted while the panel was closed', async () => {
  const view = mount();
  await search();
  view.rerender(<LanguageProvider><SearchModule user={account} isOverlay isActive={false} /></LanguageProvider>);
  invalidateSearchResultsForUser(72);
  const pending = deferred();
  mockGet.mockImplementation((endpoint) => endpoint === '/dashboard/search/'
    ? pending.promise : Promise.resolve({ data: empty, status: 200 }));
  view.rerender(<LanguageProvider><SearchModule user={account} isOverlay /></LanguageProvider>);
  expect(calls()).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /Kontrola pamäte/ })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Načítavam výsledky...');
  await act(async () => { pending.resolve({ data: empty, status: 200 }); });
  expect(screen.getByText('Pre zadané vyhľadávanie sa nenašli žiadne výsledky.')).toBeInTheDocument();
});

it('clearing before the debounce fires cancels both the timer and any stale results', async () => {
  mount();
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'Not submitted' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vyčistiť vyhľadávanie' }));
  await flush(800);
  expect(input).toHaveValue('');
  expect(calls()).toHaveLength(0);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('clears an old preview as soon as the query changes, not after the next debounce', async () => {
  mount();
  const input = await search();
  fireEvent.change(input, { target: { value: 'Changed' } });
  expect(screen.queryByRole('button', { name: /Kontrola pamäte/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
  expect(calls()).toHaveLength(1);
});

it('does not show a final empty state while only hidden result groups are being revalidated', async () => {
  mount();
  const input = await search();
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
  const pending = deferred();
  mockGet.mockReturnValueOnce(pending.promise);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('status')).not.toHaveAttribute('data-search-revalidating');
  expect(screen.queryByText('Pre zadané vyhľadávanie sa nenašli žiadne výsledky.')).not.toBeInTheDocument();
  await act(async () => { pending.resolve({ data: empty, status: 200 }); });
});
