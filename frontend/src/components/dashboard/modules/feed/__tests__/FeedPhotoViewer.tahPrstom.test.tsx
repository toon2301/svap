/**
 * Prehliadač fotky: ťah prstom v paneli komentárov posúva len zoznam komentárov (nález 376, kolo 3c).
 *
 * Z ručného testu majiteľa (iPhone): pri otvorenej klávesnici sa pri ťahu hore a dole hýbala aj fotka za panelom. Kým je panel
 * komentárov otvorený, preto prehliadač zruší predvolenú akciu ťahu všade mimo posuvného zoznamu komentárov (a na jeho
 * hraniciach). Zatvorený panel nič nezamyká. Detail príspevku sa nemení.
 *
 * jsdom nemá rozloženie, preto sa rozmery zoznamu dodávajú; udalosti ťahu sú obyčajné `Event` s vlastnosťou `touches`.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPhotoViewer from '../FeedPhotoViewer';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
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

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  mockedList.mockResolvedValue({
    results: [
      {
        id: 100,
        text: 'Komentár 1',
        author: autor,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ],
    next: null,
    previous: null,
    count: 1,
  } as never);
});

/** Pošle začiatok dotyku v `y0` a pohyb do `y1`; vráti, či sa predvolená akcia pohybu zrušila. */
function tah(cielovy: HTMLElement, y0: number, y1: number) {
  const zaciatok = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.assign(zaciatok, { touches: [{ clientY: y0 }] });
  cielovy.dispatchEvent(zaciatok);
  const pohyb = new Event('touchmove', { bubbles: true, cancelable: true });
  Object.assign(pohyb, { touches: [{ clientY: y1 }] });
  cielovy.dispatchEvent(pohyb);
  return pohyb.defaultPrevented;
}

function rozmeryZoznamu(zoznam: HTMLElement, scrollTop: number) {
  zoznam.style.overflowY = 'auto';
  Object.defineProperty(zoznam, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(zoznam, 'clientHeight', { value: 300, configurable: true });
  Object.defineProperty(zoznam, 'scrollTop', { value: scrollTop, configurable: true, writable: true });
}

async function otvorPanel() {
  render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={jest.fn()} />);
  await userEvent.click(await screen.findByTestId('feed-photo-viewer-comments'));
  await screen.findByText('Komentár 1');
}

describe('prehliadač fotky bez panela komentárov', () => {
  it('ťah po fotke nič nezruší (zámok je vypnutý)', async () => {
    render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={jest.fn()} />);

    expect(tah(await screen.findByTestId('feed-photo-viewer-frame'), 300, 200)).toBe(false);
  });
});

describe('kým je panel komentárov otvorený', () => {
  it('ťah po fotke za panelom sa zruší, takže sa fotka nehýbe', async () => {
    await otvorPanel();

    expect(tah(screen.getByTestId('feed-photo-viewer-frame'), 300, 200)).toBe(true);
  });

  it('ťah po hlavičke panela a po poli na komentár sa zruší', async () => {
    await otvorPanel();

    expect(tah(screen.getByRole('heading', { name: 'Komentáre' }), 300, 200)).toBe(true);
    expect(tah(screen.getByRole('textbox', { name: 'Napíš komentár...' }), 300, 200)).toBe(true);
  });

  it('krátky zoznam komentárov, ktorý sa celý zmestí, sa nehýbe ani ťahom po komentári', async () => {
    await otvorPanel();

    expect(tah(screen.getByText('Komentár 1'), 300, 200)).toBe(true);
  });

  it('dlhý zoznam komentárov sa v svojom rozsahu posúva, na hraniciach sa ťah zruší', async () => {
    await otvorPanel();
    const komentar = screen.getByText('Komentár 1');
    const zoznam = screen.getByTestId('feed-comments-scroll');

    rozmeryZoznamu(zoznam, 200);
    expect(tah(komentar, 300, 200)).toBe(false);
    expect(tah(komentar, 200, 320)).toBe(false);

    rozmeryZoznamu(zoznam, 0);
    expect(tah(komentar, 200, 320)).toBe(true);
    expect(tah(komentar, 300, 200)).toBe(false);

    rozmeryZoznamu(zoznam, 700);
    expect(tah(komentar, 300, 200)).toBe(true);
    expect(tah(komentar, 200, 320)).toBe(false);
  });

  it('potiahnutie hlavičky panela nadol ho stále zatvorí (zámok ruší len predvolenú akciu ťahu)', async () => {
    await otvorPanel();
    const hlavicka = screen.getByTestId('feed-photo-comments-drag');

    fireEvent.touchStart(hlavicka, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(hlavicka, { touches: [{ clientY: 260 }] });
    fireEvent.touchEnd(hlavicka);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-comments-sheet')).not.toBeInTheDocument(),
    );
  });

  it('po zatvorení panela sa zámok vypne a ťah po fotke sa už nezruší', async () => {
    await otvorPanel();
    expect(tah(screen.getByTestId('feed-photo-viewer-frame'), 300, 200)).toBe(true);

    await userEvent.click(screen.getByTestId('feed-photo-comments-handle'));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-comments-sheet')).not.toBeInTheDocument(),
    );

    expect(tah(screen.getByTestId('feed-photo-viewer-frame'), 300, 200)).toBe(false);
  });
});
