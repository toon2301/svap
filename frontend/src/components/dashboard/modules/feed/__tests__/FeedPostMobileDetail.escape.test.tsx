/**
 * Zatváranie mobilnej obrazovky detailu: Escape podľa poradia vrstiev, tlačidlo X, avatar autora a fokus.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49). Obrazovka si Escape, fokus
 * dovnútra a poradie vrstiev rieši cez `useFeedDialog` a všetky okná, ktoré otvára (zoznam lajkujúcich, zdieľanie,
 * nahlásenie, úprava, potvrdenie zmazania, prehliadač fotky z repostu), kreslí vo vlastnom strome. Escape preto
 * zatvára vždy len vrchnú vrstvu a obrazovku až druhé stlačenie. Existujúce testy overujú len tlačidlo X; Escape, poradie
 * vrstiev, fokus ani zatvorenie obrazovky pri prekliku na profil autora nestráži nič (K46: prežilo päť skúšobných
 * pokazení). Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM, `data-testid`, klávesnica
 * a udalosť `goToUserProfile`), takže musia prejsť bez úpravy aj po delení súboru.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, listFeedPostLikers, type FeedPost } from '@/lib/feedApi';

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
  useRouter: () => ({ push: jest.fn() }),
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedLikers = listFeedPostLikers as jest.MockedFunction<typeof listFeedPostLikers>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const owner = {
  id: 21,
  display_name: 'Peter Kováč',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const photo = (id: number) => ({
  id,
  status: 'approved',
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
});

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

/** Zdieľaný príspevok číslo 9 s fotkou; klik na fotku otvorí prehliadač pôvodného príspevku. */
const repostWithPhoto = () =>
  makePost({
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner,
      owner_display_name: 'Peter Kováč',
      thumbnail_url: 'http://api.test/shared-9.webp',
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  });

const originalPost = () => makePost({ id: 9, author: owner, images: [photo(41)], can_manage: false });

async function renderDetail(post: FeedPost = makePost(), onClose: () => void = jest.fn()) {
  render(<FeedPostMobileDetail post={post} onClose={onClose} />);
  return screen.findByTestId('feed-mobile-detail');
}

async function chooseFromMenu(itemTestId: string) {
  await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
  await userEvent.click(await screen.findByTestId(itemTestId));
}

/** Okná, ktoré obrazovka otvára nad sebou: názov, otvorenie a `data-testid` okna. */
const WINDOWS: Array<[string, () => Promise<void>, string]> = [
  [
    'zoznam lajkujúcich',
    () => userEvent.click(screen.getByTestId('feed-mobile-detail-like-count')),
    'feed-likers-dialog',
  ],
  [
    'okno zdieľania',
    () => userEvent.click(screen.getByTestId('feed-mobile-detail-share')),
    'feed-share-modal',
  ],
  ['okno nahlásenia', () => chooseFromMenu('feed-mobile-detail-report'), 'feed-report-modal'],
  ['okno úpravy', () => chooseFromMenu('feed-mobile-detail-edit'), 'feed-post-edit-modal'],
  [
    'potvrdenie zmazania',
    () => chooseFromMenu('feed-mobile-detail-delete'),
    'feed-mobile-detail-delete-confirm',
  ],
];

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPost.mockReset();
  mockedLikers.mockReset();
  mockedLikers.mockResolvedValue({ results: [], next: null, previous: null, count: 0 } as never);
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('Escape na mobilnej obrazovke detailu', () => {
  it('Escape zatvorí obrazovku a zavolá onClose jedenkrát', async () => {
    const onClose = jest.fn();
    await renderDetail(makePost(), onClose);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape zatvorí najprv prehliadač fotky z repostu a až druhé stlačenie obrazovku', async () => {
    mockedGetPost.mockResolvedValue(originalPost());
    const onClose = jest.fn();
    await renderDetail(repostWithPhoto(), onClose);
    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));
    await screen.findByTestId('feed-photo-viewer');

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(WINDOWS)(
    'Escape zatvorí najprv %s otvorené nad obrazovkou a až druhé stlačenie obrazovku',
    async (_name, openWindow, testId) => {
      const onClose = jest.fn();
      await renderDetail(makePost(), onClose);
      await openWindow();
      await screen.findByTestId(testId);

      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByTestId(testId)).not.toBeInTheDocument());
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it('po otvorení sa fokus presunie dovnútra obrazovky', async () => {
    const detail = await renderDetail();

    await waitFor(() => expect(detail).toContainElement(document.activeElement as HTMLElement));

    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('tlačidlo X a avatar autora na mobilnej obrazovke detailu', () => {
  it('tlačidlo X zavolá onClose jedenkrát', async () => {
    const onClose = jest.fn();
    await renderDetail(makePost(), onClose);

    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ťuk na avatar autora najprv zatvorí obrazovku a potom otvorí profil autora', async () => {
    const calls: string[] = [];
    const handler = (event: Event) => {
      calls.push(`profil:${(event as CustomEvent).detail?.identifier}`);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      await renderDetail(makePost(), () => {
        calls.push('zatvorenie');
      });
      expect(screen.getByTestId('feed-mobile-detail-author')).toBeEnabled();

      await userEvent.click(screen.getByTestId('feed-mobile-detail-author'));

      expect(calls).toEqual(['zatvorenie', 'profil:jana']);
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });

  it('avatar autora bez profilu je vypnutý a ťuk naň nič neotvorí ani nezatvorí', async () => {
    const handler = jest.fn();
    window.addEventListener('goToUserProfile', handler);
    try {
      const onClose = jest.fn();
      await renderDetail(
        makePost({ author: { ...author, id: 0, slug: '', display_name: 'Bývalý používateľ' } }),
        onClose,
      );
      const avatar = screen.getByTestId('feed-mobile-detail-author');
      expect(avatar).toBeDisabled();

      await userEvent.click(avatar);

      expect(handler).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });
});
