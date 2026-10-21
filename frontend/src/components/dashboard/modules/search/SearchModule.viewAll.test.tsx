import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import type { User } from '@/types';
import SearchModule from '../SearchModule';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/search/', searchRecommendations: '/recommendations/' } },
}));

const mockGet = api.get as jest.Mock;
const account: User = {
  id: 951,
  username: 'view-all-test',
  email: 'view-all@example.test',
  first_name: 'View',
  last_name: 'All',
  user_type: 'individual',
  is_verified: false,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 0,
};
const result = {
  skills: [{ id: 82, category: 'IT', subcategory: 'Monitorovanie', description: '', user_id: 952 }],
  users: [{ id: 952, display_name: 'Výsledok používateľa', is_verified: false }],
};
const originalWidth = window.innerWidth;
let queryNumber = 0;

/** Search through the real input, state, API hook and results instead of stubbing the callback link. */
async function performSearch() {
  const query = `view-all-${++queryNumber} & ponuky`;
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: `  ${query}  ` } });
  fireEvent.keyDown(input, { key: 'Enter' });
  const button = await screen.findByRole('button', { name: 'Zobraziť všetko' });
  return { query, button };
}

/** Read the actual route produced by the real results component. */
function routedParams() {
  expect(mockPush).toHaveBeenCalledTimes(1);
  const url = new URL(mockPush.mock.calls[0][0], window.location.origin);
  expect(url.pathname).toBe('/search');
  return Object.fromEntries(url.searchParams);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockReset();
  localStorage.clear();
  document.body.classList.remove('filter-modal-open');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  mockGet.mockImplementation(async (path: string) => ({
    data: path === '/search/' ? result : { skills: [], users: [] },
    status: 200,
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  document.body.classList.remove('filter-modal-open');
});

describe('real SearchModule → SearchResults: view-all panel lifecycle', () => {
  it('closes the overlay exactly once before navigating, without synthetic sidebar events', async () => {
    const order: string[] = [];
    const onClose = jest.fn(() => order.push('close'));
    mockPush.mockImplementation(() => order.push('navigate'));
    const sidebar = document.createElement('aside');
    sidebar.dataset.sidebar = 'left';
    const sidebarMouseDown = jest.fn();
    sidebar.addEventListener('mousedown', sidebarMouseDown);
    document.body.appendChild(sidebar);
    try {
      render(<SearchModule user={account} isOverlay onClose={onClose} />);
      const { query, button } = await performSearch();
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.click(button);
      expect(order).toEqual(['close', 'navigate']);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(sidebarMouseDown).not.toHaveBeenCalled();
      expect(routedParams()).toEqual({ q: query });
    } finally {
      sidebar.remove();
    }
  });

  it.each(['{Enter}', ' '])('also closes before keyboard activation with %s', async (key) => {
    const user = userEvent.setup();
    const order: string[] = [];
    const onClose = jest.fn(() => order.push('close'));
    mockPush.mockImplementation(() => order.push('navigate'));
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    const { query, button } = await performSearch();
    button.focus();
    await user.keyboard(key);
    expect(order).toEqual(['close', 'navigate']);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(routedParams()).toEqual({ q: query });
  });

  it('still navigates on mobile where there is no desktop panel close callback', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    mockPush.mockImplementation(() => undefined);
    render(<SearchModule user={account} />);
    const { query, button } = await performSearch();
    fireEvent.click(button);
    expect(routedParams()).toEqual({ q: query });
  });

  it.each([
    ['offers', 'Zobraziť používateľov'],
    ['users', 'Zobraziť ponuky zručností'],
  ])('preserves the %s result-type selection when closing the panel', async (tab, label) => {
    const onClose = jest.fn();
    mockPush.mockImplementation(() => undefined);
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(screen.getByRole('checkbox', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Použiť filtre' }));
    const { query, button } = await performSearch();
    fireEvent.click(button);
    expect(routedParams()).toEqual({ q: query, tab });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['offer', 'Ponúkam'],
    ['seeking', 'Hľadám'],
  ])('retains %s, location and price constraints in the destination URL', async (type, name) => {
    const onClose = jest.fn();
    mockPush.mockImplementation(() => undefined);
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(screen.getByRole('button', { name, exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Len v mojej lokalite (podľa profilu)' }));
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('∞'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Použiť filtre' }));
    const { query, button } = await performSearch();
    fireEvent.click(button);
    expect(routedParams()).toEqual({ q: query, type, onlyMyLocation: '1', price_min: '5', price_max: '25' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not expose view-all or close the panel before results are loaded', async () => {
    const onClose = jest.fn();
    mockGet.mockImplementation(async (path: string) => {
      if (path === '/search/') return new Promise(() => undefined);
      return { data: { skills: [], users: [] }, status: 200 };
    });
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: `pending-${++queryNumber}` } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/search/', expect.any(Object)));
    expect(input.parentElement?.querySelector('.animate-progress-bar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['empty', 'error'])('does not expose view-all or close on %s results', async (state) => {
    const onClose = jest.fn();
    mockGet.mockImplementation(async (path: string) => {
      if (path === '/search/' && state === 'error') throw new Error('network');
      return { data: { skills: [], users: [] }, status: 200 };
    });
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: `${state}-${++queryNumber}` } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText(state === 'error'
      ? /Chyba pri vyhľadávaní/
      : /Pre zadané vyhľadávanie sa nenašli žiadne výsledky/);
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each<[string, typeof result.skills, typeof result.users, string[]]>([
    ['hidden users', [], result.users, ['Zobraziť používateľov']],
    ['hidden offers', result.skills, [], ['Zobraziť ponuky zručností']],
    ['both groups hidden', result.skills, result.users, ['Zobraziť používateľov', 'Zobraziť ponuky zručností']],
  ])('does not advertise view-all for %s returned by the actual API hook', async (_name, skills, users, disabledGroups) => {
    const onClose = jest.fn();
    mockGet.mockImplementation(async (path: string) => ({
      data: path === '/search/' ? { skills, users } : { skills: [], users: [] }, status: 200,
    }));
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    for (const label of disabledGroups) fireEvent.click(screen.getByRole('checkbox', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Použiť filtre' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: `hidden-results-${++queryNumber}` } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Pre zadané vyhľadávanie sa nenašli žiadne výsledky.');
    expect(mockGet).toHaveBeenCalledWith('/search/', expect.any(Object));
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hides view-all while a new query replaces existing results, without closing the panel', async () => {
    const onClose = jest.fn();
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    await performSearch();
    mockGet.mockImplementation(() => new Promise(() => undefined));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: `replacement-${++queryNumber}` } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('clearing a completed query removes view-all rather than navigating or closing the panel', async () => {
    const onClose = jest.fn();
    render(<SearchModule user={account} isOverlay onClose={onClose} />);
    await performSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Vyčistiť vyhľadávanie' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Zobraziť všetko' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
