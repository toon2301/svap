import { setCurrentAccountId } from '@/lib/currentAccount';
import { readSearchScroll } from '@/components/search/searchScrollMemory';
import { openUserProfileFromSearch } from './openUserProfileFromSearch';

let main: HTMLElement;
beforeEach(() => {
  sessionStorage.clear();
  setCurrentAccountId(105);
  window.history.replaceState({ __NA: true }, '', '/search?q=mo');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  main = document.createElement('main');
  main.setAttribute('data-search-scroll-root', '');
  main.scrollTop = 580;
  document.body.append(main);
});
afterEach(() => { main.remove(); setCurrentAccountId(null); });

it('captures the search entry before push can replace its address and state', () => {
  const router = { push: jest.fn((url: string) => {
    expect(readSearchScroll(105)?.top).toBe(580);
    window.history.pushState({ __NA: true }, '', url);
  }) };
  openUserProfileFromSearch(router, 'owner', { highlightSkillId: 42 });
  expect(router.push).toHaveBeenCalledWith('/dashboard/users/owner?highlight=42');
  expect(readSearchScroll(105)).toBeNull();
});

it('removes only its pending scroll when navigation fails before leaving search', () => {
  const router = { push: jest.fn(() => { throw new Error('push failed'); }) };
  expect(() => openUserProfileFromSearch(router, 'owner')).toThrow('push failed');
  expect(readSearchScroll(105)).toBeNull();
});

it('an invalid profile identifier neither captures nor navigates', () => {
  const router = { push: jest.fn() };
  openUserProfileFromSearch(router, '');
  expect(readSearchScroll(105)).toBeNull();
  expect(router.push).not.toHaveBeenCalled();
});
