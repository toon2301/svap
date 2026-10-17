import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { SearchLayout } from './SearchLayout';
import { SearchResultSkeleton } from './SearchResultSkeleton';

const mockPush = jest.fn((url: string) => window.history.pushState({ __NA: true }, '', url));
let mockViewer: { id: number } | null = { id: 105 };
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockViewer, logout: jest.fn() }) }));
jest.mock('@/components/dashboard/Sidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  RequestsNotificationsProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/components/dashboard/modules/SearchModule', () => ({
  __esModule: true,
  default: ({ onUserClick }: { onUserClick: (id: number, slug: string) => void }) => <button onClick={() => onUserClick(2, 'owner')}>Autor</button>,
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setCurrentAccountId(105);
  mockViewer = { id: 105 };
  sessionStorage.clear();
  window.history.replaceState({ __NA: true, tree: ['search'] }, '', '/search?q=mo&tab=all&sort=newest');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
});
afterEach(() => { setCurrentAccountId(null); jest.useRealTimers(); });

it.each(['all', 'offers', 'users'])('captures before real profile navigation and restores %s only after real results', async (tab) => {
  window.history.replaceState(window.history.state, '', `/search?q=mo&tab=${tab}&page=2`);
  const view = render(<SearchLayout><div>Results</div></SearchLayout>);
  const outgoing = view.container.querySelector<HTMLElement>('[data-dashboard-main]')!;
  outgoing.scrollTop = 1362;
  const sourceUrl = window.location.href;
  fireEvent.click(screen.getByRole('button', { name: 'Autor' }));
  const entries = JSON.parse(sessionStorage.getItem('svaplySearchScrollV1')!);
  expect(entries[0].top).toBe(1362);
  expect(mockPush).toHaveBeenCalledWith('/dashboard/users/owner');
  const profileState = window.history.state;
  view.unmount();

  // A real popstate has the source entry's marker even if Next rewrites history state.
  const entry = entries[0];
  const sourceState = { __NA: true, tree: ['search'], __svaplySearchScroll: { version: 1, id: entry.id } };
  window.history.replaceState(sourceState, '', sourceUrl);
  window.dispatchEvent(new PopStateEvent('popstate', { state: sourceState }));
  window.history.replaceState({ __NA: true }, '', sourceUrl);
  const returned = render(<SearchLayout><SearchResultSkeleton /></SearchLayout>);
  const main = returned.container.querySelector<HTMLElement>('[data-dashboard-main]')!;
  Object.defineProperties(main, {
    clientHeight: { configurable: true, value: 600 }, scrollHeight: { configurable: true, value: 7000 },
  });
  act(() => { jest.advanceTimersByTime(250); });
  expect(main.scrollTop).toBe(0);
  returned.rerender(<SearchLayout><div>Loaded cards</div></SearchLayout>);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(80); });
  expect(main.scrollTop).toBe(1362);
  expect(profileState).toEqual({ __NA: true });
  expect(window.history.state).toMatchObject({ __NA: true, __svaplySearchScroll: { version: 1, id: entry.id } });
});

it('does not capture the dashboard search overlay or an unconfirmed account', () => {
  window.history.replaceState(null, '', '/dashboard');
  const view = render(<SearchLayout><div>Results</div></SearchLayout>);
  fireEvent.click(screen.getByRole('button', { name: 'Autor' }));
  expect(sessionStorage.getItem('svaplySearchScrollV1')).toBeNull();
  view.unmount();
  window.history.replaceState(null, '', '/search?q=mo');
  setCurrentAccountId(null);
  render(<SearchLayout><div>Results</div></SearchLayout>);
  fireEvent.click(screen.getByRole('button', { name: 'Autor' }));
  expect(sessionStorage.getItem('svaplySearchScrollV1')).toBeNull();
});
