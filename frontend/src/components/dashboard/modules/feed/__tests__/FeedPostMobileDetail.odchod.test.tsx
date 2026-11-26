/**
 * Mobilná obrazovka detailu: zatvorenie pri odchode na iné miesto a bežné zatvorenie (nález 360, krok 2 zrušenia starého
 * spôsobu detailu príspevku).
 *
 * Obrazovku, ktorú otvára upozornenie alebo adresa príspevku, zatvára hostiteľ a záznam v histórii vráti krokom späť. Keď
 * ale používateľ z obrazovky prejde na profil alebo na zdroj zdieľaného obsahu, krok späť by navigáciu vzápätí zrušil
 * (rovnaká úvaha ako `keepHistory` pri okne na počítači). Obrazovka preto dostáva voliteľné `onLeave`, ktorým sa zatvára
 * PRED odchodom (tri miesta: meno autora v hlavičke, meno pôvodného autora nad náhľadom a text zdieľaného príspevku);
 * bez neho sa používa `onClose`, takže obrazovka otvorená z karty sa správa ako doteraz. Tlačidlo X, Escape a zmazanie
 * príspevku zatvárajú vždy bežne (`onClose`). Testy idú cez verejné rozhranie obrazovky (vlastnosti, DOM, `data-testid`,
 * atrapa smerovača a udalosť `goToUserProfile` na `window`).
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { deleteFeedPost, type FeedPost } from '@/lib/feedApi';

const mockPush = jest.fn();

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const zdielajuci = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const vlastnik = {
  id: 21,
  display_name: 'Peter Kováč',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

/** Prezdieľaný príspevok číslo 9 od `vlastnik` (text pôvodného príspevku vedie na adresu pôvodného príspevku). */
function prezdielany(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    author: zdielajuci,
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner: vlastnik,
      owner_display_name: 'Peter Kováč',
      thumbnail_url: null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

/** Poradie udalostí: zatvorenia obrazovky, signál `goToUserProfile` (`profil:adresa`) a prechod smerovača. */
let udalosti: string[] = [];
const poslucham = (event: Event) => {
  udalosti.push(`profil:${(event as CustomEvent<{ identifier: string }>).detail.identifier}`);
};

async function vykresli(post: FeedPost, s: { onLeave?: boolean } = {}) {
  const onClose = jest.fn(() => {
    udalosti.push('zatvorenie');
  });
  const onLeave = jest.fn(() => {
    udalosti.push('odchod');
  });
  const view = render(
    <FeedPostMobileDetail post={post} onClose={onClose} onLeave={s.onLeave ? onLeave : undefined} />,
  );
  await screen.findByTestId('feed-mobile-detail');
  return { ...view, onClose, onLeave };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockReset();
  mockPush.mockImplementation(() => {
    udalosti.push('prechod');
  });
  resetOverlayLayers();
  document.body.innerHTML = '';
  udalosti = [];
  window.addEventListener('goToUserProfile', poslucham);
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', poslucham);
});

const ODCHODY: Array<[string, () => Promise<void>, string]> = [
  [
    'ťuk na meno autora v hlavičke',
    async () => {
      await userEvent.click(screen.getByTestId('feed-mobile-detail-author'));
    },
    'profil:jana',
  ],
  [
    'ťuk na meno pôvodného autora nad náhľadom',
    async () => {
      await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('Peter Kováč'));
    },
    'profil:peter',
  ],
  [
    'ťuk na text pôvodného príspevku',
    async () => {
      await userEvent.click(screen.getByTestId('feed-shared-post-preview-open'));
    },
    'prechod',
  ],
];

describe('mobilná obrazovka detailu: zatvorenie pri odchode na iné miesto', () => {
  it.each(ODCHODY)('%s: s onLeave sa obrazovka zatvorí cez onLeave a potom nasleduje odchod', async (_nazov, akcia, ocakavane) => {
    const { onClose, onLeave } = await vykresli(prezdielany(), { onLeave: true });

    await akcia();

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(udalosti).toEqual(['odchod', ocakavane]);
  });

  it.each(ODCHODY)('%s: bez onLeave sa obrazovka zatvorí cez onClose, ako dosiaľ', async (_nazov, akcia, ocakavane) => {
    const { onClose } = await vykresli(prezdielany());

    await akcia();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(udalosti).toEqual(['zatvorenie', ocakavane]);
  });
});

describe('mobilná obrazovka detailu: bežné zatvorenie ostáva pri onClose aj s onLeave', () => {
  it('tlačidlo X zavolá onClose a nie onLeave', async () => {
    const { onClose, onLeave } = await vykresli(prezdielany(), { onLeave: true });

    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('Escape zavolá onClose a nie onLeave', async () => {
    const { onClose, onLeave } = await vykresli(prezdielany(), { onLeave: true });

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('zmazanie vlastného príspevku zavolá onClose a nie onLeave', async () => {
    (deleteFeedPost as jest.Mock).mockResolvedValue(undefined);
    const { onClose, onLeave } = await vykresli(prezdielany({ can_manage: true }), { onLeave: true });

    await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
    await userEvent.click(screen.getByTestId('feed-mobile-detail-delete'));
    const dialog = await screen.findByTestId('feed-mobile-detail-delete-confirm');
    await userEvent.click(within(dialog).getByTestId('feed-mobile-detail-delete-confirm-action'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onLeave).not.toHaveBeenCalled();
  });
});
