/**
 * Odkaz na recenzie ponuky a jeho návratová adresa (desktopová sekcia ponúk).
 *
 * Šípka v recenziách sa po F5 alebo v novej karte vráti na adresu z `returnTo`. Pri cudzom profile
 * to má byť obyčajná adresa profilu: `offer` by kartu zvýraznil a prescrolloval na ňu a `side=back`
 * by ju otočil na zadnú stranu. Pri vlastnom profile je to `/dashboard/profile`.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileOffersSection from '../ProfileOffersSection';
import { invalidateOffersCache, makeOffersCacheKey, setOffersToCache } from '../profileOffersCache';
import type { Offer } from '../profileOffersTypes';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockSearch = new URLSearchParams('');
const mockAuth = { user: null, updateUser: jest.fn() };
const mockT = (key: string, fallback?: string) => fallback ?? key;

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearch,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT }),
}));

// Karta má vlastné testy; tu ide o adresu, ktorú jej sekcia podáva.
jest.mock('../ProfileOfferCard', () => ({
  __esModule: true,
  default: ({ offer, reviewsHref }: { offer: { id: number }; reviewsHref?: string | null }) => (
    <div data-testid={`offer-card-${offer.id}`} data-reviews-href={reviewsHref ?? ''} />
  ),
}));

function makeOffer(id: number): Offer {
  return {
    id,
    category: 'Vzdelávanie',
    subcategory: `sub-${id}`,
    description: `Ponuka ${id}`,
    images: [],
    price_currency: 'EUR',
    is_hidden: false,
    tags: [],
  };
}

/** Cesta recenzií a rozparsovaný `returnTo` z odkazu, ktorý sekcia dala karte. */
function reviewsLinkOf(offerId: number) {
  const href = screen.getByTestId(`offer-card-${offerId}`).getAttribute('data-reviews-href') ?? '';
  const url = new URL(href, 'https://svaply.test');
  return { path: url.pathname, returnTo: url.searchParams.get('returnTo') };
}

beforeEach(() => {
  mockSearch = new URLSearchParams('');
  invalidateOffersCache(undefined);
  invalidateOffersCache(99);
});

afterEach(() => {
  invalidateOffersCache(undefined);
  invalidateOffersCache(99);
});

describe('ProfileOffersSection – odkaz na recenzie', () => {
  it('cudzí profil: návratová adresa je obyčajný profil, bez zvýraznenia a otočenia karty', () => {
    setOffersToCache(makeOffersCacheKey(99), [makeOffer(55), makeOffer(56)]);

    render(
      <ProfileOffersSection
        activeTab="offers"
        isOtherUserProfile
        ownerUserId={99}
        ownerProfileIdentifier="peter"
      />,
    );

    expect(reviewsLinkOf(55)).toEqual({
      path: '/dashboard/offers/55/reviews',
      returnTo: '/dashboard/users/peter',
    });
    expect(reviewsLinkOf(56)).toEqual({
      path: '/dashboard/offers/56/reviews',
      returnTo: '/dashboard/users/peter',
    });
  });

  it('cudzí profil bez slugu: profil sa otvorí podľa čísla používateľa', () => {
    setOffersToCache(makeOffersCacheKey(99), [makeOffer(55)]);

    render(<ProfileOffersSection activeTab="offers" isOtherUserProfile ownerUserId={99} />);

    expect(reviewsLinkOf(55).returnTo).toBe('/dashboard/users/99');
  });

  it('vlastný profil: návratová adresa je vrch vlastného profilu', () => {
    setOffersToCache(makeOffersCacheKey(undefined), [makeOffer(55)]);

    render(<ProfileOffersSection activeTab="offers" />);

    expect(reviewsLinkOf(55)).toEqual({
      path: '/dashboard/offers/55/reviews',
      returnTo: '/dashboard/profile',
    });
  });
});
