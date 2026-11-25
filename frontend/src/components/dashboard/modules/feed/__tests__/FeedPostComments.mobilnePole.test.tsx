/**
 * Jedno pole dole na mobile slúži na komentár aj na odpoveď (R75, kolo 3b redizajnu komentárov).
 *
 * Mobilný detail príspevku a panel nad fotkou zapínajú `mobileReplyField`: ťuk na „Odpovedať“ neotvorí pole pod komentárom,
 * ale prepne to isté pole dole na odpoveď (riadok „Odpovedáš: Meno“, krížik, fialové „Odpovedať“ pri cieli). Komentár aj
 * odpoveď majú každý svoj text, po krížiku alebo po odoslaní je pole späť na komentár a nová odpoveď sa zobrazí v zábere.
 * Bez `mobileReplyField` (počítač) ostáva všetko ako doteraz.
 *
 * jsdom nelayoutuje, takže sa rozmery pri posune zoznamu dodávajú mockom `getBoundingClientRect`.
 */

import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostComments from '../FeedPostComments';
import { REPLY_SCROLL_CONTEXT_PX } from '../useFeedReplyScroll';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_kluc: string, nahradny: string) => nahradny,
    locale: 'sk',
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<typeof deleteFeedPostComment>;

const jana = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };
const peter = { id: 2, display_name: 'Peter', slug: 'peter', user_type: 'individual', avatar_url: null };

function komentar(
  id: number,
  text: string,
  autor = jana,
  navyse: Partial<FeedPostComment> = {},
): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T10:00:00Z',
    ...navyse,
  } as unknown as FeedPostComment;
}

function odpoved(id: number, text: string, rodic: number): FeedPostComment {
  return {
    id,
    text,
    author: peter,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: rodic,
    created_at: '2026-01-02T10:00:00Z',
  } as unknown as FeedPostComment;
}

function strana(results: FeedPostComment[]) {
  return { results, next: null, previous: null, count: results.length };
}

type Vlastnosti = ComponentProps<typeof FeedPostComments>;

async function vykresli(navyse: Partial<Vlastnosti> = {}, komentare?: FeedPostComment[]) {
  mockedList.mockResolvedValue(
    strana(komentare ?? [komentar(1, 'Prvý komentár', jana), komentar(2, 'Druhý komentár', peter)]),
  );
  const view = render(
    <FeedPostComments postId={5} fillHeight compactComposer mobileReplyField {...navyse} />,
  );
  await screen.findByText('Prvý komentár');
  return view;
}

/** Jediné pole dole; v režime odpovede aj komentára je to tá istá `textarea`. */
const pole = () =>
  screen.getByTestId('feed-comment-mobile-composer').querySelector('textarea') as HTMLTextAreaElement;

/** Dodá rozmery, ktoré jsdom nepozná: zoznam a nová odpoveď (id 9). */
function nastavRozmery(zoznam: { top: number; bottom: number }, odpovedPoloha: { top: number; bottom: number }) {
  jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      const r =
        this.getAttribute('data-testid') === 'feed-comments-scroll'
          ? zoznam
          : this.getAttribute('data-comment-id') === '9'
            ? odpovedPoloha
            : { top: 0, bottom: 0 };
      return {
        ...r,
        left: 0,
        right: 0,
        width: 0,
        height: r.bottom - r.top,
        x: 0,
        y: r.top,
        toJSON: () => ({}),
      } as DOMRect;
    });
}

const scrollTo = jest.fn();
const povodneScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: scrollTo, configurable: true });
});

afterAll(() => {
  if (povodneScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', povodneScrollTo);
  else delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ťuk na „Odpovedať“ prepne spodné pole', () => {
  it('neotvorí pole pod komentárom, ale prepne pole dole na odpoveď a zaostrí ho', async () => {
    await vykresli();

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    expect(screen.queryByTestId('feed-reply-composer')).toBeNull();
    expect(screen.getByTestId('feed-reply-target')).toHaveTextContent('Odpovedáš: Jana');
    expect(pole()).toHaveAttribute('placeholder', 'Napíš odpoveď...');
    expect(pole()).toHaveFocus();
    expect(screen.getByTestId('feed-reply-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comment-send')).toHaveAccessibleName('Odpovedať');
  });

  it('„Odpovedať“ pri cieli je fialové a označené ako stlačené, pri ostatných komentároch nie', async () => {
    await vykresli();

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    const cielove = screen.getByTestId('feed-comment-reply-1');
    expect(cielove).toHaveAttribute('aria-pressed', 'true');
    expect(cielove).toHaveClass('text-purple-600', 'dark:text-purple-300');
    expect(cielove).not.toHaveClass('text-gray-500');
    const ostatne = screen.getByTestId('feed-comment-reply-2');
    expect(ostatne).toHaveAttribute('aria-pressed', 'false');
    expect(ostatne).toHaveClass('text-gray-500');
    expect(ostatne).not.toHaveClass('text-purple-600');
  });

  it('rozpísaný komentár sa nestratí: po krížiku je text komentára späť a text odpovede sa zahodí', async () => {
    await vykresli();
    await userEvent.type(pole(), 'Skvelý príspevok');

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    expect(pole()).toHaveValue('');
    await userEvent.type(pole(), 'Moja odpoveď');
    await userEvent.click(screen.getByTestId('feed-reply-cancel'));

    expect(screen.queryByTestId('feed-reply-target')).toBeNull();
    expect(screen.queryByTestId('feed-reply-cancel')).toBeNull();
    expect(pole()).toHaveValue('Skvelý príspevok');
    expect(pole()).toHaveAttribute('placeholder', 'Napíš komentár...');
    expect(screen.getByTestId('feed-comment-reply-1')).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    expect(pole()).toHaveValue('');
  });

  it('prepnutie na iný komentár zmení len cieľ, text odpovede ostane', async () => {
    await vykresli();
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    await userEvent.type(pole(), 'Rozpísaná odpoveď');

    await userEvent.click(screen.getByTestId('feed-comment-reply-2'));

    expect(screen.getByTestId('feed-reply-target')).toHaveTextContent('Odpovedáš: Peter');
    expect(pole()).toHaveValue('Rozpísaná odpoveď');
    expect(screen.getByTestId('feed-comment-reply-1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('feed-comment-reply-2')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opätovný ťuk na „Odpovedať“ pri aktívnom cieli režim neukončí ani nezmaže text', async () => {
    await vykresli();
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    await userEvent.type(pole(), 'Rozpísaná odpoveď');

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    expect(screen.getByTestId('feed-reply-target')).toHaveTextContent('Odpovedáš: Jana');
    expect(pole()).toHaveValue('Rozpísaná odpoveď');
    expect(pole()).toHaveFocus();
  });

  it('dĺžku kontroluje text aktuálneho režimu: dlhá odpoveď ukáže počítadlo, dlhý koncept komentára pri odpovedi nie', async () => {
    await vykresli();
    // Koncept komentára je dlhší než limit: počítadlo je pri komentári, pri odpovedi s krátkym textom nie.
    fireEvent.change(pole(), { target: { value: 'a'.repeat(501) } });
    expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('501/500');

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    expect(screen.queryByTestId('feed-comment-counter')).toBeNull();

    // Dlhá odpoveď: počítadlo a zakázaná ikona odoslania.
    fireEvent.change(pole(), { target: { value: 'b'.repeat(501) } });
    expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('501/500');
    expect(screen.getByTestId('feed-comment-send')).toBeDisabled();

    // Krížik vráti pole na dlhý koncept komentára, ktorý má počítadlo ako predtým.
    await userEvent.click(screen.getByTestId('feed-reply-cancel'));
    expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('501/500');
    expect(pole()).toHaveValue('a'.repeat(501));
  });

  it('ikona odoslania je v režime odpovede zakázaná, kým je pole prázdne', async () => {
    await vykresli();

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    expect(screen.getByTestId('feed-comment-send')).toBeDisabled();

    await userEvent.type(pole(), 'a');
    expect(screen.getByTestId('feed-comment-send')).toBeEnabled();
  });
});

describe('odoslanie odpovede', () => {
  async function odpovedzNaPrvy(text = 'Moja odpoveď') {
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    await userEvent.type(pole(), text);
    await userEvent.click(screen.getByTestId('feed-comment-send'));
  }

  it('pošle text s id rodiča, rozbalí vlákno s novou odpoveďou a vráti pole na rozpísaný komentár', async () => {
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli();
    await userEvent.type(pole(), 'Skvelý príspevok');

    await odpovedzNaPrvy();

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith(5, 'Moja odpoveď', 1));
    const vlakno = await screen.findByTestId('feed-comment-replies-1');
    expect(within(vlakno).getByText('Moja odpoveď')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('feed-reply-target')).toBeNull());
    expect(pole()).toHaveValue('Skvelý príspevok');
    expect(pole()).toHaveAttribute('placeholder', 'Napíš komentár...');
    expect(screen.getByTestId('feed-comment-reply-1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('zoznam sa posunie na novú odpoveď, keď nie je celá vidieť (s rezervou nad ňou)', async () => {
    nastavRozmery({ top: 0, bottom: 300 }, { top: 500, bottom: 560 });
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli();

    await odpovedzNaPrvy();

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(scrollTo).toHaveBeenCalledWith({
      top: 500 - REPLY_SCROLL_CONTEXT_PX,
      behavior: 'auto',
    });
  });

  it('vysoká odpoveď: rezerva nad ňou sa zmenší, aby sa zmestila celá (zoznam pri klávesnici je nízky)', async () => {
    // Zoznam 400 px, odpoveď 380 px: s pevnou rezervou 72 px by spodných 52 px ostalo pod okrajom.
    nastavRozmery({ top: 0, bottom: 400 }, { top: 600, bottom: 980 });
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli();

    await odpovedzNaPrvy();

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    // Voľné miesto okolo odpovede je 400 − 380 = 20 px, z toho 8 px odstup od okraja zostáva na rezervu 12 px.
    expect(scrollTo).toHaveBeenCalledWith({ top: 600 - 12, behavior: 'auto' });
  });

  it('odpoveď vyššia než zoznam sa zarovná k jeho vrchu bez rezervy', async () => {
    nastavRozmery({ top: 0, bottom: 300 }, { top: 600, bottom: 1000 });
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli();

    await odpovedzNaPrvy();

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(scrollTo).toHaveBeenCalledWith({ top: 600, behavior: 'auto' });
  });

  it('odpoveď, ktorá je celá vo viditeľnej ploche, zoznam nehýbe', async () => {
    nastavRozmery({ top: 0, bottom: 300 }, { top: 100, bottom: 160 });
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli();

    await odpovedzNaPrvy();

    await screen.findByTestId('feed-comment-replies-1');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('pri zlyhaní odoslania ostane režim odpovede aj napísaný text a ukáže sa chyba', async () => {
    mockedCreate.mockRejectedValue(new Error('chyba'));
    await vykresli();

    await odpovedzNaPrvy();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByTestId('feed-reply-target')).toHaveTextContent('Odpovedáš: Jana');
    expect(pole()).toHaveValue('Moja odpoveď');
    expect(pole()).not.toHaveAttribute('readonly');
    expect(screen.getByTestId('feed-comment-send')).toBeEnabled();
  });

  it('počas odosielania je pole len na čítanie a ikona odoslania zakázaná, po dokončení sa pole vráti', async () => {
    let dokonci: (hodnota: FeedPostComment) => void = () => undefined;
    mockedCreate.mockReturnValue(
      new Promise<FeedPostComment>((resolve) => {
        dokonci = resolve;
      }),
    );
    await vykresli();

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    await userEvent.type(pole(), 'Moja odpoveď');
    // `fireEvent`: ťuk na tlačidlo v jsdom (na rozdiel od iPhonu) presúva fokus na tlačidlo, čo tu nesledujeme.
    fireEvent.click(screen.getByTestId('feed-comment-send'));

    await waitFor(() => expect(pole()).toHaveAttribute('readonly'));
    expect(screen.getByTestId('feed-comment-send')).toBeDisabled();
    // `readonly`, nie `disabled`: zakázané pole by stratilo fokus a klávesnica by sa zavrela.
    expect(pole()).toHaveFocus();

    await act(async () => dokonci(odpoved(9, 'Moja odpoveď', 1)));
    await waitFor(() => expect(screen.queryByTestId('feed-reply-target')).toBeNull());
    expect(pole()).not.toHaveAttribute('readonly');
  });

  it('nový komentár sa v režime komentára odosiela ako doteraz (bez rodiča)', async () => {
    mockedCreate.mockResolvedValue(komentar(8, 'Nový komentár', jana));
    await vykresli();

    await userEvent.type(pole(), 'Nový komentár');
    await userEvent.click(screen.getByTestId('feed-comment-send'));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith(5, 'Nový komentár'));
    await waitFor(() => expect(pole()).toHaveValue(''));
  });
});

describe('cieľ odpovede zmizol', () => {
  it('keď sa komentár, na ktorý sa odpovedá, zmaže, pole sa vráti na komentár', async () => {
    mockedDelete.mockResolvedValue(undefined);
    await vykresli({}, [
      komentar(1, 'Prvý komentár', jana, { can_delete: true }),
      komentar(2, 'Druhý komentár', peter),
    ]);
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    expect(screen.getByTestId('feed-reply-target')).toBeInTheDocument();

    const prvy = document.querySelector('[data-comment-id="1"]') as HTMLElement;
    await userEvent.click(within(prvy).getByRole('button', { name: 'Zmazať komentár' }));
    await userEvent.click(await screen.findByTestId('feed-comment-delete-confirm-action'));

    await waitFor(() => expect(screen.queryByText('Prvý komentár')).toBeNull());
    await waitFor(() => expect(screen.queryByTestId('feed-reply-target')).toBeNull());
    expect(pole()).toHaveAttribute('placeholder', 'Napíš komentár...');
  });
});

describe('fokus poľa', () => {
  it('ohlási získanie a stratu fokusu a pri odmontovaní ohlási, že fokus nemá', async () => {
    const zmena = jest.fn();
    const { unmount } = await vykresli({ onFieldFocusChange: zmena });

    fireEvent.focus(pole());
    expect(zmena).toHaveBeenLastCalledWith(true);
    fireEvent.blur(pole());
    expect(zmena).toHaveBeenLastCalledWith(false);

    fireEvent.focus(pole());
    expect(zmena).toHaveBeenLastCalledWith(true);
    unmount();
    expect(zmena).toHaveBeenLastCalledWith(false);
  });

  it('pole je pri prepnutí na odpoveď ten istý prvok, takže klávesnica ostane otvorená', async () => {
    await vykresli();
    const predtym = pole();
    predtym.focus();

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    expect(pole()).toBe(predtym);
    expect(pole()).toHaveFocus();
  });
});

describe('bez `mobileReplyField` (počítač) sa nič nemení', () => {
  it('ťuk na „Odpovedať“ otvorí pole pod komentárom, spodné pole ostáva komentárom a „Odpovedať“ nie je fialové', async () => {
    await vykresli({ mobileReplyField: false });

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    expect(await screen.findByTestId('feed-reply-composer')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-reply-target')).toBeNull();
    expect(screen.queryByTestId('feed-reply-cancel')).toBeNull();
    expect(screen.queryByTestId('feed-comment-mobile-composer')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Napíš komentár...' })).toBeInTheDocument();
    const odpovedat = screen.getByTestId('feed-comment-reply-1');
    expect(odpovedat).not.toHaveAttribute('aria-pressed');
    expect(odpovedat).not.toHaveClass('text-purple-600');
  });

  it('po odoslaní odpovede sa zoznam nehýbe (posun na novú odpoveď je len mobilný)', async () => {
    nastavRozmery({ top: 0, bottom: 300 }, { top: 500, bottom: 560 });
    mockedCreate.mockResolvedValue(odpoved(9, 'Moja odpoveď', 1));
    await vykresli({ mobileReplyField: false });

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Napíš odpoveď...' }), 'Moja odpoveď');
    await userEvent.click(screen.getByTestId('feed-reply-submit'));

    await screen.findByTestId('feed-comment-replies-1');
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
