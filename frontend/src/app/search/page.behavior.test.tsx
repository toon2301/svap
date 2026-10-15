import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchResultsPage from './page';
import { deferred, endpoints, get, lastQuery, pageState, rawOffer, rawUser, resetPage, router, setQuery } from './searchPage.test-utils';

jest.mock('next/navigation', () => require('./searchPage.test-utils').navigationModule);
jest.mock('@/contexts/AuthContext', () => require('./searchPage.test-utils').authModule);
jest.mock('@/lib/api', () => require('./searchPage.test-utils').apiModule);
jest.mock('@/components/dashboard/modules/shared/OfferImageCarousel', () => ({
  __esModule: true, default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('@/components/dashboard/modules/shared/OfferImageGalleryLightbox', () => ({
  __esModule: true, default: () => null,
}));

afterEach(() => { cleanup(); jest.restoreAllMocks(); });

function chooseFilter(label: string, option: string) {
  const wrapper = screen.getByText(label, { selector: 'label' }).parentElement!;
  fireEvent.click(wrapper.querySelector('button')!);
  fireEvent.click(screen.getByRole('option', { name: option, exact: true }));
}

describe('actual search page empty, pending, failure, and data guards', () => {
  it.each(['', 'q=%20&tab=offers', 'tab=users', null])('does not fetch with an empty query %s', (query) => {
    resetPage();
    setQuery(query);
    render(<SearchResultsPage />);
    expect(get).not.toHaveBeenCalled();
    expect(screen.getAllByText('Zadajte výraz do vyhľadávacieho poľa.').length).toBeGreaterThan(0);
  });

  it.each(['all', 'offers'])('shows real skeletons while %s is pending and then replaces them', async (tab) => {
    resetPage(`q=logo&tab=${tab}`);
    const pending = deferred<{ data: Record<string, unknown> }>();
    get.mockReturnValue(pending.promise);
    const view = render(<SearchResultsPage />);
    expect(screen.getByText('Načítavam…')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    await act(async () => pending.resolve({ data: tab === 'all' ? pageState.global : pageState.offers }));
    expect(await screen.findByText('Result card 7')).toBeInTheDocument();
    expect(screen.queryByText('Načítavam…')).not.toBeInTheDocument();
  });

  it.each(['all', 'offers'])('handles missing result arrays in %s without mounting a card', async (tab) => {
    resetPage(`q=logo&tab=${tab}`);
    pageState.global = { users_count: 0, offers_count: 0 };
    pageState.offers = { total: 0, page: 1, total_pages: 0 };
    render(<SearchResultsPage />);
    await waitFor(() => expect(screen.queryByText('Načítavam…')).not.toBeInTheDocument());
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Žiadne ponuky\.|Žiadne výsledky/).length).toBeGreaterThan(0);
  });

  it.each(['all', 'offers'])('keeps the form usable after a %s backend error and retries on a new query', async (tab) => {
    resetPage(`q=logo&tab=${tab}`);
    get.mockRejectedValueOnce({ response: { data: { error: 'Fixture server error' } } });
    const view = render(<SearchResultsPage />);
    expect(await screen.findByText('Fixture server error')).toBeInTheDocument();
    act(() => { setQuery(`q=newquery&tab=${tab}`); view.rerender(<SearchResultsPage />); });
    expect(await screen.findByText('Result card 7')).toBeInTheDocument();
    expect(screen.queryByText('Fixture server error')).not.toBeInTheDocument();
  });

  it.each(['all', 'offers'])('uses a human fallback after a %s network failure', async (tab) => {
    resetPage(`q=logo&tab=${tab}`);
    get.mockRejectedValueOnce(new Error('Fixture private detail'));
    render(<SearchResultsPage />);
    expect(await screen.findByText('Nepodarilo sa načítať výsledky.')).toBeInTheDocument();
    expect(screen.queryByText('Fixture private detail')).not.toBeInTheDocument();
  });

  it.each(['all', 'offers'])('does not filter results without an authenticated own ID in %s', async (tab) => {
    resetPage(`q=logo&tab=${tab}`);
    pageState.user = null;
    const own = rawOffer(101, { user_id: 101 });
    pageState.global.offers = [own];
    pageState.offers.results = [own];
    render(<SearchResultsPage />);
    expect(await screen.findByText('Result card 101')).toBeInTheDocument();
  });

  it('resets loaded global results when the query becomes empty', async () => {
    resetPage();
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    act(() => { setQuery('q='); view.rerender(<SearchResultsPage />); });
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('can remove the last tab-only parameter and navigate to the bare search route', () => {
    resetPage('tab=users');
    render(<SearchResultsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Všetko', exact: true }));
    expect(router.replace).toHaveBeenCalledWith('/search', { scroll: false });
  });

  it('treats repeated selection of the current tab as a navigation no-op even without search params', () => {
    resetPage();
    setQuery(null);
    render(<SearchResultsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Všetko', exact: true }));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('uses global search for an unknown tab and own-card filtering for the offers endpoint', async () => {
    resetPage('q=logo&tab=unknown');
    pageState.global.offers = [rawOffer(7, { user_id: 101 }), rawOffer(8)];
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 8');
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(endpoints.searchGlobal, expect.any(Object));
    pageState.offers.results = [rawOffer(7, { user_id: 101 }), rawOffer(8)];
    act(() => { setQuery('q=logo&tab=offers'); view.rerender(<SearchResultsPage />); });
    await waitFor(() => expect(get).toHaveBeenCalledWith(endpoints.search, expect.any(Object)));
    expect(await screen.findByText('Result card 8')).toBeInTheDocument();
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
  });
});

describe('URL-driven offer filters, sorting and page callbacks', () => {
  beforeEach(() => resetPage('q=logo&tab=offers'));

  it('passes valid saved filter/sort/page values to the backend', async () => {
    setQuery('q=%20logo%20&tab=offers&sort=price_desc&rating=4&price_min=5&price_max=20&type=seeking&page=2');
    pageState.offers = { results: [rawOffer()], total: 500, is_capped: true, page: 2, total_pages: 3 };
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(get).toHaveBeenCalledWith(endpoints.search, { params: {
      q: 'logo', page: 2, page_size: 12, sort: 'price_desc', min_rating: 4,
      price_min: '5', price_max: '20', type: 'seeking',
    } });
    expect(screen.getByText('500+ výsledkov')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Od')).toHaveValue(5);
    expect(screen.getByPlaceholderText('Do')).toHaveValue(20);
  });

  it.each(['page=0', 'page=broken', 'page=-3'])('rejects an invalid page while defaulting invalid sort/rating/type (%s)', async (page) => {
    setQuery(`q=logo&tab=offers&sort=bad&rating=9&type=bad&${page}`);
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(get).toHaveBeenCalledWith(endpoints.search, { params: {
      q: 'logo', page: 1, page_size: 12, sort: 'newest', min_rating: undefined,
      price_min: undefined, price_max: undefined, type: undefined,
    } });
  });

  it('shows the minimum-query guidance only when a single character has no active filter', async () => {
    setQuery('q=x&tab=offers');
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(screen.getByText('Zadajte aspoň 2 znaky alebo vyberte filter.')).toBeInTheDocument();
    act(() => { setQuery('q=x&tab=offers&price_min=1'); view.rerender(<SearchResultsPage />); });
    await waitFor(() => expect(screen.queryByText('Zadajte aspoň 2 znaky alebo vyberte filter.')).not.toBeInTheDocument());
  });

  it('recognizes an upper-price-only URL filter as an active filter', async () => {
    setQuery('q=x&tab=offers&price_max=8');
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(screen.queryByText('Zadajte aspoň 2 znaky alebo vyberte filter.')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(endpoints.search, expect.objectContaining({
      params: expect.objectContaining({ price_max: '8' }),
    }));
  });

  it('clears loaded offer results when the query becomes empty', async () => {
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    act(() => { setQuery('tab=offers'); view.rerender(<SearchResultsPage />); });
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('wires all real filter controls and removes empty filter parameters', async () => {
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    chooseFilter('Hodnotenie', '4+');
    expect(lastQuery().get('rating')).toBe('4');
    chooseFilter('Hodnotenie', 'Všetko');
    expect(lastQuery().has('rating')).toBe(false);
    fireEvent.change(screen.getByPlaceholderText('Od'), { target: { value: '10' } });
    expect(lastQuery().get('price_min')).toBe('10');
    fireEvent.change(screen.getByPlaceholderText('Od'), { target: { value: '' } });
    expect(lastQuery().has('price_min')).toBe(false);
    fireEvent.change(screen.getByPlaceholderText('Do'), { target: { value: '20' } });
    expect(lastQuery().get('price_max')).toBe('20');
    fireEvent.change(screen.getByPlaceholderText('Do'), { target: { value: '' } });
    expect(lastQuery().has('price_max')).toBe(false);
    chooseFilter('Typ ponuky', 'Hľadám');
    expect(lastQuery().get('type')).toBe('seeking');
    chooseFilter('Typ ponuky', 'Všetko');
    expect(lastQuery().has('type')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Najnovšie', exact: true }));
    fireEvent.click(screen.getByRole('option', { name: 'Cena ↑', exact: true }));
    expect(lastQuery().get('sort')).toBe('price_asc');
    expect(lastQuery().get('page')).toBe('1');
  });

  it('clears all active filters from the actual empty-results action', async () => {
    setQuery('q=logo&tab=offers&rating=4&price_min=5&price_max=20&type=offer&page=2');
    pageState.offers = { results: [], total: 0, page: 2, total_pages: 0 };
    render(<SearchResultsPage />);
    const clear = await screen.findByRole('button', { name: 'Vymazať filtre' });
    fireEvent.click(clear);
    for (const key of ['rating', 'price_min', 'price_max', 'type']) expect(lastQuery().has(key)).toBe(false);
    expect(lastQuery().get('q')).toBe('logo');
    expect(lastQuery().get('page')).toBe('1');
  });

  it('synchronizes changed URL values and resets page after changed filter/query, not initial mount', async () => {
    setQuery('q=logo&tab=offers&page=3');
    pageState.offers = { results: [rawOffer()], total: 40, page: 3, total_pages: 4 };
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(router.replace).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
    act(() => {
      setQuery('q=changed&tab=offers&page=2&sort=rating_desc&rating=3&price_min=2&price_max=8&type=offer');
      view.rerender(<SearchResultsPage />);
    });
    await waitFor(() => expect(get).toHaveBeenCalledWith(endpoints.search, expect.objectContaining({
      params: expect.objectContaining({ q: 'changed', page: 2, sort: 'rating_desc', min_rating: 3, price_min: '2', price_max: '8', type: 'offer' }),
    })));
    expect(lastQuery().get('page')).toBe('1');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('wires numbered, previous and next page controls without dropping the search query', async () => {
    setQuery('q=logo&tab=offers&page=2');
    pageState.offers = { results: [rawOffer()], total: 40, page: 2, total_pages: 4 };
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    fireEvent.click(screen.getByRole('button', { name: 'Predošlá' }));
    expect(lastQuery().get('page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: '4', exact: true }));
    expect(lastQuery().get('page')).toBe('4');
    fireEvent.click(screen.getByRole('button', { name: 'Ďalšia' }));
    expect(lastQuery().get('q')).toBe('logo');
  });
});

describe('users-only global search page and pagination', () => {
  beforeEach(() => resetPage('q=logo&tab=users&users_page=2'));

  it('requests users only and preserves pagination, own-user identity and capped count', async () => {
    pageState.global = { users: [rawUser(101), rawUser(202)], users_count: 100, users_is_capped: true, users_total_pages: 3 };
    render(<SearchResultsPage />);
    expect(await screen.findByText('Vy')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(endpoints.searchGlobal, { params: {
      q: 'logo', users_page: 2, users_page_size: 24, include_offers: 'false',
    } });
    expect(screen.getByText('100+ výsledkov')).toBeInTheDocument();
    expect(screen.queryByText('Result card 7')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Predošlá' }));
    expect(lastQuery().get('users_page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: '3', exact: true }));
    expect(lastQuery().get('users_page')).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'Ďalšia' }));
    expect(lastQuery().get('users_page')).toBe('3');
  });

  it('resets users_page on a changed query and ignores invalid initial users_page', async () => {
    setQuery('q=logo&tab=users&users_page=bad');
    const view = render(<SearchResultsPage />);
    await screen.findByText('Fixture user 202');
    expect(get).toHaveBeenCalledWith(endpoints.searchGlobal, expect.objectContaining({ params: expect.objectContaining({ users_page: 1 }) }));
    act(() => { setQuery('q=changed&tab=users&users_page=3'); view.rerender(<SearchResultsPage />); });
    await waitFor(() => expect(lastQuery().has('users_page')).toBe(false));
    expect(lastQuery().get('q')).toBe('changed');
  });
});
