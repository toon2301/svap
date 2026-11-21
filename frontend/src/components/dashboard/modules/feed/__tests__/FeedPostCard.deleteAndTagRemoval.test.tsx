/**
 * Zmazanie príspevku a odstránenie vlastného označenia z karty.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Obe akcie majú rovnaký tvar:
 * potvrdenie, volanie servera, po úspechu zatvorenie potvrdenia, toast a odovzdanie rodičovi, po zlyhaní toast chyby
 * s potvrdením, ktoré ostane otvorené a dá sa zopakovať, počas behu vypnuté tlačidlo s textom priebehu a Zrušiť,
 * ktoré server nevolá. Existujúce testy držia hlavne úspešnú cestu; zatvorenie potvrdenia, návrat z „prebieha“ po
 * zlyhaní a text priebehu nestráži nič. Testy idú cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`),
 * takže musia prejsť bez úpravy aj po každom kroku delenia.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostCard from '../FeedPostCard';
import {
  deleteFeedPost,
  removeOwnFeedPostTag,
  type FeedPost,
} from '@/lib/feedApi';
import { onFeedPostDeleted } from '../feedPostDeletedEvents';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
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
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedDelete = deleteFeedPost as jest.MockedFunction<typeof deleteFeedPost>;
const mockedRemoveTag = removeOwnFeedPostTag as jest.MockedFunction<
  typeof removeOwnFeedPostTag
>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

const withOwnTag = () =>
  makePost({
    can_manage: false,
    tagged_users: [
      { id: 30, display_name: 'Ja', slug: 'ja', can_remove_tag: true },
    ] as FeedPost['tagged_users'],
  });

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function openDeleteConfirm() {
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-delete'));
  return screen.findByTestId('feed-post-delete-confirm');
}

async function openTagConfirm() {
  await userEvent.click(screen.getByTestId('feed-post-tag-remove'));
  return screen.findByTestId('feed-tag-remove-confirm');
}

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});

describe('zmazanie príspevku z karty', () => {
  it('po úspechu sa potvrdenie zavrie, zavolá sa onDeleted, vyšle sa signál o zmazaní a ukáže sa toast', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    const deletedSignal = jest.fn();
    const unsubscribe = onFeedPostDeleted(deletedSignal);
    render(<FeedPostCard post={makePost()} onDeleted={onDeleted} />);

    await openDeleteConfirm();
    await userEvent.click(screen.getByTestId('feed-post-delete-confirm-action'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-delete-confirm')).not.toBeInTheDocument(),
    );
    unsubscribe();
    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalledWith('Príspevok bol zmazaný.');
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(7);
    expect(deletedSignal).toHaveBeenCalledWith(7);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('po zlyhaní ukáže toast chyby, potvrdenie ostane a akciu možno zopakovať', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('sieť'));
    mockedDelete.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    render(<FeedPostCard post={makePost()} onDeleted={onDeleted} />);

    await openDeleteConfirm();
    const action = screen.getByTestId('feed-post-delete-confirm-action');
    await userEvent.click(action);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Príspevok sa nepodarilo zmazať.'),
    );
    expect(screen.getByTestId('feed-post-delete-confirm')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
    // Po zlyhaní už nič neprebieha: tlačidlo je znovu aktívne a ukazuje pôvodný text.
    await waitFor(() => expect(action).toBeEnabled());
    expect(action).toHaveTextContent('Vymazať');

    await userEvent.click(action);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-delete-confirm')).not.toBeInTheDocument(),
    );
    expect(mockedDelete).toHaveBeenCalledTimes(2);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('počas mazania je potvrdzovacie tlačidlo vypnuté a ukazuje „Vymazávam...“', async () => {
    const pending = deferred();
    mockedDelete.mockReturnValue(pending.promise);
    render(<FeedPostCard post={makePost()} />);

    const confirm = await openDeleteConfirm();
    await userEvent.click(screen.getByTestId('feed-post-delete-confirm-action'));

    const action = screen.getByTestId('feed-post-delete-confirm-action');
    expect(action).toBeDisabled();
    expect(action).toHaveTextContent('Vymazávam...');
    expect(within(confirm).getByRole('button', { name: 'Zrušiť' })).toBeDisabled();

    await act(async () => {
      pending.resolve();
    });
    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-delete-confirm')).not.toBeInTheDocument(),
    );
  });

  it('Zrušiť zavrie potvrdenie a server sa nevolá', async () => {
    render(<FeedPostCard post={makePost()} />);

    const confirm = await openDeleteConfirm();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-post-delete-confirm')).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('odstránenie vlastného označenia z karty', () => {
  it('po úspechu sa potvrdenie zavrie, označenie zmizne, ukáže sa toast a zavolá sa onSelfTagRemoved', async () => {
    mockedRemoveTag.mockResolvedValue(undefined);
    const onSelfTagRemoved = jest.fn();
    render(<FeedPostCard post={withOwnTag()} onSelfTagRemoved={onSelfTagRemoved} />);

    await openTagConfirm();
    await userEvent.click(screen.getByTestId('feed-tag-remove-confirm-action'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-tag-remove-confirm')).not.toBeInTheDocument(),
    );
    expect(mockedRemoveTag).toHaveBeenCalledTimes(1);
    expect(mockedRemoveTag).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId('feed-post-tag-30')).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Označenie bolo odstránené.');
    expect(onSelfTagRemoved).toHaveBeenCalledTimes(1);
    expect(onSelfTagRemoved).toHaveBeenCalledWith(7);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('po zlyhaní ukáže toast chyby, označenie aj potvrdenie ostanú a akciu možno zopakovať', async () => {
    mockedRemoveTag.mockRejectedValueOnce(new Error('sieť'));
    mockedRemoveTag.mockResolvedValue(undefined);
    const onSelfTagRemoved = jest.fn();
    render(<FeedPostCard post={withOwnTag()} onSelfTagRemoved={onSelfTagRemoved} />);

    await openTagConfirm();
    const action = screen.getByTestId('feed-tag-remove-confirm-action');
    await userEvent.click(action);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Označenie sa nepodarilo odstrániť.'),
    );
    expect(screen.getByTestId('feed-tag-remove-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-tag-30')).toBeInTheDocument();
    expect(onSelfTagRemoved).not.toHaveBeenCalled();
    await waitFor(() => expect(action).toBeEnabled());
    expect(action).toHaveTextContent('Odstrániť označenie');

    await userEvent.click(action);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-tag-remove-confirm')).not.toBeInTheDocument(),
    );
    expect(mockedRemoveTag).toHaveBeenCalledTimes(2);
    expect(onSelfTagRemoved).toHaveBeenCalledTimes(1);
  });

  it('počas odstraňovania je potvrdzovacie tlačidlo vypnuté a ukazuje „Odstraňujem...“', async () => {
    const pending = deferred();
    mockedRemoveTag.mockReturnValue(pending.promise);
    render(<FeedPostCard post={withOwnTag()} />);

    const confirm = await openTagConfirm();
    await userEvent.click(screen.getByTestId('feed-tag-remove-confirm-action'));

    const action = screen.getByTestId('feed-tag-remove-confirm-action');
    expect(action).toBeDisabled();
    expect(action).toHaveTextContent('Odstraňujem...');
    expect(within(confirm).getByRole('button', { name: 'Zrušiť' })).toBeDisabled();

    await act(async () => {
      pending.resolve();
    });
    await waitFor(() =>
      expect(screen.queryByTestId('feed-tag-remove-confirm')).not.toBeInTheDocument(),
    );
  });

  it('Zrušiť zavrie potvrdenie, označenie ostane a server sa nevolá', async () => {
    render(<FeedPostCard post={withOwnTag()} />);

    const confirm = await openTagConfirm();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Zrušiť' }));

    expect(screen.queryByTestId('feed-tag-remove-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-tag-30')).toBeInTheDocument();
    expect(mockedRemoveTag).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
