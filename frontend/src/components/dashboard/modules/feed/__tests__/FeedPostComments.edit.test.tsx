/**
 * Inline úprava komentára a odpovede.
 *
 * Overuje sa: „Upraviť" len pri vlastnom obsahu (a NIE pri cudzom, ani keď ho
 * smiem zmazať), úprava komentára aj odpovede bez obnovenia zoznamu,
 * označenie „(upravené)" LEN autorovi a FE validácia prázdneho textu.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  listFeedPostComments,
  updateFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  updateFeedPostComment: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

const toastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: (...args: unknown[]) => toastError(...args), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

const mockIsMobile = jest.fn(() => false);
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedUpdate = updateFeedPostComment as jest.MockedFunction<
  typeof updateFeedPostComment
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(
  id: number,
  text: string,
  overrides: Partial<FeedPostComment> = {},
): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPostComment;
}

function reply(
  id: number,
  text: string,
  parentId: number,
  overrides: Partial<FeedPostComment> = {},
): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: '2026-01-02',
    ...overrides,
  } as FeedPostComment;
}

function page(results: FeedPostComment[]) {
  return { results, next: null, previous: null, count: results.length };
}

beforeEach(() => {
  mockedList.mockReset();
  mockedUpdate.mockReset();
  toastError.mockReset();
  mockIsMobile.mockReturnValue(false);
});

describe('ponuka úpravy', () => {
  it('offers Edit on my own comment', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Moj komentar')]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Moj komentar');

    expect(screen.getByTestId('feed-comment-edit-1')).toBeInTheDocument();
  });

  it('offers no Edit on a comment I may delete but did not write', async () => {
    // Autor príspevku smie cudzí komentár zmazať, ale nie prepísať – práva sa
    // ZÁMERNE líšia a FE ich neodvodzuje, berie ich z backendu.
    mockedList.mockResolvedValue(
      page([comment(1, 'Cudzi komentar', { can_edit: false, can_delete: true })]),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Cudzi komentar');

    expect(screen.queryByTestId('feed-comment-edit-1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Zmazať komentár')).toBeInTheDocument();
  });

  it('offers Edit on my own reply too', async () => {
    mockedList.mockResolvedValue(
      page([
        comment(1, 'Hlavny', {
          replies: [reply(2, 'Moja odpoved', 1)],
          replies_count: 1,
        }),
      ]),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavny');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    expect(screen.getByTestId('feed-comment-edit-2')).toBeInTheDocument();
  });
});

describe('inline úprava', () => {
  it('replaces the text with an inline field and saves it', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));
    mockedUpdate.mockResolvedValue(
      comment(1, 'Upraveny komentar', { is_edited: true }),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');

    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));

    // Pole je PRIAMO na mieste komentára, nie v samostatnom dialógu.
    const composer = screen.getByTestId('feed-comment-edit-composer-1');
    const input = within(composer).getByRole('textbox');
    expect(input).toHaveValue('Povodny komentar');
    // Statický odsek s textom je preč – nahradilo ho pole (`selector`, lebo
    // textarea by sa inak do vyhľadávania podľa textu započítala tiež).
    expect(
      screen.queryByText('Povodny komentar', { selector: 'p' }),
    ).not.toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'Upraveny komentar');
    await userEvent.click(screen.getByTestId('feed-comment-edit-submit'));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(5, 1, 'Upraveny komentar'),
    );
    expect(await screen.findByText('Upraveny komentar')).toBeInTheDocument();
    // Po uložení sa pole zavrie.
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-comment-edit-composer-1'),
      ).not.toBeInTheDocument(),
    );
  });

  it('saves an edited reply under the right parent', async () => {
    mockedList.mockResolvedValue(
      page([
        comment(1, 'Hlavny', {
          replies: [reply(2, 'Povodna odpoved', 1)],
          replies_count: 1,
        }),
      ]),
    );
    mockedUpdate.mockResolvedValue(
      reply(2, 'Upravena odpoved', 1, { is_edited: true }),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavny');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    await userEvent.click(screen.getByTestId('feed-comment-edit-2'));

    const composer = screen.getByTestId('feed-comment-edit-composer-2');
    await userEvent.clear(within(composer).getByRole('textbox'));
    await userEvent.type(
      within(composer).getByRole('textbox'),
      'Upravena odpoved',
    );
    await userEvent.click(screen.getByTestId('feed-comment-edit-submit'));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(5, 2, 'Upravena odpoved'),
    );
    const nested = await screen.findByTestId('feed-comment-replies-1');
    expect(within(nested).getByText('Upravena odpoved')).toBeInTheDocument();
    // Rodič ostáva nedotknutý.
    expect(screen.getByText('Hlavny')).toBeInTheDocument();
  });

  it('cancels without sending anything', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');

    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));
    await userEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

    expect(
      screen.queryByTestId('feed-comment-edit-composer-1'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Povodny komentar')).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('refuses to save an empty comment', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');

    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));
    const composer = screen.getByTestId('feed-comment-edit-composer-1');
    await userEvent.clear(within(composer).getByRole('textbox'));

    expect(screen.getByTestId('feed-comment-edit-submit')).toBeDisabled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('keeps the original text when saving fails', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));
    mockedUpdate.mockRejectedValue(new Error('offline'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');

    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));
    const composer = screen.getByTestId('feed-comment-edit-composer-1');
    await userEvent.clear(within(composer).getByRole('textbox'));
    await userEvent.type(within(composer).getByRole('textbox'), 'Novy');
    await userEvent.click(screen.getByTestId('feed-comment-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Pole ostáva otvorené s rozpísaným textom – nič sa nestratilo.
    expect(within(composer).getByRole('textbox')).toHaveValue('Novy');
  });

  it('drops the emoji button on mobile, keeps it on desktop', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));
    mockIsMobile.mockReturnValue(true);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');
    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));

    expect(screen.queryByLabelText('Pridať emoji')).not.toBeInTheDocument();
  });
});

describe('označenie „(upravené)"', () => {
  it('shows the mark to the comment author', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Moj komentar', { is_edited: true })]),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Moj komentar');

    expect(screen.getByTestId('feed-comment-edited-1')).toBeInTheDocument();
  });

  it('shows nothing to a viewer who is not the author', async () => {
    // Cudziemu divákovi backend `is_edited` vôbec neposiela – v payloade chýba.
    const foreign = comment(1, 'Cudzi komentar', { can_edit: false });
    delete (foreign as Partial<FeedPostComment>).is_edited;
    mockedList.mockResolvedValue(page([foreign]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Cudzi komentar');

    expect(
      screen.queryByTestId('feed-comment-edited-1'),
    ).not.toBeInTheDocument();
  });

  it('starts showing the mark right after a successful edit', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Povodny komentar')]));
    mockedUpdate.mockResolvedValue(
      comment(1, 'Upraveny komentar', { is_edited: true }),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Povodny komentar');
    expect(
      screen.queryByTestId('feed-comment-edited-1'),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-comment-edit-1'));
    const composer = screen.getByTestId('feed-comment-edit-composer-1');
    await userEvent.clear(within(composer).getByRole('textbox'));
    await userEvent.type(
      within(composer).getByRole('textbox'),
      'Upraveny komentar',
    );
    await userEvent.click(screen.getByTestId('feed-comment-edit-submit'));

    expect(await screen.findByTestId('feed-comment-edited-1')).toBeInTheDocument();
  });
});
