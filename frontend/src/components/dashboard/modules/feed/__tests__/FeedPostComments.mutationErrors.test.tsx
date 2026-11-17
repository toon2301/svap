/**
 * Chyby pri pridaní, odpovedi a zmazaní komentára (poistka pred delením,
 * nález 333).
 *
 * Overuje sa, že zlyhanie nič nepokazí: používateľ dostane hlášku (správu zo
 * servera, inak náhradný text), rozpísaný text ostane v poli, v zozname sa nič
 * nezmení a počet pri ikone sa nepohne. Zmiznutý príspevok hlási svoju vlastnú
 * neutrálnu hlášku, nie „komentár sa nepodarilo pridať". Zrušenie potvrdenia
 * zmazania nič nezmaže.
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len
 * vonkajšie moduly, takže platia aj po každom kroku delenia súboru.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedPostComments,
  type FeedCommentPage,
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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
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
const mockedCreate = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<
  typeof deleteFeedPostComment
>;
const mockedToastError = jest.requireMock('react-hot-toast').default
  .error as jest.Mock;
const mockedToastSuccess = jest.requireMock('react-hot-toast').default
  .success as jest.Mock;

const GENERIC_ADD_ERROR = 'Komentár sa nepodarilo pridať.';
const GENERIC_REPLY_ERROR = 'Odpoveď sa nepodarilo pridať.';
const GENERIC_DELETE_ERROR = 'Komentár sa nepodarilo zmazať.';
const GONE_MESSAGE = 'Tento príspevok už nie je dostupný.';

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
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPostComment;
}

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
}

/** Chyba z API tak, ako ju vráti axios: stav a voliteľne správa v tele. */
function apiError(status: number, message?: string) {
  return { response: { status, data: message ? { error: message } : {} } };
}

beforeEach(() => {
  mockedList.mockReset();
  mockedCreate.mockReset();
  mockedDelete.mockReset();
  mockedToastError.mockReset();
  mockedToastSuccess.mockReset();
});

describe('FeedPostComments – chyba pridania komentára', () => {
  async function submitNewComment(onCountChange: jest.Mock) {
    mockedList.mockResolvedValue(page([comment(1, 'Prvý')]));
    render(<FeedPostComments postId={5} onCountChange={onCountChange} />);
    await screen.findByText('Prvý');

    const field = screen.getByRole('textbox');
    await userEvent.type(field, 'Môj komentár');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    return field;
  }

  it('shows the message from the server and keeps my text', async () => {
    const onCountChange = jest.fn();
    mockedCreate.mockRejectedValue(apiError(400, 'Komentár je príliš dlhý.'));

    const field = await submitNewComment(onCountChange);

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith('Komentár je príliš dlhý.'),
    );
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    // Nič sa nestratilo: text je v poli, zoznam a počet ostali ako boli
    // (hľadá sa v zozname, lebo text v poli sa do hľadania podľa textu
    // započíta tiež).
    expect(field).toHaveValue('Môj komentár');
    expect(
      within(screen.getByTestId('feed-comments-scroll')).queryByText('Môj komentár'),
    ).not.toBeInTheDocument();
    expect(onCountChange).not.toHaveBeenCalled();
  });

  it('falls back to the generic message when the server gives none', async () => {
    const onCountChange = jest.fn();
    mockedCreate.mockRejectedValue(new Error('offline'));

    const field = await submitNewComment(onCountChange);

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(GENERIC_ADD_ERROR),
    );
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(field).toHaveValue('Môj komentár');
    expect(onCountChange).not.toHaveBeenCalled();
  });

  it('reports a vanished post once, in its own words, not as a failed comment', async () => {
    const onCountChange = jest.fn();
    mockedCreate.mockRejectedValue(apiError(404));

    const field = await submitNewComment(onCountChange);

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE),
    );
    // Hláška „komentár sa nepodarilo pridať" by mýlila: príspevok zmizol.
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).not.toHaveBeenCalledWith(GENERIC_ADD_ERROR);
    expect(field).toHaveValue('Môj komentár');
    expect(onCountChange).not.toHaveBeenCalled();
  });
});

describe('FeedPostComments – chyba odpovede', () => {
  async function submitReply(onCountChange: jest.Mock) {
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný')]));
    render(<FeedPostComments postId={5} onCountChange={onCountChange} />);
    await screen.findByText('Hlavný');

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = await screen.findByTestId('feed-reply-composer');
    const field = within(composer).getByRole('textbox');
    await userEvent.type(field, 'Moja odpoveď');
    await userEvent.click(screen.getByTestId('feed-reply-submit'));
    return field;
  }

  it('shows the message from the server and keeps the reply open', async () => {
    const onCountChange = jest.fn();
    mockedCreate.mockRejectedValue(apiError(400, 'Odpoveď je príliš dlhá.'));

    const field = await submitReply(onCountChange);

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith('Odpoveď je príliš dlhá.'),
    );
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    // Pole odpovede ostáva otvorené s rozpísaným textom.
    expect(screen.getByTestId('feed-reply-composer')).toBeInTheDocument();
    expect(field).toHaveValue('Moja odpoveď');
    expect(screen.queryByTestId('feed-comment-replies-1')).not.toBeInTheDocument();
    expect(onCountChange).not.toHaveBeenCalled();
  });

  it('falls back to the generic message when the server gives none', async () => {
    const onCountChange = jest.fn();
    mockedCreate.mockRejectedValue(new Error('offline'));

    const field = await submitReply(onCountChange);

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(GENERIC_REPLY_ERROR),
    );
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(field).toHaveValue('Moja odpoveď');
    expect(onCountChange).not.toHaveBeenCalled();
  });
});

describe('FeedPostComments – chyba zmazania', () => {
  it('keeps the comment and the count when deleting fails', async () => {
    const onCountChange = jest.fn();
    mockedList.mockResolvedValue(
      page([comment(1, 'Zostáva', { can_delete: true })]),
    );
    mockedDelete.mockRejectedValue(new Error('offline'));

    render(<FeedPostComments postId={5} onCountChange={onCountChange} />);
    await screen.findByText('Zostáva');

    await userEvent.click(screen.getByLabelText('Zmazať komentár'));
    const dialog = await screen.findByTestId('feed-comment-delete-confirm');
    await userEvent.click(
      within(dialog).getByTestId('feed-comment-delete-confirm-action'),
    );

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(GENERIC_DELETE_ERROR),
    );
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledTimes(1);
    // Úspech sa nehlási a nič sa nezmenilo.
    expect(mockedToastSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('Zostáva')).toBeInTheDocument();
    expect(onCountChange).not.toHaveBeenCalled();
  });
});

describe('FeedPostComments – zrušenie potvrdenia zmazania', () => {
  async function openConfirmation(onCountChange: jest.Mock) {
    mockedList.mockResolvedValue(
      page([comment(1, 'Zostáva', { can_delete: true })]),
    );
    render(<FeedPostComments postId={5} onCountChange={onCountChange} />);
    await screen.findByText('Zostáva');

    await userEvent.click(screen.getByLabelText('Zmazať komentár'));
    return screen.findByTestId('feed-comment-delete-confirm');
  }

  function expectNothingDeleted(onCountChange: jest.Mock) {
    expect(screen.queryByTestId('feed-comment-delete-confirm')).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
    expect(mockedToastError).not.toHaveBeenCalled();
    expect(screen.getByText('Zostáva')).toBeInTheDocument();
    expect(onCountChange).not.toHaveBeenCalled();
  }

  it('closes the confirmation with Cancel and deletes nothing', async () => {
    const onCountChange = jest.fn();
    const dialog = await openConfirmation(onCountChange);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Zrušiť' }));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-comment-delete-confirm')).not.toBeInTheDocument(),
    );
    expectNothingDeleted(onCountChange);
  });

  it('closes the confirmation with Escape and deletes nothing', async () => {
    const onCountChange = jest.fn();
    await openConfirmation(onCountChange);

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByTestId('feed-comment-delete-confirm')).not.toBeInTheDocument(),
    );
    expectNothingDeleted(onCountChange);
  });
});
