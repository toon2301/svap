/**
 * Zvýraznená karta v desktopovej sekcii ponúk (vlastný profil).
 *
 * Scroll: pri druhom otvorení profilu z upozornenia príde zoznam ponúk z cache
 * hneď po mounte a zvýraznenie až o chvíľu neskôr (`useDashboardHighlighting`
 * ho najprv zhodí a potom obnoví). Scroll efekt preto musí reagovať aj na zmenu
 * `highlightedSkillId`, nielen na zmenu `offers` – inak sa na kartu neodscrolluje.
 *
 * Otočenie: karta sa otočí na zadnú stranu LEN pri `side=back` v adrese (návrat
 * z recenzií). Samotné zvýraznenie z upozornenia ju má nechať na prednej strane.
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

// Karta má vlastné testy; tu ide o obálku okolo nej (ref na scroll a stav otočenia).
jest.mock('../ProfileOfferCard', () => ({
  __esModule: true,
  default: ({
    offer,
    isFlipped,
    isHighlighted,
  }: {
    offer: { id: number };
    isFlipped: boolean;
    isHighlighted: boolean;
  }) => (
    <div
      data-testid={`offer-card-${offer.id}`}
      data-flipped={String(isFlipped)}
      data-highlighted={String(isHighlighted)}
    />
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

function Section({ highlightedSkillId }: { highlightedSkillId: number | null }) {
  return <ProfileOffersSection activeTab="offers" highlightedSkillId={highlightedSkillId} />;
}

const scrolled: Array<{ element: Element; options: boolean | ScrollIntoViewOptions | undefined }> = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  mockSearch = new URLSearchParams('');
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function scrollIntoViewRecorder(
    this: Element,
    options?: boolean | ScrollIntoViewOptions,
  ) {
    scrolled.push({ element: this, options });
  };
  invalidateOffersCache(undefined);
  setOffersToCache(makeOffersCacheKey(undefined), [makeOffer(55), makeOffer(56)]);
});

afterEach(() => {
  invalidateOffersCache(undefined);
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe('ProfileOffersSection – zvýraznená karta: scroll', () => {
  it('poscrolluje na kartu, keď zvýraznenie príde až po ponukách z cache', () => {
    const { rerender } = render(<Section highlightedSkillId={null} />);

    expect(screen.getByTestId('offer-card-55')).toBeInTheDocument();
    expect(scrolled).toHaveLength(0);

    rerender(<Section highlightedSkillId={55} />);

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toContainElement(screen.getByTestId('offer-card-55'));
    expect(scrolled[0].element).not.toContainElement(screen.getByTestId('offer-card-56'));
    expect(scrolled[0].options).toEqual({ behavior: 'smooth', block: 'center' });
  });

  it('poscrolluje aj vtedy, keď je zvýraznenie od začiatku a ponuky sa donačítajú', () => {
    render(<Section highlightedSkillId={55} />);

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toContainElement(screen.getByTestId('offer-card-55'));
  });

  it('po zhasnutí zvýraznenia už neposcrolluje znova', () => {
    const { rerender } = render(<Section highlightedSkillId={null} />);

    rerender(<Section highlightedSkillId={55} />);
    expect(scrolled).toHaveLength(1);

    rerender(<Section highlightedSkillId={null} />);
    expect(scrolled).toHaveLength(1);
  });

  it('bez zvýraznenia neposcrolluje nikam', () => {
    render(<Section highlightedSkillId={null} />);

    expect(screen.getByTestId('offer-card-56')).toBeInTheDocument();
    expect(scrolled).toHaveLength(0);
  });
});

describe('ProfileOffersSection – zvýraznená karta: otočenie', () => {
  it('nechá zvýraznenú kartu na prednej strane, keď v adrese nie je side=back', () => {
    mockSearch = new URLSearchParams('highlight=55');

    render(<Section highlightedSkillId={55} />);

    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-flipped', 'false');
    expect(screen.getByTestId('offer-card-56')).toHaveAttribute('data-flipped', 'false');
  });

  it('otočí zvýraznenú kartu na zadnú stranu pri side=back (návrat z recenzií)', () => {
    mockSearch = new URLSearchParams('highlight=55&side=back');

    render(<Section highlightedSkillId={55} />);

    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-flipped', 'true');
    expect(screen.getByTestId('offer-card-56')).toHaveAttribute('data-flipped', 'false');
  });
});
