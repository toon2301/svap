/**
 * Okno detailu na počítači: odosielanie komentára pri prepnutí rozloženia (PR #323, nálezy CodeRabbitu a Codexu).
 *
 * Okno drží rozpísaný komentár (`useFeedCommentDraft`), aby ho neodniesli komentáre, ktoré sa pri prepnutí rozloženia
 * odmountujú. Rovnako musí držať aj to, že komentár sa práve odosiela. Inak nová inštancia komentárov začne s tlačidlom
 * „Pridať“ znova použiteľným, takže sa ten istý komentár dá odoslať druhýkrát (server duplicity nerozpozná) a odpoveď na
 * pôvodné odoslanie by vymazala text, ktorý používateľ medzitým napísal.
 *
 * Pole sa po úspešnom odoslaní vyprázdni len vtedy, keď ešte obsahuje odoslaný text. Odosielanie patrí príspevku, z ktorého
 * sa odosiela: iný príspevok v okne nie je blokovaný a po návrate k pôvodnému odosielanie stále beží.
 *
 * Zmenu šírky obrazovky simuluje atrapa `useIsMobile` a opätovné vykreslenie okna; odpoveď servera na odoslanie dorazí, až
 * keď to test povie.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  createFeedPostComment,
  getFeedPost,
  type FeedPost,
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
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;
const toastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;

const NAZOV_POLA = 'Napíš komentár...';

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ZAKLAD = {
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok s daným `id` a jednou schválenou fotkou. */
function prispevokSFotkou(id: number): FeedPost {
  return {
    ...ZAKLAD,
    id,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
  } as unknown as FeedPost;
}

/** Zdieľaná ponuka s daným `id` (bez fotky). */
function ponuka(id: number): FeedPost {
  return {
    ...ZAKLAD,
    id,
    post_type: 'shared_offer',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: 'offer',
      title: 'Programovanie',
      category: 'it',
      caption: '',
      id: 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: false,
      price_negotiable: false,
      price_from: '25',
      price_currency: '€',
    },
  } as unknown as FeedPost;
}

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

const onClose = jest.fn();

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  mockedCreate.mockReset();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

const pole = () => screen.getByLabelText(NAZOV_POLA) as HTMLTextAreaElement;

/** Tlačidlo odoslania nového komentára; počas odosielania sa volá inak než v pokoji. */
const tlacidloOdoslania = () =>
  screen.getByRole('button', { name: /^(Pridať|Odosielam\.\.\.)$/ });

function napis(text: string) {
  fireEvent.change(pole(), { target: { value: text } });
}

/** Príspevky podľa `id`: okno si pri prepnutí vyžiada nový príspevok a dostane ho hneď. */
function odpovedajPrispevkami(...prispevky: FeedPost[]) {
  mockedGetPost.mockImplementation((id) => {
    const najdeny = prispevky.find((prispevok) => prispevok.id === id);
    return najdeny ? Promise.resolve(najdeny) : Promise.reject(new Error('neznámy príspevok'));
  });
}

/** Otvorí okno na príspevku `postId` a počká, kým je vykreslený príspevok aj pole na komentár. */
async function otvor(postId: number) {
  const view = render(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
  await screen.findByTestId('feed-post-card');
  await screen.findByLabelText(NAZOV_POLA);
  return view;
}

/** Prepne okno na iný príspevok a počká, kým sa načíta a kým sa objaví jeho pole na komentár. */
async function prepniNa(view: ReturnType<typeof render>, postId: number) {
  view.rerender(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
  await waitFor(() => expect(screen.queryByTestId('feed-post-overlay-loading')).toBeNull());
  await screen.findByLabelText(NAZOV_POLA);
}

/** Zmení šírku obrazovky: `uzka` = pod 1 024 px (jednostĺpcové rozloženie), inak dva stĺpce. */
async function zmenSirku(view: ReturnType<typeof render>, postId: number, uzka: boolean) {
  mockIsMobile = uzka;
  view.rerender(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
  await screen.findByTestId(uzka ? 'feed-post-overlay-fixed' : 'feed-post-overlay-split');
  await screen.findByLabelText(NAZOV_POLA);
}

/** Napíše komentár a odošle ho; odpoveď servera ostane otvorená, kým ju test nerozhodne. */
async function odosli(text: string) {
  const odpoved = odlozena();
  mockedCreate.mockReturnValue(odpoved.promise);
  napis(text);
  fireEvent.click(tlacidloOdoslania());
  await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
  return odpoved;
}

/** Odpoveď servera dorazí a obsluha odoslania dobehne celá, vrátane prekreslenia. */
async function dokonciOdoslanie(odpoved: ReturnType<typeof odlozena>, komentarZoServera: FeedPostComment) {
  await act(async () => {
    odpoved.dokonci(komentarZoServera);
    await odpoved.promise;
  });
}

const PRISPEVKY: Array<[string, (id: number) => FeedPost]> = [
  ['príspevok s fotkou', prispevokSFotkou],
  ['zdieľaná ponuka', ponuka],
];

describe('okno detailu: odosielanie komentára pri prepnutí rozloženia', () => {
  it.each(PRISPEVKY)(
    '%s: po zúžení okna počas odosielania sa komentár nedá odoslať druhýkrát',
    async (_nazov, vytvor) => {
      odpovedajPrispevkami(vytvor(7));
      const view = await otvor(7);
      await odosli('Rozpísaný komentár');

      await zmenSirku(view, 7, true);

      expect(tlacidloOdoslania()).toHaveTextContent('Odosielam...');
      expect(tlacidloOdoslania()).toBeDisabled();
      fireEvent.click(tlacidloOdoslania());
      expect(mockedCreate).toHaveBeenCalledTimes(1);
    },
  );

  it('po rozšírení okna počas odosielania sa komentár nedá odoslať druhýkrát', async () => {
    mockIsMobile = true;
    odpovedajPrispevkami(prispevokSFotkou(7));
    const view = await otvor(7);
    await odosli('Rozpísaný komentár');

    await zmenSirku(view, 7, false);

    expect(tlacidloOdoslania()).toHaveTextContent('Odosielam...');
    expect(tlacidloOdoslania()).toBeDisabled();
    fireEvent.click(tlacidloOdoslania());
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it('po dokončení odosielania je pole prázdne a tlačidlo sa dá znova použiť', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    const view = await otvor(7);
    const odpoved = await odosli('Rozpísaný komentár');
    await zmenSirku(view, 7, true);

    await dokonciOdoslanie(odpoved, komentar(1, 'Rozpísaný komentár'));

    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(pole()).toHaveValue('');
    napis('Ďalší komentár');
    expect(tlacidloOdoslania()).toBeEnabled();
  });

  it('odpoveď servera nezmaže text, ktorý používateľ medzitým napísal', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    const view = await otvor(7);
    const odpoved = await odosli('Rozpísaný komentár');
    await zmenSirku(view, 7, true);
    napis('Nový komentár');

    await dokonciOdoslanie(odpoved, komentar(1, 'Rozpísaný komentár'));

    expect(pole()).toHaveValue('Nový komentár');
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(tlacidloOdoslania()).toBeEnabled();
  });

  it('po zlyhaní odosielania ostane text v poli a odoslanie sa dá zopakovať', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    const view = await otvor(7);
    const odpoved = await odosli('Rozpísaný komentár');
    await zmenSirku(view, 7, true);

    await act(async () => {
      odpoved.zlyha({ response: { status: 500, data: {} } });
      await odpoved.promise.catch(() => undefined);
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(pole()).toHaveValue('Rozpísaný komentár');
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(tlacidloOdoslania()).toBeEnabled();
    mockedCreate.mockResolvedValue(komentar(2, 'Rozpísaný komentár'));
    fireEvent.click(tlacidloOdoslania());
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));
  });
});

describe('okno detailu: odosielanie komentára bez prepnutia rozloženia', () => {
  it('text napísaný počas odosielania sa po odpovedi servera nezmaže', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    await otvor(7);
    const odpoved = await odosli('Rozpísaný komentár');
    napis('Nový komentár');

    await dokonciOdoslanie(odpoved, komentar(1, 'Rozpísaný komentár'));

    expect(pole()).toHaveValue('Nový komentár');
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
  });

  it('odoslaný text sa po odpovedi servera vyprázdni aj vtedy, keď sa medzitým zmenili okrajové medzery', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    await otvor(7);
    const odpoved = await odosli('Rozpísaný komentár');
    napis('Rozpísaný komentár  ');

    await dokonciOdoslanie(odpoved, komentar(1, 'Rozpísaný komentár'));

    expect(pole()).toHaveValue('');
  });

  it('písanie do poľa nespúšťa nové načítanie a fokus ostáva v poli', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    await otvor(7);
    const volaniaPrispevku = mockedGetPost.mock.calls.length;
    const volaniaKomentarov = mockedListComments.mock.calls.length;
    const poleNaZaciatku = pole();
    const pouzivatel = userEvent.setup();

    await pouzivatel.click(poleNaZaciatku);
    await pouzivatel.type(poleNaZaciatku, 'Dlhší text komentára písaný znak po znaku');

    expect(pole()).toBe(poleNaZaciatku);
    expect(pole()).toHaveFocus();
    expect(pole()).toHaveValue('Dlhší text komentára písaný znak po znaku');
    expect(mockedGetPost.mock.calls.length).toBe(volaniaPrispevku);
    expect(mockedListComments.mock.calls.length).toBe(volaniaKomentarov);
  });
});

describe('okno detailu: odosielanie komentára a prepnutie na iný príspevok', () => {
  it('odosielanie jedného príspevku neblokuje iný príspevok a po návrate stále beží', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7), prispevokSFotkou(8));
    const view = await otvor(7);
    const odpoved = await odosli('Text pre sedem');

    await prepniNa(view, 8);
    napis('Text pre osem');
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(tlacidloOdoslania()).toBeEnabled();

    await prepniNa(view, 7);
    expect(pole()).toHaveValue('Text pre sedem');
    expect(tlacidloOdoslania()).toHaveTextContent('Odosielam...');
    expect(tlacidloOdoslania()).toBeDisabled();

    await dokonciOdoslanie(odpoved, komentar(1, 'Text pre sedem'));

    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(pole()).toHaveValue('');
  });

  it('dokončenie odosielania z predošlého príspevku nezmaže text a nepustí odoslanie iného príspevku', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7), prispevokSFotkou(8));
    const view = await otvor(7);
    const odpoved = await odosli('Text pre sedem');
    await prepniNa(view, 8);
    napis('Text pre osem');

    await dokonciOdoslanie(odpoved, komentar(1, 'Text pre sedem'));

    expect(pole()).toHaveValue('Text pre osem');
    expect(tlacidloOdoslania()).toHaveTextContent('Pridať');
    expect(tlacidloOdoslania()).toBeEnabled();
  });
});
