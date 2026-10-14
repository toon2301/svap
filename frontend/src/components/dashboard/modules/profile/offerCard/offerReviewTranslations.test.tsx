import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { writeLastManualOfferCountry } from '@/shared/offerCountryPreference';
import ProfileOfferCard from '../ProfileOfferCard';
import { ProfileOfferDetailMobileContent } from '../ProfileOfferDetailMobileContent';
import { setOfferLikeState } from '../offerLikesApi';
import type { Offer } from '../profileOffersTypes';

// Exercise the actual six-language dictionaries, not the shared Slovak-only Jest mock.
jest.unmock('@/contexts/LanguageContext');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('../../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));

// Independent expectations ensure an incorrect dictionary entry cannot validate itself.
const labels = [
  ['sk', 'Hodnotenia', 'Všetky recenzie'],
  ['cs', 'Hodnocení', 'Všechny recenze'],
  ['en', 'Ratings', 'All reviews'],
  ['de', 'Bewertungen', 'Alle Bewertungen'],
  ['pl', 'Oceny', 'Wszystkie opinie'],
  ['hu', 'Értékelések', 'Összes értékelés'],
] as const;
type Locale = (typeof labels)[number][0];
type Surface = 'desktop' | 'mobile';

const REVIEWS_HREF = '/dashboard/offers/7/reviews?returnTo=%2Fdashboard%2Fwatches';
const fixture: Offer = {
  id: 7,
  category: 'Design',
  subcategory: 'Logo',
  description: 'Fixture headline',
  detailed_description: 'Fixture detail',
  is_seeking: false,
  reviews_count: 19,
  average_rating: 4.5,
  likes_count: 137,
  is_liked_by_me: true,
};

type HarnessProps = {
  surface: Surface;
  offer?: Offer;
  reviewsHref?: string | null;
};

/** Keep the actual card mounted while the provider changes its locale. */
function Harness({ surface, offer = fixture, reviewsHref = REVIEWS_HREF }: HarnessProps) {
  const { t, setLocale } = useLanguage();
  const [flipped, setFlipped] = useState(true);
  return <>
    <nav aria-label="Fixture locale controls">
      {labels.map(([locale]) => <button key={locale} onClick={() => setLocale(locale)}>
        locale:{locale}
      </button>)}
    </nav>
    <section aria-label="Fixture card">
      {surface === 'desktop' ? <ProfileOfferCard
        offer={offer} accountType="personal" t={t} reviewsHref={reviewsHref}
        isFlipped={flipped} onToggleFlip={() => setFlipped((value) => !value)}
      /> : <ProfileOfferDetailMobileContent
        offer={offer} accountType="personal" onShowHours={() => {}}
      />}
    </section>
  </>;
}

/** Use a saved locale and manual country so provider hydration makes no IP request. */
function renderCard(locale: Locale, props: HarnessProps) {
  localStorage.setItem('appLocale', locale);
  writeLastManualOfferCountry('SK');
  return render(<LanguageProvider><Harness {...props} /></LanguageProvider>);
}

function card() {
  return within(screen.getByRole('region', { name: 'Fixture card' }));
}

/** jsdom does not load Tailwind; select the active back face by its actual display class. */
function visibleContent(surface: Surface) {
  if (surface === 'mobile') return card();
  const wrapper = screen.getByRole('region', { name: 'Fixture card' }).firstElementChild!;
  const active = Array.from(wrapper.children).find((element) => element.classList.contains('block'));
  expect(active).toBeDefined();
  return within(active as HTMLElement);
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => localStorage.clear());

describe.each(labels)('real %s review translations', (locale, ratings, allReviews) => {
  it.each([
    ['desktop', 0], ['desktop', 19], ['mobile', 0], ['mobile', 19],
  ] as const)('translates the %s rating heading with %s reviews', (surface, reviewsCount) => {
    renderCard(locale, {
      surface,
      offer: { ...fixture, reviews_count: reviewsCount, average_rating: reviewsCount ? 4.5 : null },
    });
    const content = visibleContent(surface);
    expect(content.getByText(ratings, { exact: true })).toBeInTheDocument();
    expect(content.getByText('Fixture detail')).toBeInTheDocument();
    if (reviewsCount > 0) {
      expect(content.getByText('4.5 (19)', { exact: true })).toBeInTheDocument();
      expect(content.queryByText('0.0 (0)', { exact: true })).not.toBeInTheDocument();
    } else {
      expect(content.queryByText('4.5 (19)', { exact: true })).not.toBeInTheDocument();
    }
    if (surface === 'desktop') {
      expect(content.getByRole('link', { name: allReviews, exact: true }))
        .toHaveAttribute('href', REVIEWS_HREF);
    } else {
      // Mobile detail never contained the desktop-only reviews link; do not introduce it here.
      expect(content.queryByRole('link')).not.toBeInTheDocument();
    }
    if (locale !== 'sk') {
      expect(content.queryByText('Hodnotenia', { exact: true })).not.toBeInTheDocument();
      expect(content.queryByText('Všetky recenzie', { exact: true })).not.toBeInTheDocument();
    }
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });

  it.each(['desktop', 'mobile'] as const)('does not add ratings or a review link to %s demands', (surface) => {
    renderCard(locale, { surface, offer: { ...fixture, is_seeking: true } });
    const content = visibleContent(surface);
    expect(content.queryByText(ratings, { exact: true })).not.toBeInTheDocument();
    expect(content.queryByRole('link', { name: allReviews, exact: true })).not.toBeInTheDocument();
    expect(content.getByText('137', { exact: true })).toBeInTheDocument();
    expect(content.getByText('Fixture detail')).toBeInTheDocument();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });

  it('retains the desktop review-link address guard without hiding the rating heading', () => {
    renderCard(locale, { surface: 'desktop', reviewsHref: null });
    const content = visibleContent('desktop');
    expect(content.getByText(ratings, { exact: true })).toBeInTheDocument();
    expect(content.getByText('4.5 (19)', { exact: true })).toBeInTheDocument();
    expect(content.queryByRole('link', { name: allReviews, exact: true })).not.toBeInTheDocument();
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });
});

describe('review labels after changing the locale of an existing card', () => {
  it.each(['desktop', 'mobile'] as const)('updates %s labels without losing card data or its active face', (surface) => {
    renderCard('sk', { surface });
    const heading = visibleContent(surface).getByText('Hodnotenia', { exact: true });
    const reviewLink = surface === 'desktop'
      ? visibleContent(surface).getByRole('link', { name: 'Všetky recenzie', exact: true })
      : null;
    for (const [locale, ratings, allReviews] of labels) {
      fireEvent.click(screen.getByRole('button', { name: `locale:${locale}`, exact: true }));
      const content = visibleContent(surface);
      expect(content.getByText(ratings, { exact: true })).toBe(heading);
      expect(content.getByText('4.5 (19)', { exact: true })).toBeInTheDocument();
      expect(content.getByText('137', { exact: true })).toBeInTheDocument();
      expect(content.getByText('Fixture detail')).toBeInTheDocument();
      if (surface === 'desktop') {
        expect(content.getByRole('link', { name: allReviews, exact: true })).toBe(reviewLink);
        expect(reviewLink).toHaveAttribute('href', REVIEWS_HREF);
      }
      expect(localStorage.getItem('appLocale')).toBe(locale);
    }
    expect(setOfferLikeState).not.toHaveBeenCalled();
  });
});
