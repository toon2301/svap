/**
 * Nález 346 (K40, rozhodnutie R58): na iPhone nebol nový komentár celý viditeľný po vlastnom odoslaní ani po
 * ťuknutí na indikátor nových komentárov. Zoznam sa doscrollovával na 0 (vrch hlavičky príspevku), no
 * komentáre začínajú až pod mobilnou hlavičkou (text, fotka, akcie), takže najnovší komentár ostal z väčšej
 * časti pod spodným okrajom plochy, zakrytý composerom.
 *
 * Oprava (`useFeedCommentsScroll.ts`): ak je nad komentármi hlavička, zoznam sa doscrolluje tak, aby bol PRVÝ
 * komentár navrchu viditeľnej plochy s malou rezervou (cieľ nezávisí od výšky plochy ani komentára), a „pri
 * vrchu“ sa meria od prvého komentára. Bez hlavičky (počítač, panel nad fotkou, stránka príspevku) sa nič
 * nemení.
 *
 * Jsdom nemá žiadny layout (`getBoundingClientRect` vracia samé nuly), preto sa rozloženie simuluje: poloha
 * prvého komentára sa počíta z `scrollTop` plochy tak, ako ju vidí prehliadač. Hodnoty sú z meraní K36
 * (iPhone 393×659: plocha zoznamu 517 px, hlavička s fotkou 454 px, krátky komentár 112 px).
 *
 * Súbor pokrýva aj mutácie K38, ktoré prežili pri čistom presune: hranica `NEAR_TOP_PX` (S5, S13), chýbajúci
 * `return` pri vrchu (S7), pripočítanie `added` (S8), zrušenie čakajúceho posunu pri kliku (S14) a efekt posunu
 * v komponente (S18, S19).
 *
 * Úplne navrchu príspevku (do 100 px od vrchu) sa pri cudzom komentári nič nehýbe a nič nehlási. Táto výnimka
 * má prednosť pred „pri začiatku komentárov“, lebo pri krátkej hlavičke (príspevok bez fotky) sa obe pásma
 * prekrývajú (nález CodeRabbitu na PR #294: hlavička 160 px a `scrollTop` 100 posunuli zoznam na 152 px).
 */

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import { useFeedCommentsScroll } from '../useFeedCommentsScroll';
import {
  FIRST_COMMENT_MARGIN_PX,
  commentsScrollTarget,
  isAtPostTop,
  isNearCommentsStart,
} from '../feedCommentsLogic';
import { listFeedPostComments, type FeedPostComment } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
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
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreate = jest.requireMock('@/lib/feedApi')
  .createFeedPostComment as jest.Mock;

/** Horný okraj plochy zoznamu na obrazovke. */
const BOX_TOP = 120;
/** Výška plochy zoznamu na iPhone 393×659. */
const BOX_HEIGHT = 517;
/** Výška mobilnej hlavičky s fotkou nad komentármi. */
const HEADER_HEIGHT = 454;
const COMMENT_HEIGHT = 112;
/** Kam sa má doscrollovať: prvý komentár 8 px pod horným okrajom plochy. */
const TARGET = HEADER_HEIGHT - 8;

function domRect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 320,
    width: 320,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** Plocha, ktorá drží `scrollTop` a pamätá si volania `scrollTo` (jsdom ho nemá). */
function makeScrollable(box: HTMLElement, withScrollTo = true) {
  let scrollTop = 0;
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
  const scrollTo = jest.fn((options: ScrollToOptions) => {
    scrollTop = options.top ?? 0;
  });
  if (withScrollTo) {
    (box as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;
  }
  return {
    scrollTo,
    setScrollTop: (value: number) => {
      scrollTop = value;
    },
    getScrollTop: () => scrollTop,
  };
}

type MountOptions = {
  /** Je nad komentármi hlavička (prvé dieťa plochy)? */
  withHeader?: boolean;
  /** Odstup prvého komentára od začiatku obsahu, ako ho hlási rozloženie. */
  commentsStart?: number;
  boxHeight?: number;
  commentHeight?: number;
  /** Je v zozname aspoň jeden komentár? */
  withComments?: boolean;
  /** Hlási prehliadač rozloženie? Jsdom nie. */
  withLayout?: boolean;
  withScrollTo?: boolean;
};

/** Ručne poskladaná plocha: [hlavička] + zoznam s komentárom, s rozložením podľa `scrollTop`. */
function mountScrollBox({
  withHeader = true,
  commentsStart = withHeader ? HEADER_HEIGHT : 0,
  boxHeight = BOX_HEIGHT,
  commentHeight = COMMENT_HEIGHT,
  withComments = true,
  withLayout = true,
  withScrollTo = true,
}: MountOptions = {}) {
  const box = document.createElement('div');
  if (withHeader) {
    const header = document.createElement('div');
    header.textContent = 'Hlavička príspevku';
    box.appendChild(header);
  }
  if (withComments) {
    const list = document.createElement('ul');
    const first = document.createElement('li');
    first.setAttribute('data-comment-id', '2');
    list.appendChild(first);
    box.appendChild(list);
    const scrollable = makeScrollable(box, withScrollTo);
    if (withLayout) {
      box.getBoundingClientRect = () => domRect(BOX_TOP, boxHeight);
      first.getBoundingClientRect = () =>
        domRect(BOX_TOP + commentsStart - scrollable.getScrollTop(), commentHeight);
    }
    document.body.appendChild(box);
    return { box, ...scrollable };
  }
  const empty = document.createElement('p');
  empty.textContent = 'Zatiaľ žiadne komentáre.';
  box.appendChild(empty);
  const scrollable = makeScrollable(box, withScrollTo);
  if (withLayout) {
    box.getBoundingClientRect = () => domRect(BOX_TOP, boxHeight);
  }
  document.body.appendChild(box);
  return { box, ...scrollable };
}

type ScrollHook = ReturnType<typeof useFeedCommentsScroll>;
type HookResult = { current: ScrollHook };

function setUpHook(options: MountOptions = {}) {
  const mounted = mountScrollBox(options);
  const hook = renderHook(() => useFeedCommentsScroll());
  hook.result.current.scrollRef.current = mounted.box as HTMLDivElement;
  return { ...mounted, result: hook.result };
}

function announce(result: HookResult, added = 1) {
  act(() => {
    result.current.announceNewComments(added);
  });
}

function scrollList(result: HookResult) {
  act(() => {
    result.current.handleListScroll();
  });
}

describe('feedCommentsLogic – začiatok komentárov', () => {
  it('leaves an 8 px margin above the first comment', () => {
    expect(FIRST_COMMENT_MARGIN_PX).toBe(8);
    expect(commentsScrollTarget(454)).toBe(446);
    expect(commentsScrollTarget(200)).toBe(192);
  });

  it('never targets a negative position', () => {
    expect(commentsScrollTarget(0)).toBe(0);
    expect(commentsScrollTarget(5)).toBe(0);
    expect(commentsScrollTarget(8)).toBe(0);
    expect(commentsScrollTarget(9)).toBe(1);
  });

  it('counts "near" from the first comment, 100 px either way', () => {
    expect(isNearCommentsStart(454, 454)).toBe(true);
    expect(isNearCommentsStart(554, 454)).toBe(true);
    expect(isNearCommentsStart(555, 454)).toBe(false);
    expect(isNearCommentsStart(354, 454)).toBe(true);
    expect(isNearCommentsStart(353, 454)).toBe(false);
  });

  it('keeps the old one-sided rule when nothing sits above the comments', () => {
    expect(isNearCommentsStart(0, 0)).toBe(true);
    expect(isNearCommentsStart(100, 0)).toBe(true);
    expect(isNearCommentsStart(101, 0)).toBe(false);
    // iOS pri pretiahnutí navrch vráti záporný scrollTop: stále „pri vrchu“.
    expect(isNearCommentsStart(-150, 0)).toBe(true);
  });

  it('knows a reader at the very top of the post, 100 px at most', () => {
    expect(isAtPostTop(0, 454)).toBe(true);
    expect(isAtPostTop(100, 454)).toBe(true);
    expect(isAtPostTop(101, 454)).toBe(false);
    // Odraz na iOS pri pretiahnutí navrch (záporný scrollTop) je stále navrchu.
    expect(isAtPostTop(-150, 454)).toBe(true);
  });

  it('stops at the first comment when the header is shorter than 100 px', () => {
    // Kto je už za začiatkom komentárov, nový komentár nad sebou nevidí, takže navrchu príspevku už nie je.
    expect(isAtPostTop(60, 60)).toBe(true);
    expect(isAtPostTop(61, 60)).toBe(false);
    expect(isAtPostTop(90, 60)).toBe(false);
  });

  it('is never at the top of the post when nothing sits above the comments', () => {
    expect(isAtPostTop(0, 0)).toBe(false);
    expect(isAtPostTop(50, 0)).toBe(false);
    expect(isAtPostTop(-150, 0)).toBe(false);
  });
});

describe('useFeedCommentsScroll – kam sa doscrolluje', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts the first comment at the top of the visible area with a small margin', () => {
    const { result, scrollTo } = setUpHook();

    result.current.scrollListToTop('auto');

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'auto' });
  });

  it('passes the requested behavior on', () => {
    const { result, scrollTo } = setUpHook();

    result.current.scrollListToTop('smooth');

    expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'smooth' });
  });

  it.each([0, 418, 700, 2000])(
    'does not depend on where the reader is now (scrollTop %d)',
    (scrollTop) => {
      const { result, scrollTo, setScrollTop } = setUpHook();
      setScrollTop(scrollTop);

      result.current.scrollListToTop('smooth');

      expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'smooth' });
    },
  );

  it.each([300, 411, 517, 558, 844])(
    'does not depend on the height of the visible area (%d px)',
    (boxHeight) => {
      const { result, scrollTo } = setUpHook({ boxHeight });

      result.current.scrollListToTop('auto');

      expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'auto' });
    },
  );

  it.each([60, 112, 400])(
    'does not depend on the height of the comment (%d px)',
    (commentHeight) => {
      const { result, scrollTo } = setUpHook({ commentHeight });

      result.current.scrollListToTop('auto');

      expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'auto' });
    },
  );

  it('follows the real height of the header', () => {
    const { result, scrollTo } = setUpHook({ commentsStart: 200 });

    result.current.scrollListToTop('auto');

    expect(scrollTo).toHaveBeenCalledWith({ top: 192, behavior: 'auto' });
  });

  it('stays at the very top without a header (desktop, post page, photo panel)', () => {
    const { result, scrollTo, setScrollTop } = setUpHook({ withHeader: false });
    setScrollTop(300);

    result.current.scrollListToTop('auto');

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('stays at the very top without a header even if the layout offsets the first comment', () => {
    const { result, scrollTo } = setUpHook({ withHeader: false, commentsStart: 40 });

    result.current.scrollListToTop('smooth');

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('stays at the very top where the browser reports no layout (jsdom, hidden box)', () => {
    const { result, scrollTo, setScrollTop } = setUpHook({ withLayout: false });
    setScrollTop(300);

    result.current.scrollListToTop('auto');

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('stays at the very top while the list has no comments yet', () => {
    const { result, scrollTo, setScrollTop } = setUpHook({ withComments: false });
    setScrollTop(300);

    result.current.scrollListToTop('auto');

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it.each([
    ['with a header', true, TARGET],
    ['without a header', false, 0],
  ])('sets scrollTop directly where scrollTo is missing (%s)', (_name, withHeader, expected) => {
    const { result, getScrollTop, setScrollTop } = setUpHook({
      withHeader,
      withScrollTo: false,
    });
    setScrollTop(700);

    result.current.scrollListToTop('auto');

    expect(getScrollTop()).toBe(expected);
  });

  it('does nothing without a box', () => {
    const { result } = renderHook(() => useFeedCommentsScroll());

    expect(() => result.current.scrollListToTop('auto')).not.toThrow();
  });
});

describe('useFeedCommentsScroll – komentár od iného používateľa', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows it at once to a reader at the start of the comments, with no indicator', () => {
    const { result, setScrollTop } = setUpHook();
    // Tu pristane otvorenie okna: kotva „Komentáre“ navrchu, prvý komentár 36 px pod okrajom.
    setScrollTop(HEADER_HEIGHT - 36);

    announce(result);

    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);
  });

  it('counts "at the start" from the first comment, 100 px either way', () => {
    const { result, setScrollTop } = setUpHook();

    setScrollTop(HEADER_HEIGHT + 100);
    announce(result);
    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);

    result.current.scrollToTopRef.current = null;
    setScrollTop(HEADER_HEIGHT - 100);
    announce(result);
    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);
  });

  it('gives a reader one pixel further down the indicator instead', () => {
    const { result, setScrollTop } = setUpHook();
    setScrollTop(HEADER_HEIGHT + 101);

    announce(result);

    expect(result.current.scrollToTopRef.current).toBeNull();
    expect(result.current.newCommentsCount).toBe(1);
  });

  it('gives a reader one pixel further up in the header the indicator too', () => {
    const { result, setScrollTop } = setUpHook();
    setScrollTop(HEADER_HEIGHT - 101);

    announce(result);

    expect(result.current.scrollToTopRef.current).toBeNull();
    expect(result.current.newCommentsCount).toBe(1);
  });

  it('leaves a reader at the very top of the post alone, as before', () => {
    const { result, setScrollTop } = setUpHook();

    setScrollTop(0);
    announce(result);
    setScrollTop(100);
    announce(result);

    expect(result.current.scrollToTopRef.current).toBeNull();
    expect(result.current.newCommentsCount).toBe(0);
  });

  it.each([
    // [výška hlavičky, scrollTop]: pásmo „navrchu príspevku“ (do 100 px) sa prekrýva s pásmom „pri začiatku komentárov“.
    [160, 0],
    [160, 60],
    [160, 100],
    [122, 22],
    [122, 100],
    [200, 99],
    [200, 100],
    [60, 60],
  ])(
    'leaves a reader at the top of a short header alone (header %d px, scrollTop %d)',
    (header, scrollTop) => {
      const { result, setScrollTop } = setUpHook({ commentsStart: header });
      setScrollTop(scrollTop);

      announce(result);

      expect(result.current.scrollToTopRef.current).toBeNull();
      expect(result.current.newCommentsCount).toBe(0);
    },
  );

  it.each([
    [160, 101],
    [122, 101],
    [200, 101],
    [60, 61],
    [60, 90],
  ])(
    'scrolls it in for a reader just below that top zone (header %d px, scrollTop %d)',
    (header, scrollTop) => {
      const { result, setScrollTop } = setUpHook({ commentsStart: header });
      setScrollTop(scrollTop);

      announce(result);

      expect(result.current.scrollToTopRef.current).toBe('smooth');
      expect(result.current.newCommentsCount).toBe(0);
    },
  );

  it('adds up what arrived for a reader lower down', () => {
    const { result, setScrollTop } = setUpHook();
    setScrollTop(900);

    announce(result, 2);
    announce(result, 3);

    expect(result.current.newCommentsCount).toBe(5);
    expect(result.current.scrollToTopRef.current).toBeNull();
  });

  it('keeps the old rule without a header: 100 px from the top is still the top', () => {
    const { result, setScrollTop } = setUpHook({ withHeader: false });

    setScrollTop(100);
    announce(result);
    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);

    result.current.scrollToTopRef.current = null;
    setScrollTop(-150);
    announce(result);
    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);
  });

  it('keeps the old rule without a header: one pixel further down is the indicator', () => {
    const { result, setScrollTop } = setUpHook({ withHeader: false });
    setScrollTop(101);

    announce(result, 2);

    expect(result.current.scrollToTopRef.current).toBeNull();
    expect(result.current.newCommentsCount).toBe(2);
  });

  it('does not take a layout offset for a header when none is in the DOM', () => {
    // Stará pozícia 130 je mimo 100 px od vrchu; s „prvým komentárom“ na 40 by vyšla ako pri začiatku.
    const { result, setScrollTop } = setUpHook({ withHeader: false, commentsStart: 40 });
    setScrollTop(130);

    announce(result);

    expect(result.current.scrollToTopRef.current).toBeNull();
    expect(result.current.newCommentsCount).toBe(1);
  });

  it('treats a missing box as the top', () => {
    const { result } = renderHook(() => useFeedCommentsScroll());

    announce(result);

    expect(result.current.scrollToTopRef.current).toBe('smooth');
    expect(result.current.newCommentsCount).toBe(0);
  });
});

describe('useFeedCommentsScroll – indikátor pri scrolle zoznamu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** Zoznam s hlavičkou a nahlásenými dvoma komentármi, čitateľ je nižšie. */
  function withPendingIndicator(options: MountOptions = {}) {
    const hook = setUpHook(options);
    hook.setScrollTop(900);
    announce(hook.result, 2);
    expect(hook.result.current.newCommentsCount).toBe(2);
    return hook;
  }

  it('hides the indicator once the reader is within 100 px of the first comment', () => {
    const { result, setScrollTop } = withPendingIndicator();

    setScrollTop(HEADER_HEIGHT + 100);
    scrollList(result);

    expect(result.current.newCommentsCount).toBe(0);
  });

  it('keeps the indicator one pixel further down', () => {
    const { result, setScrollTop } = withPendingIndicator();

    setScrollTop(HEADER_HEIGHT + 101);
    scrollList(result);

    expect(result.current.newCommentsCount).toBe(2);
  });

  it('hides the indicator within 100 px above the first comment too', () => {
    const { result, setScrollTop } = withPendingIndicator();

    setScrollTop(HEADER_HEIGHT - 100);
    scrollList(result);

    expect(result.current.newCommentsCount).toBe(0);
  });

  it('keeps the indicator for a reader in the middle of the header', () => {
    const { result, setScrollTop } = withPendingIndicator();

    setScrollTop(HEADER_HEIGHT - 101);
    scrollList(result);

    expect(result.current.newCommentsCount).toBe(2);
  });

  it('hides the indicator at the very top of the post, as before', () => {
    const { result, setScrollTop } = withPendingIndicator();

    setScrollTop(100);
    scrollList(result);

    expect(result.current.newCommentsCount).toBe(0);
  });

  it('keeps the old boundary without a header', () => {
    const { result, setScrollTop } = withPendingIndicator({ withHeader: false });

    setScrollTop(101);
    scrollList(result);
    expect(result.current.newCommentsCount).toBe(2);

    setScrollTop(100);
    scrollList(result);
    expect(result.current.newCommentsCount).toBe(0);
  });

  it('does nothing without a box', () => {
    const { result } = renderHook(() => useFeedCommentsScroll());

    expect(() => scrollList(result)).not.toThrow();
    expect(result.current.newCommentsCount).toBe(0);
  });
});

describe('useFeedCommentsScroll – klik na indikátor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls the first comment to the top and clears the indicator', () => {
    const { result, scrollTo, setScrollTop } = setUpHook();
    setScrollTop(900);
    announce(result, 2);

    act(() => {
      result.current.handleNewCommentsClick();
    });

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'smooth' });
    expect(result.current.newCommentsCount).toBe(0);
  });

  it('cancels a scroll that was still waiting for the next commit', () => {
    const { result } = setUpHook();
    result.current.scrollToTopRef.current = 'smooth';

    act(() => {
      result.current.handleNewCommentsClick();
    });

    expect(result.current.scrollToTopRef.current).toBeNull();
  });

  it('still goes to the very top without a header', () => {
    const { result, scrollTo, setScrollTop } = setUpHook({ withHeader: false });
    setScrollTop(900);
    announce(result);

    act(() => {
      result.current.handleNewCommentsClick();
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(result.current.newCommentsCount).toBe(0);
  });
});

/* ------------------------------------------------------------------------------------------------
 * Celý reťazec: skutočný `FeedPostComments` s hlavičkou, simulované rozloženie prehliadača.
 * ---------------------------------------------------------------------------------------------- */

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string, likes = 0): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: likes,
    is_liked_by_me: false,
    created_at: '2026-01-01',
  };
}

function page(results: FeedPostComment[], count?: number) {
  return { results, next: null, previous: null, count: count ?? results.length };
}

function setVisible() {
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
  });
}

let rectSpy: jest.SpyInstance<DOMRect, [], Element> | undefined;

/**
 * Zoznam v sekcii komentárov sa správa ako v prehliadači: poloha PRVÉHO komentára vychádza z `scrollTop`
 * plochy a z výšky hlavičky. Platí aj pre komentáre, ktoré pribudnú neskôr (nové uzly DOM).
 */
function installChainLayout(box: HTMLElement, headerHeight: number) {
  const scrollable = makeScrollable(box);
  rectSpy = jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      if (this === box) return domRect(BOX_TOP, BOX_HEIGHT);
      if (this.hasAttribute('data-comment-id')) {
        return domRect(BOX_TOP + headerHeight - scrollable.getScrollTop(), COMMENT_HEIGHT);
      }
      return domRect(0, 0);
    });
  return scrollable;
}

const mobileHeader = <div data-testid="test-header">Hlavička príspevku</div>;

function renderComments(withHeader: boolean) {
  return render(
    <FeedPostComments
      postId={5}
      fillHeight
      listHeader={withHeader ? mobileHeader : undefined}
    />,
  );
}

describe('FeedPostComments s mobilnou hlavičkou – vlastný komentár', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
  });

  afterEach(() => {
    rectSpy?.mockRestore();
    rectSpy = undefined;
  });

  async function postOwnComment() {
    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    expect(await screen.findByText('Môj nový')).toBeInTheDocument();
  }

  it('scrolls the new comment to the top of the visible area', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Starý')]));
    mockedCreate.mockResolvedValue(comment(2, 'Môj nový'));
    renderComments(true);
    await screen.findByText('Starý');
    const layout = installChainLayout(
      screen.getByTestId('feed-comments-scroll'),
      HEADER_HEIGHT,
    );
    layout.setScrollTop(700);

    await postOwnComment();

    await waitFor(() =>
      expect(layout.scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'auto' }),
    );
    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.getScrollTop()).toBe(TARGET);
  });

  it('keeps going to the very top without a header', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Starý')]));
    mockedCreate.mockResolvedValue(comment(2, 'Môj nový'));
    renderComments(false);
    await screen.findByText('Starý');
    const layout = installChainLayout(screen.getByTestId('feed-comments-scroll'), 0);
    layout.setScrollTop(700);

    await postOwnComment();

    await waitFor(() =>
      expect(layout.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' }),
    );
    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe('FeedPostComments s mobilnou hlavičkou – komentár od iného používateľa', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedList.mockReset();
    mockedCreate.mockReset();
    setVisible();
  });

  afterEach(() => {
    rectSpy?.mockRestore();
    rectSpy = undefined;
    jest.useRealTimers();
  });

  /** Otvorí sekciu, nastaví polohu čitateľa a nechá prísť cudzí komentár cez polling. */
  async function openAndReceiveRemote(
    scrollTop: number,
    { withHeader = true, headerHeight = HEADER_HEIGHT } = {},
  ) {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(2, 'Od iného'), comment(1, 'Prvý')], 2));
    renderComments(withHeader);
    await screen.findByText('Prvý');
    const layout = installChainLayout(
      screen.getByTestId('feed-comments-scroll'),
      withHeader ? headerHeight : 0,
    );
    layout.setScrollTop(scrollTop);

    await tick();

    expect(await screen.findByText('Od iného')).toBeInTheDocument();
    return layout;
  }

  it('scrolls it in at once for a reader at the start of the comments', async () => {
    const layout = await openAndReceiveRemote(HEADER_HEIGHT - 36);

    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'smooth' });
  });

  it('shows the indicator to a reader lower down and the tap scrolls the comment to the top', async () => {
    const layout = await openAndReceiveRemote(700);

    const indicator = await screen.findByTestId('feed-comments-new-indicator');
    expect(indicator).toHaveTextContent('1 nový komentár');
    expect(layout.scrollTo).not.toHaveBeenCalled();

    fireEvent.click(indicator);

    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'smooth' });
    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
  });

  it('leaves a reader at the very top of the post alone, as before', async () => {
    const layout = await openAndReceiveRemote(0);

    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
    expect(layout.scrollTo).not.toHaveBeenCalled();
  });

  it('leaves a reader at the top of a short-header post alone (header 160 px, scrollTop 100)', async () => {
    const layout = await openAndReceiveRemote(100, { headerHeight: 160 });

    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
    expect(layout.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls it in for a reader one pixel below that top zone (header 160 px, scrollTop 101)', async () => {
    const layout = await openAndReceiveRemote(101, { headerHeight: 160 });

    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.scrollTo).toHaveBeenCalledWith({ top: 152, behavior: 'smooth' });
  });

  it('without a header a reader at the top still gets the old scroll to 0', async () => {
    const layout = await openAndReceiveRemote(0, { withHeader: false });

    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('without a header the tap still goes to the very top', async () => {
    const layout = await openAndReceiveRemote(700, { withHeader: false });

    fireEvent.click(await screen.findByTestId('feed-comments-new-indicator'));

    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('clears the indicator when the reader posts their own comment', async () => {
    const layout = await openAndReceiveRemote(700);
    await screen.findByTestId('feed-comments-new-indicator');
    mockedCreate.mockResolvedValue(comment(3, 'Môj nový'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.type(screen.getByRole('textbox'), 'Môj nový');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));

    await waitFor(() =>
      expect(layout.scrollTo).toHaveBeenCalledWith({ top: TARGET, behavior: 'auto' }),
    );
    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
  });

  it('does not scroll again when a later poll only refreshes the comments', async () => {
    mockedList.mockResolvedValueOnce(page([comment(1, 'Prvý')])).mockResolvedValue(
      page([comment(2, 'Môj nový', 3), comment(1, 'Prvý')], 2),
    );
    mockedCreate.mockResolvedValue(comment(2, 'Môj nový'));
    renderComments(true);
    await screen.findByText('Prvý');
    const layout = installChainLayout(
      screen.getByTestId('feed-comments-scroll'),
      HEADER_HEIGHT,
    );
    layout.setScrollTop(700);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.type(screen.getByRole('textbox'), 'Môj nový');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));
    await waitFor(() => expect(layout.scrollTo).toHaveBeenCalledTimes(1));

    // Čitateľ medzitým číta nižšie; polling prinesie len čerstvejší počet lajkov.
    layout.setScrollTop(900);
    await tick();
    await waitFor(() =>
      expect(screen.getByTestId('feed-comment-like-count-2')).toHaveTextContent('3'),
    );

    expect(layout.scrollTo).toHaveBeenCalledTimes(1);
    expect(layout.getScrollTop()).toBe(900);
  });
});
