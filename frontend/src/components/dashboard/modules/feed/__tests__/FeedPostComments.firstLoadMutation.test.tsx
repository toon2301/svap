/**
 * Nález 338 (K41, R48): zoznam komentárov ostal na „Načítavam…“, keď sa počas PRVÉHO načítania úspešne pridal
 * komentár.
 *
 * Pridanie komentára zvýši poradové číslo načítania (`loadSeqRef`), aby pomalá odpoveď staršieho načítania
 * neprepísala čerstvý komentár stavom spred pridania. Odpoveď prvého načítania sa vtedy zahodí, lenže
 * `loading` zhasínal len pri zhode poradia, takže nezhasol nikdy: zoznam, chyba aj polling sa neukázali a
 * signál `onCommentsReady` nepadol.
 *
 * Oprava (`useFeedCommentsLoader.ts`): ak zahodenú odpoveď zneplatnila mutácia (a nie novšie načítanie, ktoré
 * `loading` zhasne samo), načíta sa znova nad aktuálnym stavom. Zastaraná odpoveď sa teda NEzlučuje (zlúčenie
 * `mergeComments` by pomocou odpovede spred pridania vlastný komentár odstránilo ako „zmazaný“); zoznam je po
 * novom načítaní zhodný so serverom, vrátane vlastného komentára a čerstvého počtu.
 *
 * Druhá časť (nálezy CodeRabbitu na PR #295): odmontovaná inštancia nespúšťa opakované načítanie ani nevolá
 * `onTotalChange`. Rodič počet zapíše a rozošle všetkým miestam s rovnakým `postId` bez kontroly aktuálnosti,
 * takže zastaraná odpoveď odmontovaného zoznamu by mohla prepísať novší počet z iného miesta. Stav Reactu po
 * odmontovaní zastaví React sám, volanie callbacku nie, preto je kontrola v hooku (cesty: prvé načítanie,
 * opakované načítanie, polling).
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len vonkajšie moduly.
 */

import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import { handleFeedPostErrorIfGone } from '../feedPostGone';
import {
  createFeedPostComment,
  listFeedPostComments,
  type FeedCommentPage,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
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

jest.mock('../feedPostGone', () => ({
  handleFeedPostErrorIfGone: jest.fn(() => false),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedGone = handleFeedPostErrorIfGone as jest.MockedFunction<
  typeof handleFeedPostErrorIfGone
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    created_at: `2026-01-01T10:00:0${id}Z`,
  };
}

function page(results: FeedPostComment[], count = results.length): FeedCommentPage {
  return { results, next: null, previous: null, count };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const LOADING = 'Načítavam...';
const LOAD_ERROR = 'Komentáre sa nepodarilo načítať.';

/** Napíše a odošle komentár, kým beží prvé načítanie (zoznam je na „Načítavam…“, composer funguje). */
async function submitDuringLoad(text: string, created: FeedPostComment) {
  mockedCreate.mockResolvedValueOnce(created);
  await userEvent.type(screen.getByRole('textbox'), text);
  await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
  await waitFor(() => expect(mockedCreate).toHaveBeenLastCalledWith(5, text));
}

describe('FeedPostComments – komentár pridaný počas prvého načítania (nález 338)', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedGone.mockClear();
  });

  it('shows the list with the new comment after the repeated load', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(page([comment(2, 'Môj nový'), comment(1, 'Starý')]));
    const onTotalChange = jest.fn();
    const onCommentsReady = jest.fn();

    render(
      <FeedPostComments
        postId={5}
        onTotalChange={onTotalChange}
        onCommentsReady={onCommentsReady}
      />,
    );
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    await submitDuringLoad('Môj nový', comment(2, 'Môj nový'));

    // Dobehne PRVÉ načítanie, začaté pred pridaním: jeho odpoveď je zastaraná.
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')]));
    });

    expect(await screen.findByText('Starý')).toBeInTheDocument();
    expect(screen.getByText('Môj nový')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);
    // Počet pri ikone vychádza len z načítania, ktoré sa použilo (zastarané sa nehlási).
    expect(onTotalChange).toHaveBeenCalledTimes(1);
    expect(onTotalChange).toHaveBeenLastCalledWith(2);
    // Signál „zoznam je vykreslený“ padne, až keď je zoznam na obrazovke.
    await waitFor(() => expect(onCommentsReady).toHaveBeenCalledTimes(1));
  });

  it('keeps the loading state until the repeated load finishes', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    const secondLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    render(<FeedPostComments postId={5} />);
    await submitDuringLoad('Môj nový', comment(2, 'Môj nový'));
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')]));
    });

    // Nové načítanie beží: stále „Načítavam…“, zastaraná odpoveď ani vlastný komentár osamote sa neukážu.
    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('Starý')).not.toBeInTheDocument();
    expect(screen.queryByText('Môj nový')).not.toBeInTheDocument();

    await act(async () => {
      secondLoad.resolve(page([comment(2, 'Môj nový'), comment(1, 'Starý')]));
    });

    expect(await screen.findByText('Starý')).toBeInTheDocument();
    expect(screen.getByText('Môj nový')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
  });

  it('recovers when the first load FAILS after a comment was added', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(page([comment(2, 'Môj nový'), comment(1, 'Starý')]));

    render(<FeedPostComments postId={5} />);
    await submitDuringLoad('Môj nový', comment(2, 'Môj nový'));
    await act(async () => {
      firstLoad.reject(new Error('offline'));
    });

    expect(await screen.findByText('Starý')).toBeInTheDocument();
    expect(screen.getByText('Môj nový')).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);
    // Zastaranú chybu nikto nespracúva: ani „príspevok zmizol“, ani zlyhanie.
    expect(mockedGone).not.toHaveBeenCalled();
  });

  it('reports a failure of the repeated load instead of staying on loading', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockRejectedValueOnce(new Error('offline'));

    render(<FeedPostComments postId={5} />);
    await submitDuringLoad('Môj nový', comment(2, 'Môj nový'));
    await act(async () => {
      firstLoad.reject(new Error('offline'));
    });

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    // Druhé načítanie nie je zastarané, takže sa neopakuje ďalej.
    expect(mockedList).toHaveBeenCalledTimes(2);
  });

  it('repeats the load once per added comment, never in a loop', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    const secondLoad = deferred<FeedCommentPage>();
    const thirdLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise)
      .mockReturnValueOnce(thirdLoad.promise);

    render(<FeedPostComments postId={5} />);
    await submitDuringLoad('Prvý môj', comment(2, 'Prvý môj'));
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')]));
    });
    expect(mockedList).toHaveBeenCalledTimes(2);

    // Ďalší komentár pribudne, kým beží opakované načítanie: aj to je zneplatnené, a to len raz.
    await submitDuringLoad('Druhý môj', comment(3, 'Druhý môj'));
    await act(async () => {
      secondLoad.resolve(page([comment(2, 'Prvý môj'), comment(1, 'Starý')]));
    });
    expect(mockedList).toHaveBeenCalledTimes(3);
    expect(screen.getByText(LOADING)).toBeInTheDocument();

    await act(async () => {
      thirdLoad.resolve(
        page([comment(3, 'Druhý môj'), comment(2, 'Prvý môj'), comment(1, 'Starý')]),
      );
    });
    expect(await screen.findByText('Druhý môj')).toBeInTheDocument();
    expect(screen.getByText('Prvý môj')).toBeInTheDocument();
    expect(screen.getByText('Starý')).toBeInTheDocument();

    // Čas navyše: nič ďalšie sa nenačítava (žiadna slučka). Polling je od hotového načítania, nie od tohto testu.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockedList).toHaveBeenCalledTimes(3);
  });

  it('does not touch the loading state when nothing was added (control)', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList.mockReturnValueOnce(firstLoad.promise);

    render(<FeedPostComments postId={5} />);
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')]));
    });

    expect(await screen.findByText('Starý')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it('does not repeat or mix when the post changes during the load', async () => {
    const loadOfFirstPost = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(loadOfFirstPost.promise)
      .mockResolvedValueOnce(page([comment(20, 'Z druhého príspevku')]));

    const { rerender } = render(<FeedPostComments postId={5} />);
    rerender(<FeedPostComments postId={6} />);
    expect(await screen.findByText('Z druhého príspevku')).toBeInTheDocument();

    // Odpoveď PRVÉHO príspevku dobehne neskôr: zahodí sa a nič nespustí (druhé načítanie je novšie).
    await act(async () => {
      loadOfFirstPost.resolve(page([comment(10, 'Z prvého príspevku')]));
    });

    expect(screen.getByText('Z druhého príspevku')).toBeInTheDocument();
    expect(screen.queryByText('Z prvého príspevku')).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(mockedList).toHaveBeenNthCalledWith(1, 5, { pageSize: 10 });
    expect(mockedList).toHaveBeenNthCalledWith(2, 6, { pageSize: 10 });
  });

  it('keeps loading while the newer load of another post is still pending', async () => {
    const loadOfFirstPost = deferred<FeedCommentPage>();
    const loadOfSecondPost = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(loadOfFirstPost.promise)
      .mockReturnValueOnce(loadOfSecondPost.promise);

    const { rerender } = render(<FeedPostComments postId={5} />);
    rerender(<FeedPostComments postId={6} />);

    // Zastaraná odpoveď prvého príspevku nesmie zhasnúť `loading`, kým druhé načítanie beží.
    await act(async () => {
      loadOfFirstPost.resolve(page([comment(10, 'Z prvého príspevku')]));
    });
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText('Z prvého príspevku')).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);

    await act(async () => {
      loadOfSecondPost.resolve(page([comment(20, 'Z druhého príspevku')]));
    });
    expect(await screen.findByText('Z druhého príspevku')).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);
  });

  it('starts polling only after the repeated load, as after any load', async () => {
    jest.useFakeTimers();
    try {
      const firstLoad = deferred<FeedCommentPage>();
      mockedList
        .mockReturnValueOnce(firstLoad.promise)
        .mockResolvedValue(page([comment(2, 'Môj nový'), comment(1, 'Starý')]));
      mockedCreate.mockResolvedValueOnce(comment(2, 'Môj nový'));
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<FeedPostComments postId={5} />);
      await user.type(screen.getByRole('textbox'), 'Môj nový');
      await user.click(screen.getByRole('button', { name: 'Pridať' }));
      await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
      await act(async () => {
        firstLoad.resolve(page([comment(1, 'Starý')]));
      });
      expect(await screen.findByText('Starý')).toBeInTheDocument();
      const afterLoads = mockedList.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      });

      expect(mockedList.mock.calls.length).toBeGreaterThan(afterLoads);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('FeedPostComments – odmontovaná inštancia nič nepublikuje (PR #295)', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedGone.mockClear();
  });

  it('does not publish the count when the first load finishes after unmount', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList.mockReturnValueOnce(firstLoad.promise);
    const onTotalChange = jest.fn();

    const { unmount } = render(
      <FeedPostComments postId={5} onTotalChange={onTotalChange} />,
    );
    unmount();
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')], 9));
    });

    expect(onTotalChange).not.toHaveBeenCalled();
  });

  it('does not repeat the load nor publish its count after unmount', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    mockedList
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(page([comment(2, 'Môj nový'), comment(1, 'Starý')], 12));
    const onTotalChange = jest.fn();

    const { unmount } = render(
      <FeedPostComments postId={5} onTotalChange={onTotalChange} />,
    );
    await submitDuringLoad('Môj nový', comment(2, 'Môj nový'));
    unmount();
    await act(async () => {
      firstLoad.resolve(page([comment(1, 'Starý')], 1));
    });

    // Zastaranú odpoveď zahodila mutácia, no zoznam už neexistuje: nič sa nenačíta znova a nič sa nepublikuje.
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(onTotalChange).not.toHaveBeenCalled();
  });

  it('does not publish the count of a polling response that finishes after unmount', async () => {
    jest.useFakeTimers();
    try {
      const poll = deferred<FeedCommentPage>();
      mockedList
        .mockResolvedValueOnce(page([comment(1, 'Starý')], 3))
        .mockReturnValueOnce(poll.promise);
      const onTotalChange = jest.fn();

      const { unmount } = render(
        <FeedPostComments postId={5} onTotalChange={onTotalChange} />,
      );
      expect(await screen.findByText('Starý')).toBeInTheDocument();
      onTotalChange.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      });
      expect(mockedList).toHaveBeenCalledTimes(2);
      unmount();
      await act(async () => {
        poll.resolve(page([comment(1, 'Starý')], 4));
      });

      expect(onTotalChange).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('still publishes the count of the first load and of a poll while mounted', async () => {
    jest.useFakeTimers();
    try {
      mockedList
        .mockResolvedValueOnce(page([comment(1, 'Starý')], 3))
        .mockResolvedValueOnce(page([comment(2, 'Nový'), comment(1, 'Starý')], 4));
      const onTotalChange = jest.fn();

      render(<FeedPostComments postId={5} onTotalChange={onTotalChange} />);
      expect(await screen.findByText('Starý')).toBeInTheDocument();
      expect(onTotalChange).toHaveBeenLastCalledWith(3);

      await act(async () => {
        jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      });

      await waitFor(() => expect(onTotalChange).toHaveBeenLastCalledWith(4));
    } finally {
      jest.useRealTimers();
    }
  });

  it('works under React StrictMode, where effects run twice', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Starý')], 7));
    const onTotalChange = jest.fn();

    render(
      <StrictMode>
        <FeedPostComments postId={5} onTotalChange={onTotalChange} />
      </StrictMode>,
    );

    expect(await screen.findByText('Starý')).toBeInTheDocument();
    expect(onTotalChange).toHaveBeenLastCalledWith(7);
  });

  it('repeats the load for the CURRENT post after the post changed', async () => {
    const loadOfSecondPost = deferred<FeedCommentPage>();
    mockedList
      .mockResolvedValueOnce(page([comment(10, 'Z prvého príspevku')]))
      .mockReturnValueOnce(loadOfSecondPost.promise)
      .mockResolvedValueOnce(
        page([comment(21, 'Môj nový'), comment(20, 'Z druhého príspevku')]),
      );
    mockedCreate.mockResolvedValueOnce(comment(21, 'Môj nový'));

    const { rerender } = render(<FeedPostComments postId={5} />);
    expect(await screen.findByText('Z prvého príspevku')).toBeInTheDocument();
    rerender(<FeedPostComments postId={6} />);
    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith(6, 'Môj nový'));
    await act(async () => {
      loadOfSecondPost.resolve(page([comment(20, 'Z druhého príspevku')]));
    });

    expect(await screen.findByText('Z druhého príspevku')).toBeInTheDocument();
    expect(screen.getByText('Môj nový')).toBeInTheDocument();
    // Opakovanie patrí AKTUÁLNEMU príspevku, nie tomu z prvého vykreslenia.
    expect(mockedList).toHaveBeenNthCalledWith(3, 6, { pageSize: 10 });
  });
});
