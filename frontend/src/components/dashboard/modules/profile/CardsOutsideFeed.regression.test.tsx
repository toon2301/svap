/**
 * Karty MIMO Nástenky ostávajú nedotknuté.
 *
 * Nástenka má odteraz jednu spoločnú kartu zdieľaného obsahu
 * (`feed/SharedContentPreviewCard`). Do profilu ani do vyhľadávania NESIAHA:
 * tamojšie karty stoja na dátach, ktoré snapshot vo feede vôbec nenesie
 * (galéria, recenzie, otváracie hodiny, popis), takže zjednotenie s nimi by
 * z profilu ubralo obsah.
 *
 * Tento súbor to drží dvoma spôsobmi naraz: karty sa vykreslia a musia ukázať
 * svoje vlastné veci BEZ akejkoľvek stopy feedovej karty, a ich zdroj nesmie
 * feedovú kartu vôbec importovať.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileOfferCard from './ProfileOfferCard';
import { ProfileOfferCardMobile } from './ProfileOfferCardMobile';
import { PortfolioCard } from './PortfolioCard';
import type { Offer } from './profileOffersTypes';
import type { PortfolioItem } from './portfolioTypes';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    locale: 'sk',
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="offer-image-carousel">{alt}</div>,
}));

jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../shared/BlurredContainImage', () => ({
  __esModule: true,
  default: () => <div data-testid="cover" />,
}));

const offer: Offer = {
  id: 1,
  category: 'Design',
  subcategory: 'Logo',
  description: 'Logo design',
  images: [],
  price_from: null,
  price_currency: 'EUR',
  is_seeking: false,
};

const portfolioItem = {
  id: 9,
  title: 'Rekonštrukcia kúpeľne',
  category: 'remeslo',
  cover_image: { thumbnail_url: 'https://cdn.test/a.webp' },
  likes_count: 0,
  is_liked_by_me: false,
} as PortfolioItem;

/** Značky, ktorými sa dá feedová karta spoznať kdekoľvek v strome. */
const FEED_CARD_TESTIDS = [
  'feed-shared-card',
  'feed-shared-card-kind',
  'feed-shared-card-price',
  'feed-shared-card-owner',
  'feed-shared-compact-preview',
  'feed-shared-post-preview',
  'feed-shared-unavailable',
];

function expectNoFeedCard() {
  for (const testId of FEED_CARD_TESTIDS) {
    expect(screen.queryByTestId(testId)).toBeNull();
  }
}

describe('karty v profile nepoužívajú kartu z Nástenky', () => {
  it('keeps ProfileOfferCard on its own front side', () => {
    render(
      <ProfileOfferCard
        offer={offer}
        accountType="personal"
        t={(_key: string, fallback: string) => fallback}
        isFlipped={false}
        onToggleFlip={jest.fn()}
      />,
    );

    // Vlastný obsah karty ostáva…
    expect(screen.getAllByText('Ponúkam').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logo design').length).toBeGreaterThan(0);
    // …a nič z feedovej karty sa sem nedostalo.
    expectNoFeedCard();
  });

  it('keeps ProfileOfferCardMobile on its own front side', () => {
    render(
      <ProfileOfferCardMobile
        offer={offer}
        accountType="personal"
        isTapped={false}
        onCardClick={jest.fn()}
      />,
    );

    expect(screen.getByText('Ponúkam')).toBeInTheDocument();
    expectNoFeedCard();
  });

  it('keeps PortfolioCard as it was', () => {
    render(<PortfolioCard item={portfolioItem} categoryLabel="Remeslo" />);

    expect(screen.getByTestId('portfolio-grid-card')).toBeInTheDocument();
    expect(screen.getByText('Rekonštrukcia kúpeľne')).toBeInTheDocument();
    expectNoFeedCard();
  });
});

describe('zdroj kariet v profile', () => {
  it('never imports the feed card', () => {
    // Vykreslenie ukáže LEN to, čo daný stav karty práve nakreslí; toto
    // uzatvára aj vetvy, do ktorých sa test nedostal.
    for (const file of [
      'ProfileOfferCard.tsx',
      'ProfileOfferCardMobile.tsx',
      'PortfolioCard.tsx',
      'offerCard/OfferCardFront.tsx',
      'offerCard/OfferCardBack.tsx',
    ]) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect(source).not.toContain('SharedContentPreviewCard');
      expect(source).not.toContain('sharedContentCard');
    }
  });
});
