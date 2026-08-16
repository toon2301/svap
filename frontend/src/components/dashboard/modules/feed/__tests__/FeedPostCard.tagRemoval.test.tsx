/**
 * Odstránenie vlastného označenia z príspevku.
 *
 * Kľúčové je, že „x" patrí VÝHRADNE vlastnému chipu – o tom, ktorý to je,
 * rozhoduje backend cez `can_remove_tag`, nie porovnanie id na FE.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import {
  deleteFeedPost,
  removeOwnFeedPostTag,
  type FeedPost,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn().mockResolvedValue({
    results: [],
    next: null,
    previous: null,
  }),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  getFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
}));

const toastError = jest.fn();
const toastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedRemove = removeOwnFeedPostTag as jest.MockedFunction<
  typeof removeOwnFeedPostTag
>;
const mockedDelete = deleteFeedPost as jest.MockedFunction<typeof deleteFeedPost>;

function user(id: number, name: string, canRemove = false) {
  return {
    id,
    display_name: name,
    slug: `u${id}`,
    user_type: 'individual',
    avatar_url: null,
    can_remove_tag: canRemove,
  };
}

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 500,
    post_type: 'free_post',
    caption: 'Ahoj',
    author: user(1, 'Autor'),
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    // Cudzí chip prvý, vlastný druhý – poradie nesmie hrať rolu.
    tagged_users: [user(2, 'Cudzia'), user(3, 'Ja', true)],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows the remove control only on the tag that belongs to the viewer', () => {
  render(<FeedPostCard post={post()} />);

  const ownChip = screen.getByTestId('feed-post-tag-3');
  const otherChip = screen.getByTestId('feed-post-tag-2');

  expect(within(ownChip).getByTestId('feed-post-tag-remove')).toBeInTheDocument();
  expect(
    within(otherChip).queryByTestId('feed-post-tag-remove'),
  ).not.toBeInTheDocument();
  // Presne jedno „x" na karte.
  expect(screen.getAllByTestId('feed-post-tag-remove')).toHaveLength(1);
});

it('shows no remove control at all for an anonymous viewer', () => {
  render(
    <FeedPostCard
      post={post({ tagged_users: [user(2, 'Cudzia'), user(3, 'Ja')] } as Partial<FeedPost>)}
    />,
  );

  expect(screen.queryByTestId('feed-post-tag-remove')).not.toBeInTheDocument();
});

it('asks for confirmation, calls the API and drops the chip', async () => {
  mockedRemove.mockResolvedValue(undefined);
  render(<FeedPostCard post={post()} />);

  await userEvent.click(screen.getByTestId('feed-post-tag-remove'));

  // Appka-štýl dialóg, nie natívny confirm.
  const dialog = await screen.findByTestId('feed-tag-remove-confirm');
  expect(dialog).toHaveTextContent(
    'Naozaj chceš odstrániť svoje označenie z tohto príspevku?',
  );

  await userEvent.click(
    within(dialog).getByTestId('feed-tag-remove-confirm-action'),
  );

  await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith(500));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-tag-3')).not.toBeInTheDocument(),
  );
  // Cudzie označenie ostáva.
  expect(screen.getByTestId('feed-post-tag-2')).toBeInTheDocument();
  expect(toastSuccess).toHaveBeenCalledWith('Označenie bolo odstránené.');
});

it('does nothing when the confirmation is dismissed', async () => {
  render(<FeedPostCard post={post()} />);

  await userEvent.click(screen.getByTestId('feed-post-tag-remove'));
  await screen.findByTestId('feed-tag-remove-confirm');
  await userEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

  expect(mockedRemove).not.toHaveBeenCalled();
  expect(screen.getByTestId('feed-post-tag-3')).toBeInTheDocument();
});

it('keeps the chip and reports the error when the request fails', async () => {
  mockedRemove.mockRejectedValue(new Error('boom'));
  render(<FeedPostCard post={post()} />);

  await userEvent.click(screen.getByTestId('feed-post-tag-remove'));
  const dialog = await screen.findByTestId('feed-tag-remove-confirm');
  await userEvent.click(
    within(dialog).getByTestId('feed-tag-remove-confirm-action'),
  );

  await waitFor(() => expect(toastError).toHaveBeenCalled());
  // Odstránenie sa premieta až po potvrdení serverom – chip teda ostáva.
  expect(screen.getByTestId('feed-post-tag-3')).toBeInTheDocument();
});

it('notifies the parent so filtered lists can drop the post', async () => {
  mockedRemove.mockResolvedValue(undefined);
  const onSelfTagRemoved = jest.fn();
  render(<FeedPostCard post={post()} onSelfTagRemoved={onSelfTagRemoved} />);

  await userEvent.click(screen.getByTestId('feed-post-tag-remove'));
  const dialog = await screen.findByTestId('feed-tag-remove-confirm');
  await act(async () => {
    within(dialog).getByTestId('feed-tag-remove-confirm-action').click();
  });

  await waitFor(() => expect(onSelfTagRemoved).toHaveBeenCalledWith(500));
});

// --- Zmazanie vlastného príspevku -----------------------------------------

it('offers deleting only when the backend says the viewer manages the post', async () => {
  render(<FeedPostCard post={post({ can_manage: false } as Partial<FeedPost>)} />);

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

  expect(screen.queryByTestId('feed-post-delete')).not.toBeInTheDocument();
  // Nahlásenie ostáva dostupné – skryla sa iba položka mazania.
  expect(screen.getByTestId('feed-post-menu')).toHaveTextContent(
    'Nahlásiť príspevok',
  );
});

it('deletes the post after confirmation and tells the list', async () => {
  mockedDelete.mockResolvedValue(undefined);
  const onDeleted = jest.fn();
  render(
    <FeedPostCard
      post={post({ can_manage: true } as Partial<FeedPost>)}
      onDeleted={onDeleted}
    />,
  );

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-delete'));

  const dialog = await screen.findByTestId('feed-post-delete-confirm');
  expect(dialog).toHaveTextContent('Naozaj chceš zmazať tento príspevok?');
  await userEvent.click(
    within(dialog).getByTestId('feed-post-delete-confirm-action'),
  );

  await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(500));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(500));
  expect(toastSuccess).toHaveBeenCalledWith('Príspevok bol zmazaný.');
});

it('keeps the post and reports the error when deleting fails', async () => {
  mockedDelete.mockRejectedValue(new Error('boom'));
  const onDeleted = jest.fn();
  render(
    <FeedPostCard
      post={post({ can_manage: true } as Partial<FeedPost>)}
      onDeleted={onDeleted}
    />,
  );

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-delete'));
  const dialog = await screen.findByTestId('feed-post-delete-confirm');
  await userEvent.click(
    within(dialog).getByTestId('feed-post-delete-confirm-action'),
  );

  await waitFor(() => expect(toastError).toHaveBeenCalled());
  expect(onDeleted).not.toHaveBeenCalled();
});
