/**
 * Okná otvorené z mobilnej obrazovky detailu: zdieľanie, úprava, nahlásenie a zoznam lajkujúcich.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49). Obrazovka otvára päť okien a
 * drží si vlastnú aktuálnu verziu príspevku (`currentPost`): po úprave ju ukazuje na obrazovke, odovzdáva ju oknám
 * zdieľania a úpravy a od karty ju preberá pri každej zmene vlastnosti. Existujúce testy overujú len otvorenie
 * zoznamu lajkujúcich; zdieľanie, uloženú úpravu a prebratie novej verzie nestráži nič (K46: prežilo osem skúšobných
 * pokazení). Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM, `data-testid`), takže
 * musia prejsť bez úpravy aj po delení súboru.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  listFeedPostLikers,
  reportFeedPost,
  shareFeedPost,
  updateFeedPost,
  type FeedPost,
} from '@/lib/feedApi';

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

const mockedShare = shareFeedPost as jest.MockedFunction<typeof shareFeedPost>;
const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;
const mockedReport = reportFeedPost as jest.MockedFunction<typeof reportFeedPost>;
const mockedLikers = listFeedPostLikers as jest.MockedFunction<typeof listFeedPostLikers>;

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: {
      id: 10,
      display_name: 'Jana Nováková',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
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

type DetailCallbacks = {
  onClose: jest.Mock;
  onPostUpdated: jest.Mock;
  onShared: jest.Mock;
};

function detailElement(post: FeedPost, callbacks: DetailCallbacks) {
  return (
    <FeedPostMobileDetail
      post={post}
      onClose={callbacks.onClose}
      onPostUpdated={callbacks.onPostUpdated}
      onShared={callbacks.onShared}
    />
  );
}

async function renderDetail(post: FeedPost = makePost()) {
  const callbacks: DetailCallbacks = {
    onClose: jest.fn(),
    onPostUpdated: jest.fn(),
    onShared: jest.fn(),
  };
  const view = render(detailElement(post, callbacks));
  await screen.findByTestId('feed-mobile-detail');
  return {
    ...callbacks,
    // Karta pod obrazovkou pošle novú verziu príspevku ako zmenenú vlastnosť.
    rerenderWith: (next: FeedPost) => view.rerender(detailElement(next, callbacks)),
  };
}

async function chooseFromMenu(itemTestId: string) {
  await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
  await userEvent.click(await screen.findByTestId(itemTestId));
}

async function saveEditedCaption(text: string) {
  await chooseFromMenu('feed-mobile-detail-edit');
  const input = await screen.findByTestId('feed-post-edit-input');
  await userEvent.clear(input);
  await userEvent.type(input, text);
  await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
  );
}

const caption = () => screen.getByTestId('feed-mobile-detail-caption');

beforeEach(() => {
  jest.clearAllMocks();
  mockedShare.mockReset();
  mockedUpdate.mockReset();
  mockedReport.mockReset();
  mockedLikers.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('zdieľanie z mobilnej obrazovky detailu', () => {
  it('ťuk na zdieľanie otvorí okno s náhľadom príspevku a po odoslaní zavolá server aj onShared a okno sa zavrie', async () => {
    const created = makePost({ id: 99 });
    mockedShare.mockResolvedValue(created);
    const { onShared } = await renderDetail();
    expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-share'));

    const modal = await screen.findByTestId('feed-share-modal');
    expect(within(modal).getByTestId('feed-share-preview')).toHaveTextContent('Text príspevku');

    await userEvent.click(within(modal).getByTestId('feed-share-submit'));

    await waitFor(() => expect(onShared).toHaveBeenCalledTimes(1));
    expect(onShared).toHaveBeenCalledWith(created);
    expect(mockedShare).toHaveBeenCalledTimes(1);
    expect(mockedShare).toHaveBeenCalledWith(7, '', []);
    expect(toast.success).toHaveBeenCalledWith('Príspevok bol zdieľaný.');
    await waitFor(() =>
      expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it('okno zdieľania zatvorené bez odoslania nič nepošle a obrazovka ostane otvorená', async () => {
    const { onClose, onShared } = await renderDetail();
    await userEvent.click(screen.getByTestId('feed-mobile-detail-share'));
    const modal = await screen.findByTestId('feed-share-modal');

    await userEvent.click(within(modal).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument();
    expect(mockedShare).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it('okno zdieľania ukáže po úprave aktuálny text príspevku, nie pôvodný z vlastností', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Upravený text' }));
    await renderDetail();
    await saveEditedCaption('Upravený text');

    await userEvent.click(screen.getByTestId('feed-mobile-detail-share'));

    const preview = await screen.findByTestId('feed-share-preview');
    expect(preview).toHaveTextContent('Upravený text');
    expect(preview).not.toHaveTextContent('Text príspevku');
  });
});

describe('úprava z mobilnej obrazovky detailu', () => {
  it('uložená úprava zavolá server a onPostUpdated, obrazovka ukáže nový text a okno úpravy sa zavrie', async () => {
    const updated = makePost({ caption: 'Upravený text' });
    mockedUpdate.mockResolvedValue(updated);
    const { onClose, onPostUpdated } = await renderDetail();
    expect(caption()).toHaveTextContent('Text príspevku');

    await saveEditedCaption('Upravený text');

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith(7, 'Upravený text');
    expect(onPostUpdated).toHaveBeenCalledTimes(1);
    expect(onPostUpdated).toHaveBeenCalledWith(updated);
    expect(toast.success).toHaveBeenCalledWith('Príspevok bol upravený.');
    expect(caption()).toHaveTextContent('Upravený text');
    expect(caption()).not.toHaveTextContent('Text príspevku');
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('po uloženej úprave sa okno úpravy otvorí znova s novým textom, nie s pôvodným z vlastností', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Upravený text' }));
    await renderDetail();
    await saveEditedCaption('Upravený text');

    await chooseFromMenu('feed-mobile-detail-edit');

    expect(await screen.findByTestId('feed-post-edit-input')).toHaveValue('Upravený text');
  });

  it('okno úpravy zatvorené bez uloženia nič nepošle a text ostane pôvodný', async () => {
    const { onClose, onPostUpdated } = await renderDetail();
    await chooseFromMenu('feed-mobile-detail-edit');
    const modal = await screen.findByTestId('feed-post-edit-modal');

    await userEvent.click(within(modal).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(onPostUpdated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(caption()).toHaveTextContent('Text príspevku');
  });
});

describe('nahlásenie z mobilnej obrazovky detailu', () => {
  it('okno nahlásenia zatvorené bez odoslania nič nepošle a položka v menu ostane aktívna', async () => {
    await renderDetail(makePost({ can_manage: false }));
    await chooseFromMenu('feed-mobile-detail-report');
    const modal = await screen.findByTestId('feed-report-modal');

    await userEvent.click(within(modal).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument();
    expect(mockedReport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
    expect(screen.getByTestId('feed-mobile-detail-report')).toBeEnabled();
    expect(screen.getByTestId('feed-mobile-detail-report')).toHaveTextContent('Nahlásiť príspevok');
  });
});

describe('zoznam lajkujúcich z mobilnej obrazovky detailu', () => {
  it('ťuk na počet lajkov otvorí zoznam lajkujúcich tohto príspevku a jeho zatvorenie nechá obrazovku otvorenú', async () => {
    mockedLikers.mockResolvedValue({
      results: [
        {
          id: 21,
          display_name: 'Peter Kováč',
          slug: 'peter',
          user_type: 'individual',
          avatar_url: null,
        },
      ],
      next: null,
      previous: null,
      count: 1,
    } as never);
    const { onClose } = await renderDetail();
    expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-like-count'));

    const dialog = await screen.findByTestId('feed-likers-dialog');
    expect(await within(dialog).findByTestId('feed-liker-21')).toHaveTextContent('Peter Kováč');
    expect(mockedLikers).toHaveBeenCalledTimes(1);
    expect(mockedLikers.mock.calls[0][0]).toBe(7);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Zavrieť' }));

    expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('aktuálna verzia príspevku na mobilnej obrazovke detailu', () => {
  it('nová verzia príspevku od karty (zmenená vlastnosť) sa premietne do obrazovky aj do okna úpravy', async () => {
    const { rerenderWith } = await renderDetail();
    expect(caption()).toHaveTextContent('Text príspevku');

    rerenderWith(makePost({ caption: 'Text z karty' }));

    await waitFor(() => expect(caption()).toHaveTextContent('Text z karty'));
    expect(caption()).not.toHaveTextContent('Text príspevku');
    await chooseFromMenu('feed-mobile-detail-edit');
    expect(await screen.findByTestId('feed-post-edit-input')).toHaveValue('Text z karty');
  });
});
