/**
 * Mobilná obrazovka detailu: komentár z upozornenia (nález 360, krok 1 zrušenia starého spôsobu detailu príspevku).
 *
 * Upozornenie na komentár, odpoveď alebo lajk komentára vedie na adresu `/dashboard/feed/<id>?comment=<id>`. Starý spôsob
 * (stránka `FeedPostDetailModule`) takého komentára doscrolloval a zvýraznil, nová obrazovka detailu cieľový komentár
 * nepoznala, takže jej zrušenie nebolo možné. Obrazovka teraz dostáva voliteľnú vlastnosť `highlightCommentId` a podáva ju
 * zoznamu komentárov (`FeedPostComments`), ktorý hľadá a zvýrazňuje cieľ.
 *
 * Scenáre sú prenesené z testov starého modulu (`FeedPostDetailModule.test.tsx`, ktorý sa so zrušením modulu zmazal): posun a
 * dočasné zvýraznenie, hľadanie mimo prvej stránky, strop stránok, zastavenie pri konci vlákna a pri zlyhaní, jediné
 * zvýraznenie, druhá a ďalšia upozornenie a okno nad pollovacím stropom. Navyše sa overuje, že cieľový komentár má prednosť
 * pred štartovacou polohou pri komentároch (ten istý plynulý posun by sa s ním bil). Testy idú cez verejné rozhranie
 * obrazovky (vlastnosti, DOM, `data-comment-id` a atrapy `listFeedPostComments` a `scrollIntoView`).
 */

import { act, configure, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

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

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
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

// Stránkovanie komentárov sa na vyťaženom CI nezmestí do predvolenej 1 s.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const ZVYRAZNENIE = 'bg-purple-100/80';

function prispevok(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 9,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

function komentar(id: number, text: string) {
  return {
    id,
    text,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T11:00:00Z',
  };
}

function strana(
  komentare: Array<ReturnType<typeof komentar>>,
  extra: { next?: string | null; count?: number | undefined } = {},
) {
  return { results: komentare, next: extra.next ?? null, previous: null, count: extra.count };
}

function zvyraznenyKomentar(id: number): boolean {
  return Boolean(
    document.querySelector(`[data-comment-id="${id}"]`)?.className.includes(ZVYRAZNENIE),
  );
}

/** Atrapa `scrollIntoView` (jsdom ju nemá); vráti ju, aby sa dalo overiť, či a koľkokrát sa volala. */
function nainstalujScrollIntoView() {
  const scrollIntoView = jest.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  });
  return scrollIntoView;
}

function vykresli(ciel: number | null, post: FeedPost = prispevok()) {
  const view = render(<FeedPostMobileDetail post={post} onClose={jest.fn()} highlightCommentId={ciel} />);
  return {
    ...view,
    zmenCiel: (novyCiel: number | null, novyPost: FeedPost = post) =>
      view.rerender(<FeedPostMobileDetail post={novyPost} onClose={jest.fn()} highlightCommentId={novyCiel} />),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('komentár z upozornenia v obrazovke detailu', () => {
  it('doscrolluje na komentár z upozornenia a krátko ho zvýrazní', async () => {
    jest.useFakeTimers();
    const scrollIntoView = nainstalujScrollIntoView();
    mockedList.mockResolvedValue(strana([komentar(41, 'Starší'), komentar(42, 'Ten z upozornenia')], { count: 2 }) as never);

    vykresli(42);
    await screen.findByText('Ten z upozornenia');

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(zvyraznenyKomentar(42)).toBe(true);

    // Zvýraznenie je len dočasné.
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(zvyraznenyKomentar(42)).toBe(false);
  });

  it('bez cieľového komentára sa nič neposúva ani nezvýrazňuje', async () => {
    const scrollIntoView = nainstalujScrollIntoView();
    mockedList.mockResolvedValue(strana([komentar(41, 'Starší'), komentar(42, 'Novší')], { count: 2 }) as never);

    vykresli(null);
    await screen.findByText('Novší');

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(zvyraznenyKomentar(41)).toBe(false);
    expect(zvyraznenyKomentar(42)).toBe(false);
  });

  it('cieľový komentár má prednosť pred štartovacou polohou pri komentároch', async () => {
    const scrollIntoView = nainstalujScrollIntoView();
    const desat = Array.from({ length: 10 }, (_unused, index) => komentar(100 + index, `Komentár ${index + 1}`));
    mockedList.mockResolvedValue(strana(desat, { count: 10 }) as never);
    const fotka = {
      id: 11,
      status: 'approved',
      thumbnail_url: 'http://api.test/11-t.webp',
      large_url: 'http://api.test/11-l.webp',
    };
    // Fotka a desať komentárov: bez cieľa by sa obrazovka otvorila rovno pri komentároch (plynulý posun ku kotve).
    const post = prispevok({ images: [fotka], comments_count: 10 });
    const scrollTo = jest.fn();
    const view = render(<FeedPostMobileDetail post={post} onClose={jest.fn()} highlightCommentId={105} />);
    const plocha = await screen.findByTestId('feed-comments-scroll');
    plocha.scrollTo = scrollTo as unknown as typeof plocha.scrollTo;
    plocha.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    screen.getByTestId('feed-mobile-detail-comments-anchor').getBoundingClientRect = () => ({ top: 422 }) as DOMRect;

    await screen.findByText('Komentár 6');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());

    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail-comments-anchor')).toHaveAttribute('data-auto-scrolled', 'false');
    expect(zvyraznenyKomentar(105)).toBe(true);
    view.unmount();
  });

  it('vzdá sa po obmedzenom počte stránok, keď sa komentár nikdy neobjaví', async () => {
    const scrollIntoView = nainstalujScrollIntoView();
    // Server stále hlási ďalšiu stránku, ale cieľ sa neobjaví: bez stropu by sa stránkovalo donekonečna.
    mockedList.mockResolvedValue(strana([komentar(41, 'Starší')], { next: 'http://api.test/next', count: 50 }) as never);

    vykresli(999);
    await screen.findByText('Starší');

    await waitFor(() => expect(mockedList.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => expect(mockedList.mock.calls.length).toBeLessThanOrEqual(21));
    // Nič sa nerozbije: zoznam ostáva použiteľný, len bez skoku.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByText('Starší')).toBeInTheDocument();
  });
});

describe('komentár mimo prvej stránky v obrazovke detailu', () => {
  it('stránkuje dopredu, kým nenájde čerstvo pridaný komentár', async () => {
    // Najbežnejší prípad upozornenia: čerstvý komentár leží na POSLEDNEJ stránke, nie na prvej.
    const scrollIntoView = nainstalujScrollIntoView();
    const stranaOd = (od: number, pocet: number) =>
      Array.from({ length: pocet }, (_unused, index) => komentar(od + index, `K${od + index}`));
    mockedList
      .mockResolvedValueOnce(strana(stranaOd(1, 10), { next: 'http://api.test/c?after=10', count: 25 }) as never)
      .mockResolvedValueOnce(strana(stranaOd(11, 10), { next: 'http://api.test/c?after=20' }) as never)
      .mockResolvedValue(strana(stranaOd(21, 5)) as never);

    vykresli(25);

    // Bez donačítavania by sa zobrazila len prvá desiatka a nič by sa nestalo.
    expect(await screen.findByText('K25')).toBeInTheDocument();
    // Obe podmienky v JEDNOM waitFor: zvýraznenie je len dočasné, takže samostatné čakania po sebe ho vedia minúť.
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
      expect(zvyraznenyKomentar(25)).toBe(true);
    });
  });

  it('zastaví sa na konci vlákna, keď cieľový komentár už neexistuje', async () => {
    const scrollIntoView = nainstalujScrollIntoView();
    // Cieľ 7 medzitým zanikol. Prvá stránka o tom nič nehovorí (cieľ môže byť medzi staršími), takže sa správne pokračuje
    // nadol; zastaviť sa má až na konci vlákna.
    mockedList
      .mockResolvedValueOnce(
        strana([komentar(9, 'Deviaty'), komentar(8, 'Ôsmy')], { next: 'http://api.test/c?after=8', count: 4 }) as never,
      )
      .mockResolvedValue(strana([komentar(6, 'Šiesty'), komentar(5, 'Piaty')]) as never);

    vykresli(7);
    await screen.findByText('Deviaty');

    // Počiatočné načítanie, stránka nadol a jedno obnovenie (poistka „cieľ je novší, než čo máme"); potom sa hľadanie vzdá.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(3));

    // A na troch aj ZOSTANE: bez zastavenia by stránkovanie bežalo ďalej.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockedList).toHaveBeenCalledTimes(3);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('neposúva na komentár pri každom ďalšom pollingu', async () => {
    jest.useFakeTimers();
    const scrollIntoView = nainstalujScrollIntoView();
    mockedList.mockResolvedValue(strana([komentar(41, 'Starší'), komentar(42, 'Ten z upozornenia')], { count: 2 }) as never);

    vykresli(42);
    await screen.findByText('Ten z upozornenia');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

    // Polling prinesie novú verziu zoznamu: pohľad sa nesmie strhnúť späť, keď si používateľ medzitým odscrolloval inam.
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('zastaví hľadanie a mlčí, keď požiadavka na ďalšiu stránku zlyhá', async () => {
    const scrollIntoView = nainstalujScrollIntoView();
    mockedList
      .mockResolvedValueOnce(strana([komentar(1, 'Prvý')], { next: 'http://api.test/next', count: 50 }) as never)
      // Donačítanie pri hľadaní spadne (výpadok siete).
      .mockRejectedValue(new Error('offline'));

    vykresli(99);
    await screen.findByText('Prvý');

    // Presne JEDEN pokus o donačítanie: zlyhanie sa neopakuje dokola.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockedList).toHaveBeenCalledTimes(2);

    // Hľadanie na pozadí si používateľ nevyžiadal, takže žiadny chybový toast.
    expect(toast.error).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByText('Prvý')).toBeInTheDocument();
  });

  it('zruší staré zvýraznenie hneď po vyčistení cieľa', async () => {
    nainstalujScrollIntoView();
    mockedList.mockResolvedValue(strana([komentar(41, 'Starší'), komentar(42, 'Ten z upozornenia')], { count: 2 }) as never);

    const { zmenCiel } = vykresli(42);
    await waitFor(() => expect(zvyraznenyKomentar(42)).toBe(true));

    // Cieľ zmizol (napríklad návrat na príspevok bez komentára). Staré zvýraznenie musí zhasnúť HNEĎ.
    zmenCiel(null);

    await waitFor(() => expect(zvyraznenyKomentar(42)).toBe(false));
  });
});

describe('druhé a ďalšie upozornenie v obrazovke detailu', () => {
  beforeEach(() => {
    nainstalujScrollIntoView();
  });

  it('zvládne druhé upozornenie na komentár pridaný po prvom', async () => {
    // Po prvom hľadaní je vlákno dočítané, takže novší komentár leží ZA koncom okna a bez opätovného dopytu na server by
    // sa hľadanie vzdalo bez jedinej požiadavky.
    mockedList.mockResolvedValue(strana([komentar(41, 'Prvý'), komentar(42, 'Druhý')], { count: 2 }) as never);
    const { zmenCiel } = vykresli(41);
    await waitFor(() => expect(zvyraznenyKomentar(41)).toBe(true));

    // Medzitým pribudol komentár 43 a prišlo naň druhé upozornenie.
    mockedList.mockResolvedValue(
      strana([komentar(41, 'Prvý'), komentar(42, 'Druhý'), komentar(43, 'Tretí')], { count: 3 }) as never,
    );
    zmenCiel(43);

    expect(await screen.findByText('Tretí')).toBeInTheDocument();
    await waitFor(() => expect(zvyraznenyKomentar(43)).toBe(true));
    expect(zvyraznenyKomentar(41)).toBe(false);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('zvládne druhé upozornenie na komentár, ktorý už je v okne', async () => {
    mockedList.mockResolvedValue(strana([komentar(41, 'Prvý'), komentar(42, 'Druhý')], { count: 2 }) as never);
    const { zmenCiel } = vykresli(41);
    await waitFor(() => expect(zvyraznenyKomentar(41)).toBe(true));

    zmenCiel(42);

    await waitFor(() => expect(zvyraznenyKomentar(42)).toBe(true));
    expect(zvyraznenyKomentar(41)).toBe(false);
  });

  it('zvládne druhé upozornenie na iný príspevok', async () => {
    mockedList.mockResolvedValueOnce(strana([komentar(41, 'Z prvého príspevku')], { count: 1 }) as never);
    const { zmenCiel } = vykresli(41);
    await waitFor(() => expect(zvyraznenyKomentar(41)).toBe(true));

    mockedList.mockResolvedValue(strana([komentar(70, 'Z druhého príspevku')], { count: 1 }) as never);
    zmenCiel(70, prispevok({ id: 10 }));

    expect(await screen.findByText('Z druhého príspevku')).toBeInTheDocument();
    await waitFor(() => expect(zvyraznenyKomentar(70)).toBe(true));
  });

  it('pýta sa servera len raz navyše, keď sa komentár nikdy neobjaví', async () => {
    mockedList.mockResolvedValue(strana([komentar(41, 'Prvý')], { count: 1 }) as never);

    vykresli(999);
    await screen.findByText('Prvý');

    // Jedno počiatočné načítanie a jedno overenie, či vlákno medzitým nenarástlo.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockedList).toHaveBeenCalledTimes(2);
  });
});

describe('okno komentárov nad pollovacím stropom v obrazovke detailu', () => {
  /** Server, ktorý rešpektuje veľkosť stránky aj kurzor: inak by test nerozlíšil „donačítava“ od „vzdalo to". */
  function server(uloziste: Array<ReturnType<typeof komentar>>) {
    mockedList.mockImplementation((async (_postId: number, params: { cursorUrl?: string; pageSize?: number } = {}) => {
      const query = params.cursorUrl ? new URL(params.cursorUrl).searchParams : null;
      const after = query ? Number(query.get('after')) : null;
      const velkost = Math.min(Number(query?.get('page_size') ?? params.pageSize ?? 20), 50);
      // Najnovšie hore; `next` vedie k STARŠÍM.
      const zoradene = [...uloziste].sort((lavy, pravy) => pravy.id - lavy.id);
      const od = after === null ? 0 : zoradene.findIndex((polozka) => polozka.id < after);
      const rez = od < 0 ? [] : zoradene.slice(od, od + velkost);
      const posledny = rez[rez.length - 1];
      const maDalsiu = posledny ? zoradene.indexOf(posledny) < zoradene.length - 1 : false;
      return {
        results: rez,
        next: maDalsiu ? `http://api.test/c?after=${posledny.id}&page_size=${velkost}` : null,
        previous: null,
        count: params.cursorUrl ? undefined : uloziste.length,
      };
    }) as never);
  }

  it('nájde komentár, ktorý pribudol po prečítaní celého vlákna', async () => {
    // Vlákno je celé dočítané (55 komentárov) a pribudne nový: leží NAVRCH, teda presne tam, kam sa pozerá dopyt bez
    // kurzora, takže stačí jedno obnovenie.
    nainstalujScrollIntoView();
    const uloziste = Array.from({ length: 55 }, (_unused, index) => komentar(index + 1, `K${index + 1}`));
    server(uloziste);

    // Prvé upozornenie dočíta vlákno až k najstaršiemu komentáru.
    const { zmenCiel } = vykresli(1);
    await waitFor(() => expect(zvyraznenyKomentar(1)).toBe(true));

    // Pribudne 56. komentár a príde naň druhé upozornenie. Okno má už 55 položiek, teda viac než pollovací strop.
    uloziste.push(komentar(56, 'K56'));
    zmenCiel(56);

    expect(await screen.findByText('K56')).toBeInTheDocument();
    await waitFor(() => expect(zvyraznenyKomentar(56)).toBe(true));
  });

  it('zastaví sa na strope stránok, keď sa komentár nikdy neobjaví', async () => {
    nainstalujScrollIntoView();
    // Nekonečné vlákno: server vždy hlási ďalšiu stránku, cieľ nikdy nepríde.
    mockedList.mockImplementation((async (_postId: number, params: { cursorUrl?: string } = {}) => ({
      results: [komentar(1, 'K1')],
      next: 'http://api.test/c?after=1&page_size=10',
      previous: null,
      count: params.cursorUrl ? undefined : 9999,
    })) as never);

    vykresli(99999);
    await screen.findByText('K1');

    // Presne 1 počiatočné načítanie a 20 stránok (strop hľadania).
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(21));

    // A na 21 aj ZOSTANE: bez stropu by donačítavanie bežalo ďalej.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockedList).toHaveBeenCalledTimes(21);
  });
});
