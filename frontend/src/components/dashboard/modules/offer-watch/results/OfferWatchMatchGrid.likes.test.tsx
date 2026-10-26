import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfferWatchMatchGrid from './OfferWatchMatchGrid';
import ProfileOfferCard from '../../profile/ProfileOfferCard';
import { setOfferLikeState } from '../../profile/offerLikesApi';
import type { Offer } from '../../profile/profileOffersTypes';
import type { OfferWatchMatch } from '../types';
import { SearchOffersTab } from '@/components/search/SearchOffersTab';
import sk from '../../../../../../messages/sk.json';
import cs from '../../../../../../messages/cs.json';
import en from '../../../../../../messages/en.json';
import de from '../../../../../../messages/de.json';
import pl from '../../../../../../messages/pl.json';
import hu from '../../../../../../messages/hu.json';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockTranslate }),
}));
jest.mock('../../profile/offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role='img' aria-label={alt} />,
}));
jest.mock('../../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));

const dictionaries = { sk, cs, en, de, pl, hu };
type Locale = keyof typeof dictionaries;
let mockLocale: Locale = 'sk';
const NOW = Date.parse('2026-10-14T12:00:00Z');
const WATCH_UPDATED_AT = '2026-10-14T00:00:00Z';
const HEART_PATH_PREFIX = 'M20.84 4.61';
const mockedLikeApi = jest.mocked(setOfferLikeState);

/** Resolve real app messages, with the same string-only fallback used by the context. */
function mockTranslate(key: string, fallback: string): string {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, dictionaries[mockLocale]);
  return typeof value === 'string' ? value : fallback;
}

/** Keep API-derived Like data so front opt-out cannot hide the required back summary. */
function makeMatch(overrides: Partial<Offer> = {}, createdAt = '2026-10-14T11:30:00Z'): OfferWatchMatch {
  return {
    createdAt,
    offer: {
      id: 61,
      category: 'Domácnosť',
      subcategory: 'Maliarske práce',
      description: 'Precízne maľovanie izieb',
      detailed_description: 'Detailný opis služby zostáva na zadnej strane.',
      location: 'Bratislava',
      price_from: 25,
      price_currency: '€',
      experience: { value: 4, unit: 'years' },
      tags: ['interiér', 'stena'],
      user_display_name: 'Ada Maliarka',
      user_id: 21,
      owner_slug: 'ada-maliarka',
      owner_user_type: 'individual',
      reviews_count: 2,
      average_rating: 4.5,
      likes_count: 987,
      is_liked_by_me: true,
      ...overrides,
    },
  };
}

/** Require no front action and exactly one noninteractive back summary, even while CSS-hidden. */
function expectReadOnlyLikes(card: HTMLElement, count = 987, liked = true) {
  const queries = within(card);
  const label = mockTranslate('skills.likes', 'Páči sa mi to');
  const { front, back } = cardFaces(card);
  expect(queries.queryByRole('button', { name: label, hidden: true })).not.toBeInTheDocument();
  expect(within(front).queryByText(label)).not.toBeInTheDocument();
  expect(front.querySelector(`svg path[d^="${HEART_PATH_PREFIX}"]`)).toBeNull();
  expect(queries.getAllByText(label, { exact: true })).toHaveLength(1);
  const summary = within(back).getByText(label, { exact: true }).parentElement!;
  const formattedCount = new Intl.NumberFormat('sk-SK').format(Math.max(0, count));
  expect(within(summary).getByText((_text, element) => element?.tagName === 'SPAN' && element.textContent === formattedCount)).toBeInTheDocument();
  expect(summary.querySelector('svg')).toHaveAttribute('fill', liked ? 'currentColor' : 'none');
  expect(summary.closest('button, a, [role="button"]')).toBeNull();
  expect(summary.querySelector('button, a, [role="button"], [tabindex]')).toBeNull();
  expect(back.querySelectorAll(`svg path[d^="${HEART_PATH_PREFIX}"]`)).toHaveLength(1);
  expect(card.querySelector('[aria-pressed]')).toBeNull();
  expect(card.querySelector('[data-default-cta], [data-message-cta]')).toBeNull();
  fireEvent.click(summary);
  expect(mockedLikeApi).not.toHaveBeenCalled();
}

/** Get both real faces via their flip controls, without mocking the shared card. */
function cardFaces(card: HTMLElement) {
  const buttons = within(card).getAllByRole('button', { name: 'Otočiť', hidden: true });
  return {
    front: buttons[0].closest('[style="min-height: 100%;"]') as HTMLElement,
    back: buttons[1].closest('[style="min-height: 100%;"]') as HTMLElement,
  };
}

/** Assert visibility independently of text that exists in both mounted card faces. */
function expectFace(card: HTMLElement, flipped: boolean) {
  const { front, back } = cardFaces(card);
  expect(front).toHaveClass(flipped ? 'hidden' : 'block');
  expect(back).toHaveClass(flipped ? 'block' : 'hidden');
}

/** JSDOM does not load Tailwind CSS, so target the face selected by its real class. */
function activeFlip(card: HTMLElement) {
  const { front, back } = cardFaces(card);
  return within(front.classList.contains('block') ? front : back)
    .getByRole('button', { name: 'Otočiť' });
}

describe('Offer Watch result cards: front-only Like opt-out and read-only back summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'sk';
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('removes the front action while retaining the back Like count of an offer', () => {
    render(<OfferWatchMatchGrid matches={[makeMatch()]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    const card = screen.getByRole('article');
    expectReadOnlyLikes(card);
    expectFace(card, false);
    fireEvent.click(activeFlip(card));
    expectFace(card, true);
    expectReadOnlyLikes(card);
  });

  const variants = (Object.keys(dictionaries) as Locale[]).flatMap((locale) =>
    [false, true].flatMap((isSeeking) =>
      ['individual', 'company'].flatMap((ownerUserType) =>
        [false, true].map((liked) => ({ locale, isSeeking, ownerUserType, liked })),
      ),
    ),
  );

  it.each(variants)(
    'keeps front action absent and back summary intact: $locale seeking=$isSeeking owner=$ownerUserType liked=$liked',
    ({ locale, isSeeking, ownerUserType, liked }) => {
      mockLocale = locale;
      const match = makeMatch({
        is_seeking: isSeeking,
        owner_user_type: ownerUserType,
        is_liked_by_me: liked,
        urgency: 'high',
        duration_type: 'project',
      });
      render(<OfferWatchMatchGrid matches={[match]} watchUpdatedAt={WATCH_UPDATED_AT} />);
      const card = screen.getByRole('article');
      expectReadOnlyLikes(card, 987, liked);
      expect(within(card).getByRole('img', { name: match.offer.description })).toBeInTheDocument();
      expect(within(card).getByText('25 €')).toBeInTheDocument();
      expect(within(card).getByText('Bratislava')).toBeInTheDocument();
      expect(within(card).getByText(mockTranslate('offerWatchResults.newBadge', 'Nové'))).toBeInTheDocument();
      if (ownerUserType === 'company') expect(within(card).getByText('PRO')).toBeInTheDocument();
      else expect(within(card).queryByText('PRO')).not.toBeInTheDocument();

      fireEvent.click(activeFlip(card));
      expectFace(card, true);
      expectReadOnlyLikes(card, 987, liked);
      expect(within(card).getByText(match.offer.detailed_description!)).toBeInTheDocument();
      expect(within(card).getByText('#interiér')).toBeInTheDocument();
      if (isSeeking) {
        expect(within(card).getByText(mockTranslate('skills.urgencyHigh', 'Vysoká'))).toBeInTheDocument();
        expect(within(card).getByText(mockTranslate('skills.durationProject', 'Zákazka'))).toBeInTheDocument();
      } else {
        expect(within(card).getByText('4.5 (2)')).toBeInTheDocument();
      }
      fireEvent.click(activeFlip(card));
      expectFace(card, false);
      expectReadOnlyLikes(card, 987, liked);
    },
  );

  it.each([false, true].flatMap((isSeeking) => [0, -20, 1234].map((likesCount) => ({ isSeeking, likesCount }))))(
    'preserves normalized read-only count $likesCount for seeking=$isSeeking',
    ({ isSeeking, likesCount }) => {
      render(<OfferWatchMatchGrid matches={[makeMatch({ is_seeking: isSeeking, likes_count: likesCount })]} watchUpdatedAt={WATCH_UPDATED_AT} />);
      const card = screen.getByRole('article');
      fireEvent.click(activeFlip(card));
      expectFace(card, true);
      expectReadOnlyLikes(card, likesCount);
      fireEvent.keyDown(within(card).getByText(mockTranslate('skills.likes', 'Páči sa mi to')), { key: 'Enter' });
      expect(mockedLikeApi).not.toHaveBeenCalled();
      expectFace(card, true);
    },
  );

  it('keeps independent flip state and stable identity after refresh/reordering', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const first = makeMatch();
    const second = makeMatch({ id: 62, description: 'Druhý výsledok', user_display_name: 'Bea' });
    const { rerender } = render(<OfferWatchMatchGrid matches={[first, second]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    let cards = screen.getAllByRole('article');
    const flip = activeFlip(cards[0]);
    flip.focus();
    await user.keyboard('{Enter}');
    expectFace(cards[0], true);
    expectFace(cards[1], false);
    fireEvent.click(activeFlip(cards[1]));
    expectFace(cards[1], true);
    fireEvent.click(activeFlip(cards[0]));
    expectFace(cards[0], false);

    rerender(<OfferWatchMatchGrid matches={[{ ...second, offer: { ...second.offer, likes_count: 999 } }, first]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByRole('img', { name: 'Druhý výsledok' })).toBeInTheDocument();
    expectFace(cards[0], true);
    expectFace(cards[1], false);
    expectReadOnlyLikes(cards[0], 999);
    expectReadOnlyLikes(cards[1]);
    expect(within(cards[0]).getByText('999')).toBeInTheDocument();
  });

  it.each([
    { owner_slug: '  ada-slug  ', user_id: 21, expected: 'ada-slug' },
    { owner_slug: ' ', user_id: 21, expected: '21' },
    { owner_slug: null, user_id: 0, expected: '0' },
    { owner_slug: '', user_id: undefined, expected: null },
  ])('opens the author profile by dashboard state with the highlight ($expected)', ({ expected, ...overrides }) => {
    const opened: Array<{ identifier?: string; highlightId?: number }> = [];
    const listener = (event: Event) => opened.push((event as CustomEvent).detail);
    window.addEventListener('goToUserProfile', listener);
    try {
      render(<OfferWatchMatchGrid matches={[makeMatch(overrides)]} watchUpdatedAt={WATCH_UPDATED_AT} />);
      fireEvent.click(screen.getByRole('button', { name: /Ada Maliarka/ }));
      expect(opened).toEqual(expected !== null ? [{ identifier: expected, highlightId: 61 }] : []);
      expectReadOnlyLikes(screen.getByRole('article'));
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }
  });

  it('retains the translated fallback author when API display name is absent', () => {
    mockLocale = 'en';
    render(<OfferWatchMatchGrid matches={[makeMatch({ user_display_name: ' ', owner_user_type: null })]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    expect(screen.getByRole('button', { name: /User/ })).toBeInTheDocument();
    expectReadOnlyLikes(screen.getByRole('article'));
  });

  it('expires only fresh badges on the minute tick and clears the timer on unmount', () => {
    const clearInterval = jest.spyOn(window, 'clearInterval');
    const fresh = makeMatch({}, '2026-10-14T00:00:30Z');
    const preexisting = makeMatch({ id: 62 }, WATCH_UPDATED_AT);
    const { unmount } = render(<OfferWatchMatchGrid matches={[fresh, preexisting]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    expect(screen.getAllByText(mockTranslate('offerWatchResults.newBadge', 'Nové'))).toHaveLength(1);
    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.queryByText(mockTranslate('offerWatchResults.newBadge', 'Nové'))).not.toBeInTheDocument();
    screen.getAllByRole('article').forEach((card) => expectReadOnlyLikes(card));
    unmount();
    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    clearInterval.mockRestore();
  });

  it('renders an empty grid without cards and cleans up its freshness interval', () => {
    const { unmount } = render(<OfferWatchMatchGrid matches={[]} watchUpdatedAt={WATCH_UPDATED_AT} />);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(mockedLikeApi).not.toHaveBeenCalled();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not globally suppress default Like when shared cards coexist outside results', async () => {
    mockedLikeApi.mockResolvedValue({ offer_id: 61, likes_count: 988, is_liked_by_me: true });
    const match = makeMatch({ is_liked_by_me: false });
    render(
      <>
        <OfferWatchMatchGrid matches={[match]} watchUpdatedAt={WATCH_UPDATED_AT} />
        <section aria-label='Existing profile/search card'>
          <ProfileOfferCard offer={match.offer} accountType='personal' t={mockTranslate}
            isFlipped={false} onToggleFlip={jest.fn()} isOtherUserProfile={true} />
        </section>
      </>,
    );
    expectReadOnlyLikes(screen.getByRole('article'), 987, false);
    const shared = screen.getByRole('region', { name: 'Existing profile/search card' });
    const likeLabel = mockTranslate('skills.likes', 'Páči sa mi to');
    const like = within(shared).getByRole('button', { name: likeLabel });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    await act(async () => fireEvent.click(like));
    expect(mockedLikeApi).toHaveBeenCalledTimes(1);
    expect(mockedLikeApi).toHaveBeenCalledWith(61, true);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(within(shared).getByText('988')).toBeInTheDocument();
    const watchSummary = within(screen.getByRole('article')).getByText(likeLabel).parentElement!;
    expect(watchSummary).toHaveTextContent('987');
    expect(watchSummary.querySelector('svg')).toHaveAttribute('fill', 'none');
  });

  it.each([false, true])('retains Like in the real standalone search caller (seeking=%s)', async (isSeeking) => {
    mockedLikeApi.mockResolvedValue({ offer_id: 61, likes_count: 988, is_liked_by_me: true });
    const offer = makeMatch({ is_seeking: isSeeking, is_liked_by_me: false }).offer;
    const commonProps = {
      t: mockTranslate,
      trimmedQ: 'maľovanie',
      loading: false,
      results: [offer],
      onToggleFlip: jest.fn(),
      minRating: null,
      onMinRatingChange: jest.fn(),
      priceMin: '',
      onPriceMinChange: jest.fn(),
      priceMax: '',
      onPriceMaxChange: jest.fn(),
      offerType: 'all' as const,
      onOfferTypeChange: jest.fn(),
      hasActiveFilters: false,
      onClearAllFilters: jest.fn(),
      page: 1,
      totalPages: 1,
      onPageChange: jest.fn(),
    };
    const { rerender } = render(<SearchOffersTab {...commonProps} flippedCards={new Set()} />);
    const likeLabel = mockTranslate('skills.likes', 'Páči sa mi to');
    const like = screen.getByRole('button', { name: likeLabel });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    await act(async () => fireEvent.click(like));
    expect(mockedLikeApi).toHaveBeenCalledWith(61, true);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('988')).toBeInTheDocument();
    const flip = screen.getAllByRole('button', { name: 'Otočiť' })[0];
    fireEvent.click(flip);
    expect(commonProps.onToggleFlip).toHaveBeenCalledWith('61');
    rerender(<SearchOffersTab {...commonProps} flippedCards={new Set(['61'])} />);
    expect(screen.getByText(offer.detailed_description!)).toBeInTheDocument();
    expect(screen.getByText('988')).toBeInTheDocument();
    expect(screen.getAllByText(likeLabel)).toHaveLength(1);
    expect(mockedLikeApi).toHaveBeenCalledTimes(1);
  });
});
