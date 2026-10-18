import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResultsPage from './page';
import {
  deferred, endpoints, get, lastQuery, pageState, rawOffer, rawUser, resetPage, router, setQuery,
} from './searchPage.test-utils';

jest.mock('next/navigation', () => require('./searchPage.test-utils').navigationModule);
jest.mock('@/contexts/AuthContext', () => require('./searchPage.test-utils').authModule);
jest.mock('@/lib/api', () => require('./searchPage.test-utils').apiModule);
jest.mock('@/components/dashboard/modules/shared/OfferImageCarousel', () => ({
  __esModule: true, default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('@/components/dashboard/modules/shared/OfferImageGalleryLightbox', () => ({
  __esModule: true, default: () => null,
}));

type Target = 'users' | 'offers';
const source = 'q=logo&tab=all&country=SK&onlyMyLocation=1&sort=price_desc&rating=4'
  + '&price_min=5&price_max=20&type=seeking&page=3&users_page=4&tracking=from%20panel&tracking=second';

/** The actual page lives in a nested main; window.scrollTo cannot move this results container. */
function SearchScreen() {
  return <main data-dashboard-main data-search-scroll-root><SearchResultsPage /></main>;
}

/** Start with a valid preview whose backend counts expose both real show-more actions. */
async function renderPreview(mobile: boolean, query = source) {
  resetPage(query, mobile);
  pageState.global = {
    users: [rawUser()], offers: [rawOffer()], users_count: 20, offers_count: 20,
    users_total_pages: 3,
  };
  const view = render(<SearchScreen />);
  await screen.findByText('Result card 7');
  const main = view.container.querySelector<HTMLElement>('[data-search-scroll-root]')!;
  main.scrollTop = 1430;
  return { ...view, main };
}

/** Match the historical URL contract without dropping unrelated or duplicate parameters. */
function targetQuery(target: Target, query = source) {
  const params = new URLSearchParams(query);
  params.set('tab', target);
  if (target === 'users') params.delete('users_page');
  else params.set('page', '1');
  return params.toString();
}

/** Commit router output explicitly so tests distinguish the click from actual route rendering. */
function commitQuery(view: ReturnType<typeof render>, query: string) {
  act(() => { setQuery(query); view.rerender(<SearchScreen />); });
}

afterEach(() => { cleanup(); jest.restoreAllMocks(); });

describe.each([false, true])('real search preview navigation with mobile=%s', (mobile) => {
  it.each<[Target, 'click' | 'Enter']>([
    ['users', 'click'], ['users', 'Enter'], ['offers', 'click'], ['offers', 'Enter'],
  ])('%s starts at the top on %s only after the exact route commits', async (target, activation) => {
    const view = await renderPreview(mobile);
    const pending = deferred<{ data: Record<string, unknown> }>();
    get.mockReturnValue(pending.promise);
    const button = screen.getByRole('button', {
      name: target === 'users' ? 'Zobraziť viac ľudí' : 'Zobraziť viac ponúk', exact: true,
    });
    if (activation === 'Enter') {
      button.focus();
      await userEvent.setup().keyboard('{Enter}');
    } else fireEvent.click(button);

    const destination = targetQuery(target);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(`/search?${destination}`, { scroll: false });
    expect(lastQuery().getAll('tracking')).toEqual(['from panel', 'second']);
    expect(view.main.scrollTop).toBe(1430);

    commitQuery(view, destination);
    expect(view.main.scrollTop).toBe(0);
    await waitFor(() => expect(get).toHaveBeenCalledWith(
      target === 'users' ? endpoints.searchGlobal : endpoints.search,
      expect.objectContaining({ params: expect.objectContaining(target === 'users'
        ? { users_page: 1, include_offers: 'false' }
        : { page: 1, price_min: '5', price_max: '20', type: 'seeking' }) }),
    ));
    expect(screen.getByText('Načítavam…')).toBeInTheDocument();

    // A slow request must not schedule another reset after the user has already begun reading.
    view.main.scrollTop = 411;
    fireEvent.scroll(view.main);
    await act(async () => pending.resolve({ data: target === 'users'
      ? { users: [rawUser(303)], offers: [], users_count: 1, offers_count: 0, users_total_pages: 1 }
      : { results: [rawOffer(9)], total: 1, page: 1, total_pages: 1 } }));
    await screen.findByText(target === 'users' ? 'Fixture user 303' : 'Result card 9');
    expect(view.main.scrollTop).toBe(411);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not reset the main on direct mount or an ordinary top-tab change', async () => {
    const view = await renderPreview(mobile, 'q=logo');
    expect(router.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ľudia', exact: true }));
    expect(lastQuery().get('tab')).toBe('users');
    commitQuery(view, lastQuery().toString());
    await screen.findByText('Fixture user 202');
    expect(view.main.scrollTop).toBe(1430);
  });

  it('does not turn a completed preview intent into a reset on subsequent history navigation', async () => {
    const view = await renderPreview(mobile);
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť viac ľudí', exact: true }));
    const destination = targetQuery('users');
    commitQuery(view, destination);
    await screen.findByText('Fixture user 202');
    expect(view.main.scrollTop).toBe(0);
    view.main.scrollTop = 620;

    commitQuery(view, source);
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    await screen.findByText('Result card 7');
    view.main.scrollTop = 777;
    commitQuery(view, destination);
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    await screen.findByText('Fixture user 202');
    expect(view.main.scrollTop).toBe(777);
  });
});
