/**
 * Odosielanie komentára, keď text aj priebeh odosielania drží rodič (vlastnosť `draft`, PR #323, nálezy CodeRabbitu a
 * Codexu).
 *
 * Okno detailu pri prepnutí rozloženia komentáre odmountuje, takže ich vlastný stav „odosiela sa“ by sa stratil a nová
 * inštancia by dovolila odoslať ten istý komentár druhýkrát. S vlastnosťou `draft` komponent priebeh odosielania neberie zo
 * svojho stavu, ale od rodiča, a o začiatku aj konci odosielania mu hlási. Po úspešnom odoslaní nevyprázdni pole sám: rodiča
 * upozorní na odoslaný text a ten pole vyprázdni, len ak ho ešte obsahuje (odpoveď servera, ktorá dorazí neskoro, tak nezmaže
 * text napísaný medzitým). Bez vlastnosti (karta, mobilný detail, panel nad fotkou) sa nič nemení.
 *
 * Testy používajú len verejné rozhranie komponentu (DOM a volania atrap `feedApi` a toastu) a mockujú len vonkajšie
 * moduly.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import type { FeedCommentDraft } from '../FeedPostComments.types';
import {
  createFeedPostComment,
  listFeedPostComments,
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

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: () => null,
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const toastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;

const NAZOV_POLA = 'Napíš komentár...';

const autor = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function komentar(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

/** Odpoveď servera, ktorú test rozhodne: kedy a ako dorazí. */
function odlozena() {
  let dokonci: (komentarZoServera: FeedPostComment) => void = () => undefined;
  let zlyha: (chyba: unknown) => void = () => undefined;
  const promise = new Promise<FeedPostComment>((resolve, reject) => {
    dokonci = resolve;
    zlyha = reject;
  });
  return { promise, dokonci, zlyha };
}

/** Koncept s atrapami; `prepis` mení len to, čo test potrebuje. */
function koncept(prepis: Partial<FeedCommentDraft> = {}): FeedCommentDraft {
  return {
    value: '',
    onChange: jest.fn(),
    submitting: false,
    onSubmittingChange: jest.fn(),
    onSent: jest.fn(),
    ...prepis,
  };
}

const pole = () => screen.getByLabelText(NAZOV_POLA) as HTMLTextAreaElement;

/** Tlačidlo odoslania nového komentára; počas odosielania sa volá inak než v pokoji. */
const tlacidloOdoslania = () =>
  screen.getByRole('button', { name: /^(Pridať|Odosielam\.\.\.)$/ });

/** Počká, kým dobehne načítanie (prázdneho) zoznamu komentárov, aby sa po konci testu nič nedialo mimo `act`. */
const pockajNaZoznam = () => screen.findByTestId('feed-comments-empty');

async function vykresli(draft: FeedCommentDraft) {
  const result = render(<FeedPostComments postId={5} draft={draft} />);
  await pockajNaZoznam();
  return result;
}

beforeEach(() => {
  mockedList.mockReset();
  mockedCreate.mockReset();
  toastError.mockReset();
  mockedList.mockResolvedValue({ results: [], next: null, previous: null, count: 0 });
});

describe('FeedPostComments: odosielanie s vlastnosťou draft', () => {
  it('odosielanie od rodiča vypne tlačidlo a ukáže „Odosielam...“, pole ostáva upraviteľné', async () => {
    await vykresli(koncept({ value: 'Rozpísaný komentár', submitting: true }));

    expect(tlacidloOdoslania()).toHaveTextContent('Odosielam...');
    expect(tlacidloOdoslania()).toBeDisabled();
    expect(pole()).toBeEnabled();
  });

  it('bez odosielania od rodiča je tlačidlo použiteľné, keď je v poli text', async () => {
    await vykresli(koncept({ value: 'Rozpísaný komentár' }));

    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(tlacidloOdoslania()).toBeEnabled();
  });

  it('odosielanie od rodiča nedovolí odoslať komentár druhýkrát', async () => {
    await vykresli(koncept({ value: 'Rozpísaný komentár', submitting: true }));

    fireEvent.click(tlacidloOdoslania());

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('ohlási rodičovi začiatok odosielania a po odpovedi servera jeho koniec', async () => {
    const odpoved = odlozena();
    mockedCreate.mockReturnValue(odpoved.promise);
    const draft = koncept({ value: 'Rozpísaný komentár' });
    await vykresli(draft);

    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(draft.onSubmittingChange).toHaveBeenCalledWith(true));
    expect(draft.onSubmittingChange).not.toHaveBeenCalledWith(false);

    await act(async () => {
      odpoved.dokonci(komentar(1, 'Rozpísaný komentár'));
      await odpoved.promise;
    });

    expect(draft.onSubmittingChange).toHaveBeenLastCalledWith(false);
  });

  it('si v režime draft nedrží vlastný stav odosielania: tlačidlo sa mení len podľa rodiča', async () => {
    const odpoved = odlozena();
    mockedCreate.mockReturnValue(odpoved.promise);
    await vykresli(koncept({ value: 'Rozpísaný komentár' }));

    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));

    // Rodič odosielanie neprevzal (atrapa), takže komponent sám nič nezamkol.
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    await act(async () => {
      odpoved.dokonci(komentar(1, 'Rozpísaný komentár'));
      await odpoved.promise;
    });
  });

  it('po úspešnom odoslaní upozorní rodiča na odoslaný text a pole sám nevyprázdňuje', async () => {
    mockedCreate.mockResolvedValue(komentar(1, 'Rozpísaný komentár'));
    const draft = koncept({ value: '  Rozpísaný komentár  ' });
    await vykresli(draft);

    fireEvent.click(tlacidloOdoslania());

    await waitFor(() => expect(draft.onSent).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(5, 'Rozpísaný komentár');
    expect(draft.onSent).toHaveBeenCalledWith('Rozpísaný komentár');
    expect(draft.onChange).not.toHaveBeenCalled();
  });

  it('upozorní rodiča na text, ktorý odišiel na server, aj keď sa pole počas odosielania zmenilo', async () => {
    const odpoved = odlozena();
    mockedCreate.mockReturnValue(odpoved.promise);
    const draft = koncept({ value: 'Rozpísaný komentár' });
    const { rerender } = await vykresli(draft);
    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));

    rerender(<FeedPostComments postId={5} draft={{ ...draft, value: 'Rozpísaný komentár a ešte niečo' }} />);
    await act(async () => {
      odpoved.dokonci(komentar(1, 'Rozpísaný komentár'));
      await odpoved.promise;
    });

    expect(mockedCreate).toHaveBeenCalledWith(5, 'Rozpísaný komentár');
    expect(draft.onSent).toHaveBeenCalledWith('Rozpísaný komentár');
  });

  it('po zlyhaní odoslania neohlási odoslaný text a odosielanie ukončí', async () => {
    mockedCreate.mockRejectedValue({ response: { status: 500, data: {} } });
    const draft = koncept({ value: 'Rozpísaný komentár' });
    await vykresli(draft);

    fireEvent.click(tlacidloOdoslania());

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(draft.onSent).not.toHaveBeenCalled();
    expect(draft.onChange).not.toHaveBeenCalled();
    expect(draft.onSubmittingChange).toHaveBeenLastCalledWith(false);
  });
});

describe('FeedPostComments: odosielanie bez vlastnosti draft (správanie sa nemení)', () => {
  it('vlastný stav odosielania vypne tlačidlo a po odpovedi servera pole vyprázdni', async () => {
    const odpoved = odlozena();
    mockedCreate.mockReturnValue(odpoved.promise);
    render(<FeedPostComments postId={5} />);
    await pockajNaZoznam();
    fireEvent.change(pole(), { target: { value: 'Vlastný text' } });

    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(tlacidloOdoslania()).toHaveTextContent('Odosielam...'));
    expect(tlacidloOdoslania()).toBeDisabled();

    await act(async () => {
      odpoved.dokonci(komentar(1, 'Vlastný text'));
      await odpoved.promise;
    });

    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(pole()).toHaveValue('');
  });

  it('pole sa po odpovedi servera vyprázdni vždy, aj keď sa text počas odosielania zmenil', async () => {
    const odpoved = odlozena();
    mockedCreate.mockReturnValue(odpoved.promise);
    render(<FeedPostComments postId={5} />);
    await pockajNaZoznam();
    fireEvent.change(pole(), { target: { value: 'Vlastný text' } });
    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    fireEvent.change(pole(), { target: { value: 'Vlastný text a ešte niečo' } });

    await act(async () => {
      odpoved.dokonci(komentar(1, 'Vlastný text'));
      await odpoved.promise;
    });

    expect(pole()).toHaveValue('');
  });
});
