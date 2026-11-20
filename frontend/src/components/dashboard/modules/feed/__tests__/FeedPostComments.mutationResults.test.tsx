/**
 * Výsledky mutácií komentárov v rozhraní (medzera z K42, mutácie C2, B7, F3, F4, H4, H7, H11 a H13).
 *
 * Po úspechu: odpoveď ohlási rodičovi počet, zmazanie ukáže potvrdzujúcu hlášku a zavrie potvrdenie, odpoveď vyprázdni pole
 * a zvýši počet odpovedí vlákna, zmazanie odpovede ho zníži. Po zlyhaní zostane otvorené to, čo používateľ rozpísal:
 * úprava aj potvrdenie zmazania, takže sa dá opraviť a zopakovať.
 *
 * Testy používajú len verejné rozhranie komponentu (DOM, `data-testid`, volania atrap `feedApi` a toastu) a mockujú len
 * vonkajšie moduly.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const toastSuccess = jest.requireMock('react-hot-toast').default.success as jest.Mock;
const toastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;

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

function reply(id: number, text: string): FeedPostComment {
  return comment(id, text, { parent_comment_id: 1 });
}

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
}

function apiError(status: number, message?: string) {
  return { response: { status, data: message ? { error: message } : {} } };
}

/** Vlákno s dvoma odpoveďami (aj `replies_count`), predvolene zbalené. */
function threadPage() {
  return page([comment(1, 'Hlavný komentár', { replies: [reply(11, 'Prvá odpoveď'), reply(12, 'Druhá odpoveď')], replies_count: 2 })]);
}

describe('FeedPostComments – výsledky mutácií v rozhraní', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  describe('odpoveď na komentár', () => {
    async function sendReply(onCountChange: jest.Mock = jest.fn()) {
      mockedList.mockResolvedValue(threadPage());
      mockedCreate.mockResolvedValue(reply(13, 'Tretia odpoveď'));
      render(<FeedPostComments postId={5} onCountChange={onCountChange} />);
      await screen.findByText('Hlavný komentár');

      fireEvent.click(screen.getByTestId('feed-comment-reply-1'));
      fireEvent.change(within(screen.getByTestId('feed-reply-composer')).getByRole('textbox'), {
        target: { value: 'Tretia odpoveď' },
      });
      fireEvent.click(screen.getByTestId('feed-reply-submit'));
      // Pole odpovede sa zavrie až po úspešnej odpovedi servera; text v poli by sa do hľadania podľa textu započítal tiež.
      await waitFor(() => expect(screen.queryByTestId('feed-reply-composer')).not.toBeInTheDocument());
      expect(mockedCreate).toHaveBeenCalledTimes(1);
    }

    it('ohlási rodičovi jednu novú odpoveď v počte pri ikone', async () => {
      const onCountChange = jest.fn();
      await sendReply(onCountChange);

      expect(onCountChange).toHaveBeenCalledTimes(1);
      expect(onCountChange).toHaveBeenCalledWith(1);
    });

    it('zvýši počet odpovedí vlákna, ktorý ukazuje tlačidlo po zbalení', async () => {
      await sendReply();

      // Odpoveď sa po odoslaní ukáže, aj keď bolo vlákno zbalené; po zbalení musí tlačidlo počítať aj ju.
      fireEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
      expect(screen.getByTestId('feed-comment-toggle-replies-1')).toHaveTextContent('Zobraziť odpovede (3)');
    });

    it('vyprázdni pole odpovede aj pri jeho ďalšom otvorení', async () => {
      await sendReply();

      fireEvent.click(screen.getByTestId('feed-comment-reply-1'));

      expect(within(screen.getByTestId('feed-reply-composer')).getByRole('textbox')).toHaveValue('');
    });
  });

  describe('zmazanie komentára', () => {
    it('ukáže potvrdzujúcu hlášku a zavrie potvrdenie', async () => {
      mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
      mockedDelete.mockResolvedValue(undefined);
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Môj komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Zmazať komentár' }));
      fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));

      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Komentár bol zmazaný.'));
      expect(toastSuccess).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByTestId('feed-comment-delete-confirm')).not.toBeInTheDocument());
      expect(screen.queryByText('Môj komentár')).not.toBeInTheDocument();
    });

    it('po zlyhaní nechá potvrdenie otvorené, aby sa zmazanie dalo zopakovať', async () => {
      mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
      mockedDelete.mockRejectedValue(apiError(500));
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Môj komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Zmazať komentár' }));
      fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('Komentár sa nepodarilo zmazať.'));
      expect(screen.getByTestId('feed-comment-delete-confirm')).toBeInTheDocument();
      expect(screen.getByText('Môj komentár')).toBeInTheDocument();
    });

    it('zmazaná odpoveď zníži počet odpovedí vlákna', async () => {
      mockedList.mockResolvedValue(threadPage());
      mockedDelete.mockResolvedValue(undefined);
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Hlavný komentár');

      fireEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
      const thread = screen.getByTestId('feed-comment-replies-1');
      fireEvent.click(within(thread).getAllByRole('button', { name: 'Zmazať komentár' })[0]);
      fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));
      await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(5, 11));
      await waitFor(() => expect(screen.queryByText('Prvá odpoveď')).not.toBeInTheDocument());

      fireEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
      expect(screen.getByTestId('feed-comment-toggle-replies-1')).toHaveTextContent('Zobraziť odpovede (1)');
    });
  });

  describe('úprava komentára', () => {
    it('po zlyhaní nechá úpravu otvorenú s rozpísaným textom', async () => {
      mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
      mockedUpdate.mockRejectedValue(apiError(500));
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Môj komentár');

      fireEvent.click(screen.getByTestId('feed-comment-edit-1'));
      const editor = screen.getByTestId('feed-comment-edit-composer-1');
      fireEvent.change(within(editor).getByRole('textbox'), { target: { value: 'Upravený text' } });
      fireEvent.click(screen.getByTestId('feed-comment-edit-submit'));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('Komentár sa nepodarilo upraviť.'));
      expect(screen.getByTestId('feed-comment-edit-composer-1')).toBeInTheDocument();
      expect(within(screen.getByTestId('feed-comment-edit-composer-1')).getByRole('textbox')).toHaveValue('Upravený text');
    });
  });
});
