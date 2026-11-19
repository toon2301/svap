/**
 * Odpoveď, úprava a zmazanie komentára pri zmiznutom príspevku (nález 342, K43, R60).
 *
 * Pridanie komentára berie chybu 404, 403 a 410 ako „príspevok zmizol“ hneď: ukáže jednu neutrálnu hlášku a pošle
 * signál zmiznutia, takže karta zmizne zo zoznamov. Odpoveď, úprava a zmazanie to predtým nerobili: ukázali len
 * všeobecnú chybu a príspevok ostal v zoznamoch.
 *
 * Samotný stav chyby pri nich nestačí: server vracia 404 aj vtedy, keď príspevok existuje a chýba len komentár
 * alebo rodič odpovede, a 403 pri úprave a zmazaní znamená „nemáš právo“. Preto sa po 404, 403 a 410 najprv overí
 * príspevok dopytom na jeho detail; až keď aj ten zlyhá rovnakým stavom, príspevok zmizol a spracuje sa ako pri
 * pridaní. Pri inej chybe detailu (sieť, 5xx) a pri iných stavoch pôvodnej chyby ostáva doterajšia hláška.
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len vonkajšie moduly; spracovanie
 * zmiznutého príspevku (`feedPostGone`) a signál zmiznutia sú skutočné.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { resetAnnouncedFeedPosts } from '../feedPostGone';
import { onFeedPostDeleted } from '../feedPostDeletedEvents';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  getFeedPost,
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
const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedToastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;
const mockedToastSuccess = jest.requireMock('react-hot-toast').default.success as jest.Mock;

const POST_ID = 5;
const GONE_MESSAGE = 'Tento príspevok už nie je dostupný.';
const GENERIC_ADD_ERROR = 'Komentár sa nepodarilo pridať.';
const GENERIC_REPLY_ERROR = 'Odpoveď sa nepodarilo pridať.';
const GENERIC_UPDATE_ERROR = 'Komentár sa nepodarilo upraviť.';
const GENERIC_DELETE_ERROR = 'Komentár sa nepodarilo zmazať.';

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

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
}

/** Chyba z API tak, ako ju vráti axios: stav a voliteľne správa v tele. */
function apiError(status: number, message?: string) {
  return { response: { status, data: message ? { error: message } : {} } };
}

type Scenario = {
  name: string;
  /** Všeobecná hláška, ktorú akcia ukáže pri chybe, keď príspevok nezmizol. */
  generic: string;
  /** Ukazuje akcia pri chybe radšej správu zo servera? Zmazanie ukazovalo vždy len všeobecnú hlášku. */
  showsServerMessage: boolean;
  /** Vyrobí zlyhanie samotnej akcie. */
  fail: (error: unknown) => void;
  /** Spustí akciu v rozhraní nad komentárom 1. */
  run: () => Promise<void>;
};

const SCENARIOS: Scenario[] = [
  {
    name: 'odpoveď',
    generic: GENERIC_REPLY_ERROR,
    showsServerMessage: true,
    fail: (error) => mockedCreate.mockRejectedValue(error),
    run: async () => {
      await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
      const composer = await screen.findByTestId('feed-reply-composer');
      await userEvent.type(within(composer).getByRole('textbox'), 'Moja odpoveď');
      await userEvent.click(screen.getByTestId('feed-reply-submit'));
    },
  },
  {
    name: 'úprava',
    generic: GENERIC_UPDATE_ERROR,
    showsServerMessage: true,
    fail: (error) => mockedUpdate.mockRejectedValue(error),
    run: async () => {
      await userEvent.click(screen.getByTestId('feed-comment-edit-1'));
      const composer = await screen.findByTestId('feed-comment-edit-composer-1');
      const field = within(composer).getByRole('textbox');
      await userEvent.clear(field);
      await userEvent.type(field, 'Upravený text');
      await userEvent.click(screen.getByTestId('feed-comment-edit-submit'));
    },
  },
  {
    name: 'zmazanie',
    generic: GENERIC_DELETE_ERROR,
    showsServerMessage: false,
    fail: (error) => mockedDelete.mockRejectedValue(error),
    run: async () => {
      await userEvent.click(screen.getByLabelText('Zmazať komentár'));
      const dialog = await screen.findByTestId('feed-comment-delete-confirm');
      await userEvent.click(within(dialog).getByTestId('feed-comment-delete-confirm-action'));
    },
  },
];

/** Signál zmiznutia príspevku, ktorý by v appke zmazal kartu zo zoznamov a zavrel otvorené vrstvy. */
let removedPosts: number[] = [];
let stopListening: () => void = () => undefined;

beforeEach(() => {
  mockedList.mockReset();
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedDelete.mockReset();
  mockedGetPost.mockReset();
  mockedToastError.mockReset();
  mockedToastSuccess.mockReset();
  // Pamäť „o príspevku už vieme“ je v module, medzi prípadmi ju treba vyčistiť.
  resetAnnouncedFeedPosts();
  removedPosts = [];
  stopListening = onFeedPostDeleted((postId) => removedPosts.push(postId));
  mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
});

afterEach(() => {
  stopListening();
});

async function openComments(onCountChange: jest.Mock = jest.fn()) {
  render(<FeedPostComments postId={POST_ID} onCountChange={onCountChange} />);
  await screen.findByText('Môj komentár');
  return onCountChange;
}

describe.each(SCENARIOS)('FeedPostComments – $name pri zmiznutom príspevku', (scenario) => {
  it.each([404, 403, 410])(
    '%i berie ako zmiznutý príspevok, keď detail príspevku zlyhá rovnako',
    async (status) => {
      const onCountChange = await openComments();
      scenario.fail(apiError(status));
      mockedGetPost.mockRejectedValue(apiError(status));

      await scenario.run();

      await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));
      // Jedna neutrálna hláška, nie „… sa nepodarilo …“, a signál zmiznutia.
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      expect(mockedToastError).not.toHaveBeenCalledWith(scenario.generic);
      expect(removedPosts).toEqual([POST_ID]);
      // Overuje sa jediným dopytom na detail PRÁVE tohto príspevku.
      expect(mockedGetPost).toHaveBeenCalledTimes(1);
      expect(mockedGetPost).toHaveBeenCalledWith(POST_ID);
      expect(onCountChange).not.toHaveBeenCalled();
    },
  );

  it.each([404, 403])(
    'ponechá špecifickú chybu, keď príde %i, no príspevok ešte existuje',
    async (status) => {
      await openComments();
      scenario.fail(apiError(status));
      mockedGetPost.mockResolvedValue({ id: POST_ID } as never);

      await scenario.run();

      // Server vracia 404 aj pre chýbajúci komentár a 403 znamená „nemáš právo“: príspevok je v poriadku.
      await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(scenario.generic));
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      expect(mockedToastError).not.toHaveBeenCalledWith(GONE_MESSAGE);
      expect(removedPosts).toEqual([]);
      expect(mockedGetPost).toHaveBeenCalledTimes(1);
    },
  );

  it('ponechá obvyklé znenie chyby, keď príspevok ešte existuje', async () => {
    await openComments();
    scenario.fail(apiError(404, 'Komentár nebol nájdený.'));
    mockedGetPost.mockResolvedValue({ id: POST_ID } as never);

    await scenario.run();

    // Texty sa nemenia: správu zo servera ukazuje tá akcia, ktorá ju ukazovala aj doteraz.
    const expected = scenario.showsServerMessage ? 'Komentár nebol nájdený.' : scenario.generic;
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(expected));
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(removedPosts).toEqual([]);
  });

  it('ponechá špecifickú chybu, keď detail príspevku zlyhá z iného dôvodu než zmiznutia príspevku', async () => {
    await openComments();
    scenario.fail(apiError(404));
    // Výpadok siete a chyba servera sú dočasné: príspevok z nich zmiznutý nie je.
    mockedGetPost.mockRejectedValue(new Error('offline'));

    await scenario.run();

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(scenario.generic));
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).not.toHaveBeenCalledWith(GONE_MESSAGE);
    expect(removedPosts).toEqual([]);
  });

  it('ponechá špecifickú chybu, keď detail príspevku odpovie chybou servera', async () => {
    await openComments();
    scenario.fail(apiError(403));
    mockedGetPost.mockRejectedValue(apiError(500));

    await scenario.run();

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(scenario.generic));
    expect(mockedToastError).not.toHaveBeenCalledWith(GONE_MESSAGE);
    expect(removedPosts).toEqual([]);
  });

  it.each([
    [500, 'chyba servera'],
    [400, 'odmietnutý vstup'],
    [401, 'chýbajúce prihlásenie'],
  ])('po %i (%s) sa na detail príspevku nepýta', async (status) => {
    await openComments();
    scenario.fail(apiError(status));

    await scenario.run();

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(scenario.generic));
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedGetPost).not.toHaveBeenCalled();
    expect(removedPosts).toEqual([]);
  });

  it('po sieťovej chybe bez odpovede sa na detail príspevku nepýta', async () => {
    await openComments();
    scenario.fail(new Error('offline'));

    await scenario.run();

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(scenario.generic));
    expect(mockedGetPost).not.toHaveBeenCalled();
    expect(removedPosts).toEqual([]);
  });
});

describe('FeedPostComments – zmiznutý príspevok a viac akcií', () => {
  it('zmiznutý príspevok ohlási raz, no pri ďalšej akcii naďalej pošle signál odstránenia', async () => {
    await openComments();
    mockedDelete.mockRejectedValue(apiError(404));
    mockedGetPost.mockRejectedValue(apiError(404));

    await SCENARIOS[2].run();
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));
    // Potvrdenie ostáva otvorené (zmazanie sa nepodarilo), takže sa dá potvrdiť znova.
    const dialog = await screen.findByTestId('feed-comment-delete-confirm');
    await userEvent.click(within(dialog).getByTestId('feed-comment-delete-confirm-action'));

    await waitFor(() => expect(mockedGetPost).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(removedPosts).toEqual([POST_ID, POST_ID]));
    // Pamäť „o príspevku už vieme“ je spoločná s ostatnými miestami Nástenky: druhá hláška nepadne.
    expect(mockedToastError).toHaveBeenCalledTimes(1);
  });

  it('ohlásenie zdieľa s cestou pridania komentára: pre ten istý príspevok žiadna druhá hláška', async () => {
    await openComments();
    mockedCreate.mockRejectedValue(apiError(404));
    mockedDelete.mockRejectedValue(apiError(404));
    mockedGetPost.mockRejectedValue(apiError(404));

    await userEvent.type(screen.getAllByRole('textbox')[0], 'Nový komentár');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));

    await SCENARIOS[2].run();
    await waitFor(() => expect(mockedGetPost).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(removedPosts).toEqual([POST_ID, POST_ID]));
    expect(mockedToastError).toHaveBeenCalledTimes(1);
  });

  it('cestu pridania komentára nemení: stále verí stavu a na nič sa nepýta', async () => {
    await openComments();
    mockedCreate.mockRejectedValue(apiError(404));

    await userEvent.type(screen.getAllByRole('textbox')[0], 'Nový komentár');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));
    expect(mockedToastError).not.toHaveBeenCalledWith(GENERIC_ADD_ERROR);
    expect(removedPosts).toEqual([POST_ID]);
    // Bez overovacieho dopytu: pridanie má vlastnú, odskúšanú cestu.
    expect(mockedGetPost).not.toHaveBeenCalled();
  });

  it('tlačidlá ostávajú zaneprázdnené, kým overenie neodpovie, takže sa akcia medzitým nedá zopakovať', async () => {
    await openComments();
    mockedDelete.mockRejectedValue(apiError(404));
    let rejectDetail: (error: unknown) => void = () => undefined;
    mockedGetPost.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDetail = reject;
        }),
    );

    await SCENARIOS[2].run();
    await waitFor(() => expect(mockedGetPost).toHaveBeenCalledTimes(1));
    const dialog = screen.getByTestId('feed-comment-delete-confirm');
    // Počas overovania sa ešte nevie, čo sa stalo: tlačidlo je vypnuté a dopyt na zmazanie sa neopakuje.
    expect(within(dialog).getByTestId('feed-comment-delete-confirm-action')).toBeDisabled();
    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedToastError).not.toHaveBeenCalled();

    rejectDetail(apiError(404));
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));
    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it('prežije zatvorenie zoznamu skôr, než overenie odpovie', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedList.mockResolvedValue(page([comment(1, 'Môj komentár')]));
    const { unmount } = render(<FeedPostComments postId={POST_ID} />);
    await screen.findByText('Môj komentár');
    mockedDelete.mockRejectedValue(apiError(404));
    let rejectDetail: (error: unknown) => void = () => undefined;
    mockedGetPost.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDetail = reject;
        }),
    );

    await SCENARIOS[2].run();
    await waitFor(() => expect(mockedGetPost).toHaveBeenCalledTimes(1));
    unmount();
    rejectDetail(apiError(404));

    // Príspevok naozaj zmizol, takže sa to oznámi aj vtedy; do stavu odmontovaného zoznamu sa nič nezapisuje.
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE));
    expect(removedPosts).toEqual([POST_ID]);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
