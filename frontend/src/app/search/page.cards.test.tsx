import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchResultsPage from './page';
import { endpoints, get, lastQuery, pageState, post, rawOffer, resetPage, router, setQuery } from './searchPage.test-utils';

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

function mobileCard() {
  return screen.getByText('Result card 7').closest('div[role="button"]') as HTMLElement;
}

function detailSheet() {
  const heading = screen.queryByRole('heading', { name: 'Popis', exact: true });
  return (heading?.closest('div.fixed.inset-x-0.bottom-0') ?? null) as HTMLElement | null;
}

async function waitForMobileCard() {
  // jsdom has no Tailwind; wait for matchMedia hydration rather than selecting its CSS-hidden SSR card.
  await waitFor(() => expect(mobileCard()).not.toBeNull());
  return mobileCard();
}

describe.each(['all', 'offers'] as const)('actual /search page %s cards', (tab) => {
  const query = tab === 'all' ? 'q=logo' : 'q=logo&tab=offers';

  it.each([false, true])('connects the real responsive card with mobile=%s', async (mobile) => {
    resetPage(query, mobile);
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(get).toHaveBeenCalledWith(tab === 'all' ? endpoints.searchGlobal : endpoints.search, expect.any(Object));
    expect(screen.getByRole('button', { name: /Fixture author/ })).toBeInTheDocument();

    if (mobile) {
      const card = await waitForMobileCard();
      expect(within(card).getByText('Ponúkam')).toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Otočiť' })).not.toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Mám záujem' })).not.toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Správa' })).not.toBeInTheDocument();
      fireEvent.click(card);
      expect(detailSheet()).toBeNull();
      expect(within(card).queryByText('Ponúkam')).not.toBeInTheDocument();
      fireEvent.click(card);
      const sheet = detailSheet()!;
      expect(sheet).not.toBeNull();
      expect(within(sheet).getByText('Result detail 7')).toBeInTheDocument();
      expect(within(sheet).getByText('13')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');
      fireEvent.click(within(sheet).getByRole('button', { name: 'Zavrieť' }));
      expect(detailSheet()).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(within(card).getByText('Ponúkam')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    } else {
      // jsdom nemá Tailwind: kým `useIsMobileState` nerozhodne (efekt po prvom vykreslení), je desktopová karta ešte v obale
      // `hidden lg:block` a po rozhodnutí sa jej uzol vymení. React 19 ten efekt dobehne až pri ďalšom `act`, takže bez čakania
      // by klik zasiahol zaniknutý uzol.
      await waitFor(() => expect(document.querySelector('div.hidden.lg\\:block')).toBeNull());
      const front = screen.getByRole('button', { name: 'Páči sa mi to' }).closest('div.block')!;
      const wrapper = front.parentElement as HTMLElement;
      expect(within(wrapper).getAllByRole('button', { name: 'Otočiť' })).toHaveLength(2);
      fireEvent.click(within(front as HTMLElement).getByRole('button', { name: 'Otočiť' }));
      expect(front).toHaveClass('hidden');
      expect(within(wrapper).getByText('Result detail 7').closest('div.block')).not.toBeNull();
      // Hydration may replace the initially CSS-wrapped desktop node; interact with the current document.
      const activeBack = screen.getByText('Result detail 7').closest('div.block') as HTMLElement;
      fireEvent.click(within(activeBack).getByRole('button', { name: 'Otočiť' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Páči sa mi to' }).closest('div.block')).not.toBeNull());
      expect(detailSheet()).toBeNull();
    }
    expect(post).not.toHaveBeenCalled();
  });

  it('retains working mobile Like, stops its click from opening a detail, and accepts server truth', async () => {
    resetPage(query, true);
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    const card = await waitForMobileCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Páči sa mi to' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith('/fixture/skills/7/like/');
    await waitFor(() => {
      expect(card).toBeInTheDocument();
      const like = within(card).getByRole('button', { name: 'Páči sa mi to' });
      expect(like).toHaveAttribute('aria-pressed', 'true');
      expect(like).not.toBeDisabled();
    });
    expect(within(card).getByText('Ponúkam')).toBeInTheDocument();
    expect(detailSheet()).toBeNull();
    fireEvent.click(card);
    fireEvent.click(card);
    expect(within(detailSheet()!).getByText('14')).toBeInTheDocument();
  });

  it('keeps author navigation and resets an open mobile detail after the query changes', async () => {
    resetPage(query, true);
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    fireEvent.click(screen.getByRole('button', { name: /Fixture author/ }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/users/fixture-author');
    const card = await waitForMobileCard();
    fireEvent.click(card);
    fireEvent.click(card);
    expect(detailSheet()).not.toBeNull();
    act(() => { setQuery(`${query}&page=2`); view.rerender(<SearchResultsPage />); });
    await waitFor(() => expect(detailSheet()).toBeNull());
    expect(document.body.style.overflow).toBe('');
    expect(within(mobileCard()).getByText('Ponúkam')).toBeInTheDocument();
  });

  it('uses a demand banner and never adds the offer review action', async () => {
    resetPage(query, true);
    const offer = rawOffer(7, { is_seeking: true, urgency: 'high', duration_type: 'one_time' });
    pageState.global.offers = [offer];
    pageState.offers.results = [offer];
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    const card = await waitForMobileCard();
    expect(within(card).getByText('Hľadám')).toBeInTheDocument();
    fireEvent.click(card);
    fireEvent.click(card);
    const sheet = within(detailSheet()!);
    expect(sheet.getByText('Vysoká')).toBeInTheDocument();
    expect(sheet.getByText('Jednorazovo')).toBeInTheDocument();
    expect(sheet.queryByText('Hodnotenia')).not.toBeInTheDocument();
  });
});

describe('actual global preview data, limits, and tab navigation', () => {
  beforeEach(() => resetPage());

  it('keeps the preview limit, own-card exclusion, capped counts, and both show-more destinations', async () => {
    pageState.global = {
      offers: [rawOffer(99, { user_id: 101 }), ...Array.from({ length: 10 }, (_, i) => rawOffer(i + 1))],
      users: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, display_name: `User ${i + 1}` })),
      offers_count: 100, users_count: 100, offers_is_capped: true,
    };
    render(<SearchResultsPage />);
    await screen.findByText('Result card 1');
    expect(screen.queryByText('Result card 99')).not.toBeInTheDocument();
    expect(screen.queryByText('Result card 10')).not.toBeInTheDocument();
    expect(screen.queryByText('User 6')).not.toBeInTheDocument();
    expect(screen.getByText('200+ výsledkov')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť viac ľudí' }));
    expect(lastQuery().get('tab')).toBe('users');
    expect(lastQuery().has('users_page')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť viac ponúk' }));
    expect(lastQuery().get('tab')).toBe('offers');
    expect(lastQuery().get('page')).toBe('1');
  });

  it('changes each top tab without losing unrelated query parameters', async () => {
    setQuery('q=logo&onlyMyLocation=1');
    const view = render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    fireEvent.click(screen.getByRole('button', { name: 'Ľudia', exact: true }));
    expect(lastQuery().get('tab')).toBe('users');
    expect(lastQuery().get('users_page')).toBe('1');
    expect(lastQuery().get('onlyMyLocation')).toBe('1');
    act(() => { setQuery(lastQuery().toString()); view.rerender(<SearchResultsPage />); });
    fireEvent.click(screen.getByRole('button', { name: 'Ponuky', exact: true }));
    expect(lastQuery().get('tab')).toBe('offers');
    expect(lastQuery().get('page')).toBe('1');
    act(() => { setQuery(lastQuery().toString()); view.rerender(<SearchResultsPage />); });
    const allTab = screen.getAllByRole('button', { name: 'Všetko', exact: true })
      .find((button) => button.parentElement?.classList.contains('w-full'))!;
    fireEvent.click(allTab);
    expect(lastQuery().has('tab')).toBe(false);
    expect(lastQuery().has('page')).toBe(false);
    expect(lastQuery().has('users_page')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Späť', exact: true }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/search');
  });

  it.each([
    [{ owner_user_type: 'company', user_display_name: '', owner_slug: '', user_id: 303 }, '/dashboard/users/303'],
    [{ owner_user_type: 'company', user_display_name: '', owner_slug: '', user_id: undefined }, null],
  ])('preserves company styling, author fallback and identifier handling for %j', async (owner, destination) => {
    pageState.global.offers = [rawOffer(7, owner)];
    render(<SearchResultsPage />);
    await screen.findByText('Result card 7');
    expect(screen.getByText('PRO')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Používateľ Firma/ }));
    if (destination) expect(router.push).toHaveBeenCalledWith(destination);
    else expect(router.push).not.toHaveBeenCalled();
  });
});
