/**
 * Zastarané odpovede po zmene zoznamu (poistka pred delením, nález 333).
 *
 * Pomalá odpoveď pollingu alebo donačítania, ktorá dobehne až PO pridaní,
 * úprave, odpovedi či zmazaní, je postavená na stave spred zmeny. Nesmie ho
 * prepísať: zmenený stav musí zostať a stará odpoveď sa zahodí.
 *
 * Druhá časť overuje, že vlastný komentár ani vlastná odpoveď sa pollingom
 * nehlásia ako nové – aj v úzkom okne, keď poll dobehne ešte pred
 * prekreslením (vtedy drží hranicu „videné" iba zápis v obslužnej funkcii).
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len
 * vonkajšie moduly, takže platia aj po každom kroku delenia súboru.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  installFiringIntersectionObserver,
  type FiringObserver,
} from '../feedObserverTestUtils';
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
const mockedUpdate = updateFeedPostComment as jest.MockedFunction<
  typeof updateFeedPostComment
>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<
  typeof deleteFeedPostComment
>;

type UserApi = ReturnType<typeof userEvent.setup>;

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

function reply(id: number, text: string, parentId: number): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: '2026-01-02',
  } as FeedPostComment;
}

function page(results: FeedPostComment[], count?: number): FeedCommentPage {
  return { results, next: null, previous: null, count: count ?? results.length };
}

/** Odpoveď, ktorú test podrží a pustí, až keď sa mu to hodí. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Posunie čas o jeden pollovací tik a nechá dobehnúť promise reťaz. */
async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
  });
}

/** Nechá dobehnúť už vyriešené promise, bez posunu času a bez prekreslenia. */
async function flushPromises() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

/**
 * Zoznam komentárov. Hľadanie textu ide cez neho, lebo text rozpísaný v poli
 * (nové, úprava, odpoveď) sa do hľadania podľa textu započíta tiež.
 */
const list = () => within(screen.getByTestId('feed-comments-scroll'));

/** jsdom nemá layout – pozíciu scrollu aj `scrollTo` nastavíme ručne. */
function setScrollPosition(scrollTop: number) {
  const node = screen.getByTestId('feed-comments-scroll');
  Object.defineProperty(node, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(node, 'clientHeight', { value: 400, configurable: true });
  node.scrollTop = scrollTop;
  node.scrollTo = jest.fn() as unknown as typeof node.scrollTo;
  return node;
}

/** Štyri zmeny zoznamu, po ktorých je odpoveď spred zmeny zastaraná. */
type Scenario = {
  name: string;
  /** Prvá stránka pred zmenou; je to aj stará odpoveď, ktorá dobehne neskôr. */
  initial: FeedPostComment[];
  arrange: () => void;
  /** Vykoná zmenu cez rozhranie a počká, kým je vidieť. */
  perform: (user: UserApi) => Promise<void>;
  /** Stav po zmene; musí platiť pred aj po príchode zastaranej odpovede. */
  expectChanged: () => void;
};

const scenarios: Scenario[] = [
  {
    name: 'add',
    initial: [comment(10, 'Prvý')],
    arrange: () => mockedCreate.mockResolvedValue(comment(99, 'Môj nový')),
    perform: async (user) => {
      await user.type(screen.getByRole('textbox'), 'Môj nový');
      await user.click(screen.getByRole('button', { name: 'Pridať' }));
      await list().findByText('Môj nový');
    },
    expectChanged: () => {
      expect(list().getByText('Môj nový')).toBeInTheDocument();
      expect(list().getByText('Prvý')).toBeInTheDocument();
    },
  },
  {
    name: 'edit',
    initial: [comment(11, 'Povodný', { can_edit: true, can_delete: true })],
    arrange: () =>
      mockedUpdate.mockResolvedValue(
        comment(11, 'Upravený', { is_edited: true, can_edit: true }),
      ),
    perform: async (user) => {
      await user.click(screen.getByTestId('feed-comment-edit-11'));
      const field = within(
        screen.getByTestId('feed-comment-edit-composer-11'),
      ).getByRole('textbox');
      await user.clear(field);
      await user.type(field, 'Upravený');
      await user.click(screen.getByTestId('feed-comment-edit-submit'));
      await waitFor(() =>
        expect(
          screen.queryByTestId('feed-comment-edit-composer-11'),
        ).not.toBeInTheDocument(),
      );
    },
    expectChanged: () => {
      expect(list().getByText('Upravený')).toBeInTheDocument();
      expect(list().queryByText('Povodný')).not.toBeInTheDocument();
    },
  },
  {
    name: 'reply',
    initial: [comment(12, 'Hlavný')],
    arrange: () => mockedCreate.mockResolvedValue(reply(98, 'Moja odpoveď', 12)),
    perform: async (user) => {
      await user.click(screen.getByTestId('feed-comment-reply-12'));
      const composer = await screen.findByTestId('feed-reply-composer');
      await user.type(within(composer).getByRole('textbox'), 'Moja odpoveď');
      await user.click(screen.getByTestId('feed-reply-submit'));
      await screen.findByTestId('feed-comment-replies-12');
    },
    expectChanged: () => {
      const nested = screen.getByTestId('feed-comment-replies-12');
      expect(within(nested).getByText('Moja odpoveď')).toBeInTheDocument();
    },
  },
  {
    name: 'delete',
    initial: [comment(21, 'Ostáva'), comment(20, 'Zmazaný', { can_delete: true })],
    arrange: () => mockedDelete.mockResolvedValue(undefined),
    perform: async (user) => {
      await user.click(screen.getByLabelText('Zmazať komentár'));
      const dialog = await screen.findByTestId('feed-comment-delete-confirm');
      await user.click(
        within(dialog).getByTestId('feed-comment-delete-confirm-action'),
      );
      await waitFor(() =>
        expect(list().queryByText('Zmazaný')).not.toBeInTheDocument(),
      );
    },
    expectChanged: () => {
      expect(list().queryByText('Zmazaný')).not.toBeInTheDocument();
      expect(list().getByText('Ostáva')).toBeInTheDocument();
    },
  },
];

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockedList.mockReset();
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedDelete.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('FeedPostComments – pomalý poll po zmene zoznamu', () => {
  it.each(scenarios)(
    'drops a poll answer that predates the change: $name',
    async (scenario) => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const slowPoll = deferred<FeedCommentPage>();
      mockedList
        .mockResolvedValueOnce(page(scenario.initial))
        // Druhý dopyt je poll: jeho odpoveď podržíme, kým sa zmena neurobí.
        .mockImplementationOnce(() => slowPoll.promise);
      scenario.arrange();

      render(<FeedPostComments postId={5} />);
      await screen.findByText(scenario.initial[0].text);
      await tick();
      // Poll musel REÁLNE odísť – inak nie je čo zahadzovať.
      expect(mockedList).toHaveBeenCalledTimes(2);

      await scenario.perform(user);
      scenario.expectChanged();

      // Až teraz dobehne odpoveď spred zmeny.
      await act(async () => {
        slowPoll.resolve(page(scenario.initial));
      });

      scenario.expectChanged();
    },
  );
});

describe('FeedPostComments – pomalé donačítanie po zmene zoznamu', () => {
  let observer: FiringObserver;

  beforeEach(() => {
    observer = installFiringIntersectionObserver();
  });

  afterEach(() => {
    observer.restore();
  });

  it.each(scenarios)(
    'drops a loaded page that predates the change: $name',
    async (scenario) => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const slowPage = deferred<FeedCommentPage>();
      mockedList
        .mockResolvedValueOnce({
          ...page(scenario.initial),
          next: 'http://api.test/comments/?cursor=a',
        })
        // Druhý dopyt je donačítanie staršej stránky; jej odpoveď podržíme.
        .mockImplementationOnce(() => slowPage.promise);
      scenario.arrange();

      render(<FeedPostComments postId={5} />);
      await screen.findByText(scenario.initial[0].text);
      await act(async () => {
        observer.fireAll();
      });
      expect(mockedList).toHaveBeenCalledTimes(2);

      await scenario.perform(user);
      scenario.expectChanged();

      // Stránka je postavená na kurzore spred zmeny – musí sa zahodiť.
      await act(async () => {
        slowPage.resolve(page([comment(1, 'Zastaraná stránka')]));
      });

      expect(screen.queryByText('Zastaraná stránka')).not.toBeInTheDocument();
      scenario.expectChanged();
    },
  );
});

describe('FeedPostComments – vlastný obsah sa pollingom neohlási ako nový', () => {
  const NEW_INDICATOR = 'feed-comments-new-indicator';
  const NEW_ANNOUNCER = 'feed-comments-new-announcer';

  it('does not announce my own comment when the next poll returns it', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mine = comment(99, 'Môj nový');
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([mine, comment(1, 'Prvý')], 2));
    mockedCreate.mockResolvedValue(mine);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    // Číta staršie nižšie – novinka by sa ukázala ako indikátor.
    setScrollPosition(600);

    await user.type(screen.getByRole('textbox'), 'Môj nový');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));
    await list().findByText('Môj nový');
    await tick();

    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(list().getAllByText('Môj nový')).toHaveLength(1);
    expect(screen.queryByTestId(NEW_INDICATOR)).not.toBeInTheDocument();
    expect(screen.getByTestId(NEW_ANNOUNCER)).toBeEmptyDOMElement();
  });

  it('does not announce my own reply when the next poll returns it', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mine = reply(98, 'Moja odpoveď', 1);
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Hlavný')]))
      .mockResolvedValue(
        page([{ ...comment(1, 'Hlavný'), replies: [mine], replies_count: 1 }], 2),
      );
    mockedCreate.mockResolvedValue(mine);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    setScrollPosition(600);

    await user.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = await screen.findByTestId('feed-reply-composer');
    await user.type(within(composer).getByRole('textbox'), 'Moja odpoveď');
    await user.click(screen.getByTestId('feed-reply-submit'));
    await screen.findByTestId('feed-comment-replies-1');
    await tick();

    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId(NEW_INDICATOR)).not.toBeInTheDocument();
    expect(screen.getByTestId(NEW_ANNOUNCER)).toBeEmptyDOMElement();
  });

  it('keeps the view calm when a poll lands before my comment is redrawn', async () => {
    // Poll dobehne ešte PRED prekreslením (React drží zmenu v `act` až do
    // jeho konca), takže zoznam, z ktorého poll hranicu „videné" odvodzuje,
    // vlastný komentár ešte nemá. Zachráni to len zápis hranice v obslužnej
    // funkcii pridania.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mine = comment(99, 'Môj nový');
    const created = deferred<FeedPostComment>();
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([mine, comment(1, 'Prvý')], 2));
    mockedCreate.mockReturnValue(created.promise);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    // Pri vrchu by novinka rozbehla plynulý posun – vlastný komentár ho nemá.
    const node = setScrollPosition(0);

    await user.type(screen.getByRole('textbox'), 'Môj nový');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));
    await act(async () => {
      created.resolve(mine);
      await flushPromises();
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      await flushPromises();
    });

    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(list().getAllByText('Môj nový')).toHaveLength(1);
    expect(node.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(node.scrollTo).not.toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });

  it('shows no indicator when a poll lands before my reply is redrawn', async () => {
    // Rovnaké okno ako vyššie, tentoraz pri odpovedi: nové id vnorené v
    // rodičovi by sa bez zápisu hranice ohlásilo ako nový komentár.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mine = reply(98, 'Moja odpoveď', 1);
    const created = deferred<FeedPostComment>();
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Hlavný')]))
      .mockResolvedValue(
        page([{ ...comment(1, 'Hlavný'), replies: [mine], replies_count: 1 }], 2),
      );
    mockedCreate.mockReturnValue(created.promise);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    setScrollPosition(600);

    await user.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = await screen.findByTestId('feed-reply-composer');
    await user.type(within(composer).getByRole('textbox'), 'Moja odpoveď');
    await user.click(screen.getByTestId('feed-reply-submit'));
    await act(async () => {
      created.resolve(mine);
      await flushPromises();
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      await flushPromises();
    });

    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(
      within(screen.getByTestId('feed-comment-replies-1')).getByText('Moja odpoveď'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId(NEW_INDICATOR)).not.toBeInTheDocument();
    expect(screen.getByTestId(NEW_ANNOUNCER)).toBeEmptyDOMElement();
  });
});
