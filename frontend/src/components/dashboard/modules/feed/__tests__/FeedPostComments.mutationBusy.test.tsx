/**
 * Stav „odosiela sa“ pri mutáciách komentárov (medzera z K42, mutácie G2, G3, X1 až X4 a W6, W8).
 *
 * Počas čakania na server je príslušné tlačidlo vypnuté a ukazuje text o práci („Odosielam...“, „Ukladám...“,
 * „Vymazávam...“); po zlyhaní sa tlačidlo vráti a akciu možno zopakovať. Pridaný komentár ide na server orezaný od medzier.
 * Kto by príznak práce nenastavil, nevrátil alebo ho do rozhrania nepredal, nechá používateľa klikať naprázdno alebo ho
 * navždy zablokuje.
 *
 * Testy používajú len verejné rozhranie komponentu (DOM, `data-testid`, volania atrap `feedApi`) a mockujú len vonkajšie
 * moduly. Odpovede API sú riadené ručne (odložené sľuby).
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedPostComments,
  updateFeedPostComment,
  type FeedCommentPage,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
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
  DesktopEmojiPickerButton: () => null,
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedUpdate = updateFeedPostComment as jest.MockedFunction<typeof updateFeedPostComment>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<typeof deleteFeedPostComment>;

const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function comment(id: number, text: string, overrides: Partial<FeedPostComment> = {}): FeedPostComment {
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

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
}

function apiError(status: number) {
  return { response: { status, data: {} } };
}

/** Sľub, ktorý dokončí až test: určuje okamih, kedy odpovie server. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function openList() {
  mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
  render(<FeedPostComments postId={5} />);
  await screen.findByText('Môj komentár');
}

describe('FeedPostComments – stav „odosiela sa“ pri mutáciách', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
  });

  it('pridanie: na server ide orezaný text, tlačidlo je počas odosielania vypnuté a po zlyhaní sa dá odoslať znova', async () => {
    const response = deferred<FeedPostComment>();
    mockedCreate.mockReturnValueOnce(response.promise);
    await openList();

    await userEvent.type(screen.getByRole('textbox'), '  Ahoj  ');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));

    expect(mockedCreate).toHaveBeenCalledWith(5, 'Ahoj');
    expect(screen.getByRole('button', { name: 'Odosielam...' })).toBeDisabled();

    await act(async () => response.reject(apiError(500)));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pridať' })).toBeEnabled());

    mockedCreate.mockResolvedValueOnce(comment(900, 'Ahoj'));
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    expect(mockedCreate).toHaveBeenCalledTimes(2);
  });

  it('úprava: tlačidlo je počas ukladania vypnuté a po zlyhaní sa dá uložiť znova', async () => {
    const response = deferred<FeedPostComment>();
    mockedUpdate.mockReturnValueOnce(response.promise);
    await openList();

    fireEvent.click(screen.getByTestId('feed-comment-edit-1'));
    const editor = screen.getByTestId('feed-comment-edit-composer-1');
    fireEvent.change(within(editor).getByRole('textbox'), { target: { value: 'Upravený text' } });
    fireEvent.click(screen.getByTestId('feed-comment-edit-submit'));

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('feed-comment-edit-submit')).toBeDisabled();
    expect(screen.getByTestId('feed-comment-edit-submit')).toHaveTextContent('Ukladám...');

    await act(async () => response.reject(apiError(500)));
    await waitFor(() => expect(screen.getByTestId('feed-comment-edit-submit')).toBeEnabled());
    expect(screen.getByTestId('feed-comment-edit-submit')).toHaveTextContent('Uložiť');

    mockedUpdate.mockResolvedValueOnce(comment(1, 'Upravený text', { is_edited: true }));
    fireEvent.click(screen.getByTestId('feed-comment-edit-submit'));
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
  });

  it('odpoveď: tlačidlo je počas odosielania vypnuté a po zlyhaní sa dá odoslať znova', async () => {
    const response = deferred<FeedPostComment>();
    mockedCreate.mockReturnValueOnce(response.promise);
    await openList();

    fireEvent.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = screen.getByTestId('feed-reply-composer');
    fireEvent.change(within(composer).getByRole('textbox'), { target: { value: 'Moja odpoveď' } });
    fireEvent.click(screen.getByTestId('feed-reply-submit'));

    expect(mockedCreate).toHaveBeenCalledWith(5, 'Moja odpoveď', 1);
    expect(screen.getByTestId('feed-reply-submit')).toBeDisabled();
    expect(screen.getByTestId('feed-reply-submit')).toHaveTextContent('Odosielam...');

    await act(async () => response.reject(apiError(500)));
    await waitFor(() => expect(screen.getByTestId('feed-reply-submit')).toBeEnabled());
    expect(screen.getByTestId('feed-reply-submit')).toHaveTextContent('Odpovedať');

    mockedCreate.mockResolvedValueOnce(comment(901, 'Moja odpoveď', { parent_comment_id: 1 }));
    fireEvent.click(screen.getByTestId('feed-reply-submit'));
    expect(mockedCreate).toHaveBeenCalledTimes(2);
  });

  it('zmazanie: potvrdenie je počas mazania vypnuté a po zlyhaní sa dá zopakovať', async () => {
    const response = deferred<void>();
    mockedDelete.mockReturnValueOnce(response.promise);
    await openList();

    fireEvent.click(screen.getByRole('button', { name: 'Zmazať komentár' }));
    fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('feed-comment-delete-confirm-action')).toBeDisabled();
    expect(screen.getByTestId('feed-comment-delete-confirm-action')).toHaveTextContent('Vymazávam...');

    await act(async () => response.reject(apiError(500)));
    await waitFor(() => expect(screen.getByTestId('feed-comment-delete-confirm-action')).toBeEnabled());
    expect(screen.getByTestId('feed-comment-delete-confirm-action')).toHaveTextContent('Vymazať');

    mockedDelete.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));
    expect(mockedDelete).toHaveBeenCalledTimes(2);
  });
});
