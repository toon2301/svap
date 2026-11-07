/**
 * Vstupná animácia zoznamu Nástenky (nález 276).
 *
 * `FeedList` sa pri každom prepnutí obrazovky (profil → Nástenka, Správy → Nástenka…) pripojí znova. Kontajner aj
 * každá karta (a v nej ešte samotný článok) mali vstupnú animáciu z priehľadnosti 0, takže po kostrách kariet
 * nasledovala krátka prázdna plocha a približne 300 ms vyfadovanie celého zoznamu (zmerané v prehliadači, mobil).
 * Zoznam, ktorý sa práve zobrazil, sa teraz ukáže hneď; animujú sa len príspevky, ktoré pribudnú neskôr (nový
 * príspevok, donačítanie). Test beží s pravou knižnicou `framer-motion`: globálny mock animácie vypína a vlastnosť
 * `initial` by sa v ňom nedala overiť.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedList from '../FeedList';
import { emitFeedPostCreated } from '../feedShareEvents';
import { listFeedPosts } from '@/lib/feedApi';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('framer-motion', () => jest.requireActual('framer-motion'));

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const mockedListFeedPosts = listFeedPosts as jest.MockedFunction<typeof listFeedPosts>;

/** Príspevok s minimom polí, ktoré karta potrebuje na vykreslenie. */
function makePost(id: number, caption: string): FeedPost {
  return {
    id,
    post_type: 'free_post',
    caption,
    author: { id: 10, display_name: 'Jana Nováková', slug: 'jana', user_type: 'individual', avatar_url: null },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: new Date().toISOString(),
  };
}

/** Priehľadnosť prvku tak, ako ju vidí prehliadač (inline štýl od `framer-motion` aj z tried). */
function opacityOf(element: HTMLElement): number {
  return Number(window.getComputedStyle(element).opacity || '1');
}

/** Všetky prvky od karty po kontajner zoznamu: žiadny z nich nesmie byť na začiatku priehľadný. */
function ancestorsUpToList(card: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  for (let node: HTMLElement | null = card; node; node = node.parentElement) {
    chain.push(node);
    if (node.getAttribute('data-testid') === 'feed-list') break;
  }
  return chain;
}

describe('vstupná animácia zoznamu Nástenky', () => {
  beforeEach(() => {
    mockedListFeedPosts.mockReset();
    mockedListFeedPosts.mockResolvedValue({
      results: [makePost(1, 'Prvý príspevok'), makePost(2, 'Druhý príspevok')],
      next: null,
      previous: null,
    });
  });

  it('zoznam, ktorý sa práve zobrazil, je hneď celý viditeľný (bez vyfadovania z priehľadnosti)', async () => {
    render(<FeedList />);

    const cards = await screen.findAllByTestId('feed-post-card');
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      for (const element of ancestorsUpToList(card)) {
        expect(opacityOf(element)).toBe(1);
      }
    }
  });

  it('príspevok, ktorý pribudne neskôr, sa vyfaduje, kým ostatné ostanú viditeľné', async () => {
    render(<FeedList />);
    await screen.findAllByTestId('feed-post-card');

    act(() => {
      emitFeedPostCreated(makePost(3, 'Nový príspevok'));
    });

    await waitFor(() => expect(screen.getAllByTestId('feed-post-card')).toHaveLength(3));
    const [fresh, ...existing] = screen.getAllByTestId('feed-post-card');
    expect(fresh).toHaveTextContent('Nový príspevok');
    expect(opacityOf(fresh)).toBeLessThan(1);
    for (const card of existing) {
      expect(opacityOf(card)).toBe(1);
    }
  });
});
