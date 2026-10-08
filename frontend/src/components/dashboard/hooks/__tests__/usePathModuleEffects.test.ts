/**
 * Efekty podľa adresy: adresa zapne modul (recenzie ponuky, detail a tvorba portfólia) a priamy
 * vstup na príspevok otvorí na desktope okno nad Nástenkou, na mobile celú stránku.
 *
 * Hook má štyri efekty v pevnom poradí: recenzie ponuky, detail portfólia, priamy vstup na príspevok
 * a tvorba portfólia. O vstupe na príspevok rozhoduje `decideFeedPostEntry` a históriu okna rieši
 * `feedOverlayHistory`; oba moduly sú tu nahradené záznamníkmi, aby bolo vidieť, s čím sa volajú
 * a v akom poradí. Poradie volaní je súčasť správania, preto sa všetko zapisuje do jedného záznamu
 * `calls`. Skutočné rozhodovanie a história sú pokryté v `DashboardContent.pathEffects.test.tsx`.
 */

import { renderHook, type RenderHookResult } from '@testing-library/react';
import type { FeedPostOverlayTarget } from '../../contexts/FeedPostOverlayContext';
import { usePathModuleEffects } from '../usePathModuleEffects';

const mockDecideFeedPostEntry = jest.fn();
jest.mock('../../modules/feed/feedPostEntryDecision', () => ({
  decideFeedPostEntry: (...args: unknown[]) => mockDecideFeedPostEntry(...args),
}));

const mockIsFeedOverlayHistoryBusy = jest.fn();
const mockAdoptFeedOverlayHistory = jest.fn();
jest.mock('../../modules/feed/feedOverlayHistory', () => ({
  isFeedOverlayHistoryBusy: (...args: unknown[]) => mockIsFeedOverlayHistoryBusy(...args),
  adoptFeedOverlayHistory: (...args: unknown[]) => mockAdoptFeedOverlayHistory(...args),
}));

/** Všetko, čo hook zavolá, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof usePathModuleEffects>[0];
type Mounted = RenderHookResult<void, HookInput>;

const spy = (name: string) => jest.fn((...args: unknown[]) => record(name, ...args));

type Decision =
  | { kind: 'wait' }
  | { kind: 'none' }
  | { kind: 'full-page' }
  | { kind: 'overlay'; target: FeedPostOverlayTarget }
  | { kind: string };

let decision: Decision;
let historyBusy: boolean;
let base: HookInput;

const TARGET: FeedPostOverlayTarget = { postId: 7, highlightCommentId: 12 };

const makeBase = (): HookInput => ({
  offerIdFromReviewsPath: null,
  portfolioItemIdFromPath: null,
  portfolioCreateMatch: null,
  feedPostIdFromPath: null,
  feedOverlayTarget: null,
  setFeedOverlayTarget: spy('setFeedOverlayTarget'),
  setActiveModule: spy('setActiveModule'),
  isMobile: false,
  isViewportResolved: true,
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => usePathModuleEffects(props), { initialProps: makeInput(overrides) });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const goTo = (url: string) => window.history.replaceState(null, '', url);

const MATCH = ['/dashboard/users/jana/portfolio/create', 'jana'] as unknown as RegExpMatchArray;

/** Vstup, s akým sa má volať `decideFeedPostEntry` (poradie kľúčov je súčasť záznamu). */
const decideInput = (overrides: Record<string, unknown> = {}) => ({
  pathPostId: null,
  overlayOpen: false,
  historyBusy: false,
  liveUrl: '/dashboard',
  viewportResolved: true,
  isMobile: false,
  ...overrides,
});

const BUSY = entry('isFeedOverlayHistoryBusy');
/** Vyhodnotenie priameho vstupu na príspevok: najprv sa zistí, či história beží, potom sa rozhodne. */
const FEED_RUN = (overrides: Record<string, unknown> = {}) => [
  BUSY,
  entry('decideFeedPostEntry', decideInput(overrides)),
];

const REVIEWS = entry('setActiveModule', 'offer-reviews');
const DETAIL = entry('setActiveModule', 'portfolio-detail');
const CREATE = entry('setActiveModule', 'portfolio-create');
const FULL_PAGE = entry('setActiveModule', 'feed-post-detail');
const HOME = entry('setActiveModule', 'home');
const ADOPT = entry('adoptFeedOverlayHistory');

beforeEach(() => {
  calls = [];
  decision = { kind: 'none' };
  historyBusy = false;
  base = makeBase();
  goTo('/dashboard');

  mockIsFeedOverlayHistoryBusy.mockReset().mockImplementation(() => {
    record('isFeedOverlayHistoryBusy');
    return historyBusy;
  });
  mockDecideFeedPostEntry.mockReset().mockImplementation((input: unknown) => {
    record('decideFeedPostEntry', input);
    return decision;
  });
  mockAdoptFeedOverlayHistory.mockReset().mockImplementation(() => {
    record('adoptFeedOverlayHistory');
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('nič nevracia', () => {
    const mounted = mountHook();
    expect(mounted.result.current).toBeUndefined();
  });

  it('bez adresy ničím nezapne modul, len vyhodnotí priamy vstup na príspevok', () => {
    mountHook();
    expect(calls).toEqual(FEED_RUN());
    expect(base.setActiveModule).not.toHaveBeenCalled();
    expect(base.setFeedOverlayTarget).not.toHaveBeenCalled();
    expect(mockAdoptFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('nezmenené vstupy pri ďalšom renderi nespustia žiadny efekt', () => {
    const mounted = mountHook({ offerIdFromReviewsPath: 5, portfolioItemIdFromPath: 7, portfolioCreateMatch: MATCH });
    calls = [];
    update(mounted, { offerIdFromReviewsPath: 5, portfolioItemIdFromPath: 7, portfolioCreateMatch: MATCH });
    expect(calls).toEqual([]);
  });
});

describe('recenzie ponuky (offerIdFromReviewsPath)', () => {
  it.each([[5], [1], [0]])('ID %p zapne modul recenzií', (offerId) => {
    mountHook({ offerIdFromReviewsPath: offerId });
    expect(calls).toEqual([REVIEWS, ...FEED_RUN()]);
  });

  it('bez ID modul nezapne', () => {
    mountHook({ offerIdFromReviewsPath: null });
    expect(calls).toEqual(FEED_RUN());
  });

  it('iné ID zapne modul znova, bez ostatných efektov', () => {
    const mounted = mountHook({ offerIdFromReviewsPath: 5 });
    calls = [];
    update(mounted, { offerIdFromReviewsPath: 6 });
    expect(calls).toEqual([REVIEWS]);
  });

  it('ID zmenené na null modul nezapne', () => {
    const mounted = mountHook({ offerIdFromReviewsPath: 5 });
    calls = [];
    update(mounted, { offerIdFromReviewsPath: null });
    expect(calls).toEqual([]);
  });

  it('používa najnovší setActiveModule', () => {
    const mounted = mountHook({ offerIdFromReviewsPath: 5 });
    const newer = spy('novší setActiveModule');
    calls = [];
    update(mounted, { offerIdFromReviewsPath: 5, setActiveModule: newer });
    expect(calls).toContain(entry('novší setActiveModule', 'offer-reviews'));
    expect(calls).not.toContain(REVIEWS);
  });
});

describe('detail portfólia (portfolioItemIdFromPath)', () => {
  it.each([[7], [1], [0], [123456]])('ID %p zapne modul detailu', (itemId) => {
    mountHook({ portfolioItemIdFromPath: itemId });
    expect(calls).toEqual([DETAIL, ...FEED_RUN()]);
  });

  it.each([[null], [NaN], [Infinity], [-Infinity]])('ID %p modul detailu nezapne', (itemId) => {
    mountHook({ portfolioItemIdFromPath: itemId });
    expect(calls).toEqual(FEED_RUN());
  });

  it('iné ID zapne modul znova, bez ostatných efektov', () => {
    const mounted = mountHook({ portfolioItemIdFromPath: 7 });
    calls = [];
    update(mounted, { portfolioItemIdFromPath: 8 });
    expect(calls).toEqual([DETAIL]);
  });

  it('ID zmenené na neplatné modul nezapne', () => {
    const mounted = mountHook({ portfolioItemIdFromPath: 7 });
    calls = [];
    update(mounted, { portfolioItemIdFromPath: NaN });
    expect(calls).toEqual([]);
  });
});

describe('tvorba portfólia (portfolioCreateMatch)', () => {
  it('zhoda zapne modul tvorby až po vyhodnotení vstupu na príspevok', () => {
    mountHook({ portfolioCreateMatch: MATCH });
    expect(calls).toEqual([...FEED_RUN(), CREATE]);
  });

  it('aj prázdne pole je zhoda (rozhoduje, že zhoda existuje)', () => {
    mountHook({ portfolioCreateMatch: [] as unknown as RegExpMatchArray });
    expect(calls).toEqual([...FEED_RUN(), CREATE]);
  });

  it('bez zhody modul tvorby nezapne', () => {
    mountHook({ portfolioCreateMatch: null });
    expect(calls).toEqual(FEED_RUN());
  });

  it('nová zhoda zapne modul znova, bez ostatných efektov', () => {
    const mounted = mountHook({ portfolioCreateMatch: MATCH });
    calls = [];
    update(mounted, { portfolioCreateMatch: [...MATCH] as unknown as RegExpMatchArray });
    expect(calls).toEqual([CREATE]);
  });

  it('zhoda zmenená na null modul nezapne', () => {
    const mounted = mountHook({ portfolioCreateMatch: MATCH });
    calls = [];
    update(mounted, { portfolioCreateMatch: null });
    expect(calls).toEqual([]);
  });
});

describe('priamy vstup na príspevok: čo sa pošle rozhodnutiu', () => {
  it.each([
    ['príspevok z cesty', { feedPostIdFromPath: 7 }, '/dashboard/feed/7', false, { pathPostId: 7, liveUrl: '/dashboard/feed/7' }],
    ['okno už je otvorené', { feedOverlayTarget: TARGET }, '/dashboard', false, { overlayOpen: true }],
    ['okno nie je otvorené', { feedOverlayTarget: null }, '/dashboard', false, { overlayOpen: false }],
    ['história okna beží', {}, '/dashboard', true, { historyBusy: true }],
    ['história okna nebeží', {}, '/dashboard', false, { historyBusy: false }],
    ['skutočná adresa s dotazom', {}, '/dashboard/feed/7?comment=12', false, { liveUrl: '/dashboard/feed/7?comment=12' }],
    ['skutočná adresa bez hashu', {}, '/dashboard/feed/7#komentare', false, { liveUrl: '/dashboard/feed/7' }],
    ['viewport ešte nie je vyhodnotený', { isViewportResolved: false }, '/dashboard', false, { viewportResolved: false }],
    ['mobil', { isMobile: true }, '/dashboard', false, { isMobile: true }],
  ] as Array<[string, Partial<HookInput>, string, boolean, Record<string, unknown>]>)(
    '%s',
    (_label, overrides, url, busy, expected) => {
      goTo(url);
      historyBusy = busy;

      mountHook(overrides);

      expect(calls).toEqual(FEED_RUN(expected));
      expect(mockDecideFeedPostEntry).toHaveBeenCalledTimes(1);
    },
  );

  it('história sa pýta pred rozhodnutím a len raz', () => {
    mountHook({ feedPostIdFromPath: 7 });
    expect(mockIsFeedOverlayHistoryBusy).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe(BUSY);
  });
});

describe('priamy vstup na príspevok: čo sa podľa rozhodnutia spraví', () => {
  it.each([[{ kind: 'wait' }], [{ kind: 'none' }], [{ kind: 'neznáme' }]] as Array<[Decision]>)(
    'rozhodnutie %j nič nenastaví',
    (given) => {
      decision = given;

      mountHook({ feedPostIdFromPath: 7 });

      expect(calls).toEqual(FEED_RUN({ pathPostId: 7 }));
      expect(base.setActiveModule).not.toHaveBeenCalled();
      expect(base.setFeedOverlayTarget).not.toHaveBeenCalled();
      expect(mockAdoptFeedOverlayHistory).not.toHaveBeenCalled();
    },
  );

  it('celá stránka príspevku: len zapne modul príspevku', () => {
    decision = { kind: 'full-page' };

    mountHook({ feedPostIdFromPath: 7, isMobile: true });

    expect(calls).toEqual([...FEED_RUN({ pathPostId: 7, isMobile: true }), FULL_PAGE]);
    expect(base.setFeedOverlayTarget).not.toHaveBeenCalled();
    expect(mockAdoptFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('okno nad Nástenkou: Nástenka, prevzatie histórie, potom cieľ okna (v tomto poradí)', () => {
    decision = { kind: 'overlay', target: TARGET };

    mountHook({ feedPostIdFromPath: 7 });

    expect(calls).toEqual([
      ...FEED_RUN({ pathPostId: 7 }),
      HOME,
      ADOPT,
      entry('setFeedOverlayTarget', TARGET),
    ]);
  });

  it('cieľ okna sa odovzdá tak, ako prišiel (ten istý objekt)', () => {
    decision = { kind: 'overlay', target: TARGET };
    const received: unknown[] = [];

    mountHook({
      feedPostIdFromPath: 7,
      setFeedOverlayTarget: (target) => {
        received.push(target);
      },
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(TARGET);
  });

  it('okno sa nepridáva do histórie, len ju preberá', () => {
    decision = { kind: 'overlay', target: TARGET };

    mountHook({ feedPostIdFromPath: 7 });

    expect(mockAdoptFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(mockAdoptFeedOverlayHistory).toHaveBeenCalledWith();
  });
});

describe('poradie efektov', () => {
  it('keď platia všetky, idú recenzie, detail, príspevok a tvorba', () => {
    decision = { kind: 'overlay', target: TARGET };

    mountHook({
      offerIdFromReviewsPath: 5,
      portfolioItemIdFromPath: 7,
      portfolioCreateMatch: MATCH,
      feedPostIdFromPath: 7,
    });

    expect(calls).toEqual([
      REVIEWS,
      DETAIL,
      ...FEED_RUN({ pathPostId: 7 }),
      HOME,
      ADOPT,
      entry('setFeedOverlayTarget', TARGET),
      CREATE,
    ]);
  });
});

describe('kedy sa ktorý efekt spustí znova', () => {
  const REVIEWS_RUN = 'reviews';
  const DETAIL_RUN = 'detail';
  const FEED_RUN_NAME = 'feed';
  const CREATE_RUN = 'create';

  const mountEverythingActive = (): Mounted => {
    decision = { kind: 'full-page' };
    return mountHook({
      offerIdFromReviewsPath: 5,
      portfolioItemIdFromPath: 7,
      portfolioCreateMatch: MATCH,
      feedPostIdFromPath: 7,
    });
  };

  const whichRan = (): string[] =>
    [
      calls.includes(REVIEWS) && REVIEWS_RUN,
      calls.includes(DETAIL) && DETAIL_RUN,
      calls.includes(BUSY) && FEED_RUN_NAME,
      calls.includes(CREATE) && CREATE_RUN,
    ].filter((name): name is string => Boolean(name));

  const changedValue = (key: keyof HookInput): Partial<HookInput> => {
    switch (key) {
      case 'offerIdFromReviewsPath':
        return { offerIdFromReviewsPath: 6 };
      case 'portfolioItemIdFromPath':
        return { portfolioItemIdFromPath: 8 };
      case 'portfolioCreateMatch':
        return { portfolioCreateMatch: [...MATCH] as unknown as RegExpMatchArray };
      case 'feedPostIdFromPath':
        return { feedPostIdFromPath: 8 };
      case 'feedOverlayTarget':
        return { feedOverlayTarget: TARGET };
      case 'isMobile':
        return { isMobile: true };
      case 'isViewportResolved':
        return { isViewportResolved: false };
      default:
        return { [key]: spy(key) } as Partial<HookInput>;
    }
  };

  it.each([
    ['offerIdFromReviewsPath', [REVIEWS_RUN]],
    ['portfolioItemIdFromPath', [DETAIL_RUN]],
    ['portfolioCreateMatch', [CREATE_RUN]],
    ['feedPostIdFromPath', [FEED_RUN_NAME]],
    ['feedOverlayTarget', [FEED_RUN_NAME]],
    ['setFeedOverlayTarget', [FEED_RUN_NAME]],
    ['setActiveModule', [REVIEWS_RUN, DETAIL_RUN, FEED_RUN_NAME, CREATE_RUN]],
    ['isMobile', [FEED_RUN_NAME]],
    ['isViewportResolved', [FEED_RUN_NAME]],
  ] as Array<[keyof HookInput, string[]]>)('zmena vstupu %s spustí znova: %j', (key, expected) => {
    const mounted = mountEverythingActive();
    calls = [];

    update(mounted, {
      offerIdFromReviewsPath: 5,
      portfolioItemIdFromPath: 7,
      portfolioCreateMatch: MATCH,
      feedPostIdFromPath: 7,
      ...changedValue(key),
    });

    expect(whichRan()).toEqual(expected);
  });
});
