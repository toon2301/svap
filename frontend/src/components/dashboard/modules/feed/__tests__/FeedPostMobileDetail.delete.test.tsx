/**
 * Zmazanie príspevku z mobilnej obrazovky detailu.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49). Zmazanie z mobilného detailu
 * nemalo dosiaľ žiadny test (K46: všetkých osem skúšobných pokazení prežilo): potvrdenie, volanie servera, toast
 * úspechu, `onDeleted`, signál o zmazaní, zatvorenie potvrdenia aj obrazovky, toast chyby s obrazovkou, ktorá ostane
 * otvorená, a opakovanie po zlyhaní. Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM,
 * `data-testid`, signál `onFeedPostDeleted`), takže musia prejsť bez úpravy aj po delení súboru.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { onFeedPostDeleted } from '../feedPostDeletedEvents';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { deleteFeedPost, type FeedPost } from '@/lib/feedApi';

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

const mockedDelete = deleteFeedPost as jest.MockedFunction<typeof deleteFeedPost>;

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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function renderDetail(props: Record<string, unknown> = {}) {
  const onClose = jest.fn();
  const onDeleted = jest.fn();
  render(
    <FeedPostMobileDetail
      post={makePost()}
      onClose={onClose}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  await screen.findByTestId('feed-mobile-detail');
  return { onClose, onDeleted };
}

async function openDeleteConfirm() {
  await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-mobile-detail-delete'));
  return screen.findByTestId('feed-mobile-detail-delete-confirm');
}

const confirmAction = () => screen.getByTestId('feed-mobile-detail-delete-confirm-action');

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('zmazanie z mobilnej obrazovky detailu', () => {
  it('po potvrdení sa zavolá server, ukáže toast úspechu, zavolá onDeleted a signál o zmazaní a zavrie sa potvrdenie aj obrazovka', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const deletedSignal = jest.fn();
    const unsubscribe = onFeedPostDeleted(deletedSignal);
    const { onClose, onDeleted } = await renderDetail();

    await openDeleteConfirm();
    await userEvent.click(confirmAction());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    unsubscribe();
    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalledWith('Príspevok bol zmazaný.');
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(7);
    expect(deletedSignal).toHaveBeenCalledTimes(1);
    expect(deletedSignal).toHaveBeenCalledWith(7);
    expect(toast.error).not.toHaveBeenCalled();
    // Rodič obrazovku zatvára (tu atrapa), potvrdenie sa zavrie samo hneď po úspechu.
    expect(screen.queryByTestId('feed-mobile-detail-delete-confirm')).not.toBeInTheDocument();
  });

  it('po zlyhaní ukáže toast chyby, obrazovka aj potvrdenie ostanú otvorené a zmazanie sa dá zopakovať', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('sieť'));
    mockedDelete.mockResolvedValue(undefined);
    const { onClose, onDeleted } = await renderDetail();

    await openDeleteConfirm();
    const action = confirmAction();
    await userEvent.click(action);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Príspevok sa nepodarilo zmazať.'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(screen.getByTestId('feed-mobile-detail-delete-confirm')).toBeInTheDocument();
    // Po zlyhaní už nič neprebieha: tlačidlo je znovu aktívne s pôvodným textom.
    await waitFor(() => expect(action).toBeEnabled());
    expect(action).toHaveTextContent('Vymazať');

    await userEvent.click(action);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockedDelete).toHaveBeenCalledTimes(2);
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('počas mazania je potvrdzovacie tlačidlo aj Zrušiť vypnuté a ukazuje „Vymazávam...“', async () => {
    const pending = deferred();
    mockedDelete.mockReturnValue(pending.promise);
    const { onClose } = await renderDetail();

    const confirm = await openDeleteConfirm();
    await userEvent.click(confirmAction());

    expect(confirmAction()).toBeDisabled();
    expect(confirmAction()).toHaveTextContent('Vymazávam...');
    expect(within(confirm).getByRole('button', { name: 'Zrušiť' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('Zrušiť zavrie potvrdenie a nič nezmaže ani nezatvorí obrazovku', async () => {
    const { onClose, onDeleted } = await renderDetail();

    const confirm = await openDeleteConfirm();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-mobile-detail-delete-confirm')).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it('zlyhanie s odpoveďou 404 ukáže neutrálnu hlášku o nedostupnom obsahu', async () => {
    mockedDelete.mockRejectedValue({ response: { status: 404, data: {} } });
    const { onClose } = await renderDetail();

    await openDeleteConfirm();
    await userEvent.click(confirmAction());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Na tento obsah momentálne nie je možné reagovať.'),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
