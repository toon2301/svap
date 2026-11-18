/**
 * Okno detailu príspevku a preklik na profil (nálezy 345 a 350).
 *
 * Okno nesmie ostať otvorené nad profilom, na ktorý sa práve prešlo, nech ho appka otvorila akokoľvek:
 *  - kartou cez kontext okna (kontext o ňom vie, jeho kópia cieľa je plná),
 *  - z upozornenia cez `handleFeedOverlayTargetChange` (kontext o ňom nevie),
 *  - priamo z adresy cez `setFeedOverlayTarget` (kontext o ňom nevie).
 *
 * Skúša sa so SKUTOČNÝM poskytovateľom okna, skutočným `openUserProfile` a skutočnou históriou okna
 * (`feedOverlayHistory`: príznaky `pushed`, `closing`, `adopted`). Funkcie histórie sú len obalené, aby sa
 * dali počítať ich volania, a `history.back()` je nahradené prázdnou funkciou, aby sa príchod kroku späť
 * (`popstate`) dal vyvolať ručne a príznak `closing` sa dal sledovať až do neho.
 */

import { useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import {
  FeedPostOverlayProvider,
  useFeedPostOverlay,
  type FeedPostOverlayTarget,
} from '../../contexts/FeedPostOverlayContext';
import {
  adoptFeedOverlayHistory,
  forgetFeedOverlayHistory,
  isFeedOverlayHistoryBusy,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
  resetFeedOverlayHistory,
} from '../../modules/feed/feedOverlayHistory';
import { decideFeedPostEntry } from '../../modules/feed/feedPostEntryDecision';
import { openUserProfile } from '../../modules/feed/feedProfileNavigation';
import { usePathModuleEffects } from '../usePathModuleEffects';
import { useFeedOverlayTarget } from '../useFeedOverlayTarget';

jest.mock('../../modules/feed/feedOverlayHistory', () => {
  const actual = jest.requireActual('../../modules/feed/feedOverlayHistory');
  return {
    ...actual,
    adoptFeedOverlayHistory: jest.fn(actual.adoptFeedOverlayHistory),
    forgetFeedOverlayHistory: jest.fn(actual.forgetFeedOverlayHistory),
    popFeedOverlayHistory: jest.fn(actual.popFeedOverlayHistory),
    pushFeedOverlayHistory: jest.fn(actual.pushFeedOverlayHistory),
  };
});

type Overlay = ReturnType<typeof useFeedOverlayTarget>;
type Api = { overlay: Overlay; context: ReturnType<typeof useFeedPostOverlay> };

/** Posledné vykreslené hodnoty: hook okna a jeho kontext (rovnako ich vidí komponent v strome). */
const published: { current: Api | null } = { current: null };

const mounted = (): Api => {
  if (!published.current) throw new Error('appka nie je vykreslená');
  return published.current;
};

const api = {
  get overlay() {
    return mounted().overlay;
  },
  get context() {
    return mounted().context;
  },
};

function Probe({ overlay }: { overlay: Overlay }) {
  const context = useFeedPostOverlay();
  useEffect(() => {
    published.current = { overlay, context };
  });
  return null;
}

/** Dashboard v malom: hook drží cieľ a poskytovateľ okna dostáva jeho `handleFeedOverlayTargetChange`. */
function Harness() {
  const overlay = useFeedOverlayTarget();
  return (
    <FeedPostOverlayProvider onTargetChange={overlay.handleFeedOverlayTargetChange}>
      <Probe overlay={overlay} />
    </FeedPostOverlayProvider>
  );
}

const mountApp = () => render(<Harness />);

const POST_URL = '/dashboard/feed/7';

let backSpy: jest.SpyInstance;
let pushStateSpy: jest.SpyInstance;
let replaceStateSpy: jest.SpyInstance;

const mockedHistory = [
  adoptFeedOverlayHistory,
  forgetFeedOverlayHistory,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
] as unknown as jest.Mock[];

beforeEach(() => {
  published.current = null;
  resetFeedOverlayHistory();
  mockedHistory.forEach((fn) => fn.mockClear());
  window.history.replaceState(null, '', '/dashboard');
  backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
  pushStateSpy = jest.spyOn(window.history, 'pushState');
  replaceStateSpy = jest.spyOn(window.history, 'replaceState');
});

afterEach(() => {
  cleanup();
  // Zhasne zostatkové `armClosingReset` listenery z kroku späť, ktorý sa v teste nedokončil.
  window.dispatchEvent(new PopStateEvent('popstate'));
  backSpy.mockRestore();
  pushStateSpy.mockRestore();
  replaceStateSpy.mockRestore();
  resetFeedOverlayHistory();
});

const currentTarget = () => api.overlay.feedOverlayTarget;

const contextOf = () => {
  if (!api.context) throw new Error('chýba poskytovateľ okna');
  return api.context;
};

type ProfileEvent = 'goToUserProfile' | 'goToMyProfile';

const dispatchProfileEvent = (name: ProfileEvent = 'goToUserProfile') => {
  window.dispatchEvent(new CustomEvent(name, { detail: { identifier: 'jana' } }));
};

/** Príchod kroku späť v prehliadači (`popstate`). */
const arriveBack = () => {
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/**
 * To isté, čo robí klik na avatar alebo meno autora komentára: `openCommentAuthorProfile`
 * z `FeedPostComments.tsx` (zatvorí okno len podľa kópie cieľa v kontexte) a skutočný `openUserProfile`.
 */
const clickCommentAuthor = () =>
  act(() => {
    const postOverlay = contextOf();
    openUserProfile(
      { id: 42, slug: 'jana' },
      {
        beforeNavigate: () => {
          if (postOverlay.target) postOverlay.close({ keepHistory: true });
        },
      },
    );
  });

/** Tri spôsoby, akými sa okno v appke otvára. */
const openByCard = (target: FeedPostOverlayTarget) =>
  act(() => {
    contextOf().open(target);
  });
const openByNotification = (target: FeedPostOverlayTarget) =>
  act(() => {
    api.overlay.handleFeedOverlayTargetChange(target);
  });
const openByAddress = (target: FeedPostOverlayTarget) =>
  act(() => {
    // Priamy vstup: adresa príspevku už v prehliadači je, okno ju len prevezme.
    window.history.replaceState(null, '', POST_URL);
    replaceStateSpy.mockClear();
    adoptFeedOverlayHistory();
    api.overlay.setFeedOverlayTarget(target);
  });

const OPENERS: Array<[string, (target: FeedPostOverlayTarget) => void]> = [
  ['kartou (kontext okna o ňom vie)', openByCard],
  ['z upozornenia cez handleFeedOverlayTargetChange (kontext o ňom nevie)', openByNotification],
  ['z adresy cez setFeedOverlayTarget (kontext o ňom nevie)', openByAddress],
];

describe.each(OPENERS)('okno otvorené %s', (_label, openWindow) => {
  it('klik na autora komentára okno zavrie bez kroku späť', () => {
    mountApp();
    openWindow({ postId: 7 });
    expect(currentTarget()).not.toBeNull();

    clickCommentAuthor();

    expect(currentTarget()).toBeNull();
    expect(contextOf().target).toBeNull();
    expect(backSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('klik na autora komentára zabudne záznam histórie presne raz (okno sa nezavrie druhýkrát)', () => {
    mountApp();
    openWindow({ postId: 7 });
    clickCommentAuthor();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
  });

  it.each<ProfileEvent>(['goToUserProfile', 'goToMyProfile'])(
    '%s okno zavrie bez kroku späť a záznam histórie len zabudne',
    (name) => {
      mountApp();
      openWindow({ postId: 7 });

      act(() => {
        dispatchProfileEvent(name);
      });

      expect(currentTarget()).toBeNull();
      expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
      expect(popFeedOverlayHistory).not.toHaveBeenCalled();
      expect(backSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).not.toHaveBeenCalled();
      expect(isFeedOverlayHistoryBusy()).toBe(false);
    },
  );

  it('preklik nikdy nepridá do histórie nový záznam', () => {
    mountApp();
    openWindow({ postId: 7 });
    const pushedByOpening = pushStateSpy.mock.calls.length;

    act(() => {
      dispatchProfileEvent();
    });

    expect(pushStateSpy.mock.calls.length).toBe(pushedByOpening);
  });

  it('po zatvorení prekliknutím sa okno dá znova otvoriť z adresy príspevku (Späť z profilu)', () => {
    mountApp();
    openWindow({ postId: 7, highlightCommentId: null });
    clickCommentAuthor();

    // Záznam okna ostal v histórii a nič ho neodobralo, takže Späť z profilu vráti na adresu príspevku
    // a appka ho znova otvorí rovnako ako pri preklikoch z hlavičky príspevku.
    expect(backSpy).not.toHaveBeenCalled();
    window.history.replaceState(null, '', POST_URL);
    expect(
      decideFeedPostEntry({
        pathPostId: 7,
        overlayOpen: currentTarget() !== null,
        historyBusy: isFeedOverlayHistoryBusy(),
        liveUrl: window.location.pathname + window.location.search,
        viewportResolved: true,
        isMobile: false,
      }),
    ).toEqual({ kind: 'overlay', target: { postId: 7, highlightCommentId: null } });
  });
});

describe('zatvorenie a preklik v jednej obsluhe (stav sa medzitým neprekreslí)', () => {
  it('zatvorenie s keepHistory a hneď preklik: okno sa nezavrie druhýkrát', () => {
    mountApp();
    openByNotification({ postId: 7 });

    act(() => {
      api.overlay.handleFeedOverlayTargetChange(null, { keepHistory: true });
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('zatvorenie cez kontext s keepHistory (ako robí beforeNavigate) a hneď preklik: žiadne volanie navyše', () => {
    mountApp();
    openByCard({ postId: 7 });
    pushStateSpy.mockClear();

    act(() => {
      contextOf().close({ keepHistory: true });
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('zatvorenie bez keepHistory a hneď preklik: krok späť beží raz a príznak closing ostáva do popstate', () => {
    mountApp();
    openByNotification({ postId: 7 });

    act(() => {
      api.overlay.handleFeedOverlayTargetChange(null);
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(popFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
    // Druhé zatvorenie by cez `forgetFeedOverlayHistory()` zhasilo `closing` skôr, než dobehne krok späť,
    // a appka by pod zavretým oknom otvorila celoobrazovkovú stránku príspevku.
    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    act(() => {
      arriveBack();
    });
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('zatvorenie cez kontext bez keepHistory a hneď preklik: tiež žiadne druhé zatvorenie', () => {
    mountApp();
    openByCard({ postId: 7 });

    act(() => {
      contextOf().close();
      dispatchProfileEvent('goToMyProfile');
    });

    expect(popFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(true);
  });

  it('zatvorenie priamym nastavením null a hneď preklik: okno sa nezavrie druhýkrát', () => {
    mountApp();
    openByAddress({ postId: 7 });

    act(() => {
      api.overlay.setFeedOverlayTarget(null);
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('tlačidlo späť (popstate) a hneď preklik: záznam sa zabudne presne raz', () => {
    mountApp();
    openByNotification({ postId: 7 });

    act(() => {
      arriveBack();
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('otvorenie priamym nastavením a hneď preklik: okno sa zavrie (rozhoduje aktuálny stav, nie vykreslený)', () => {
    mountApp();

    act(() => {
      api.overlay.setFeedOverlayTarget({ postId: 9 });
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
  });

  it('nastavenie cez funkciu vidí aktuálny cieľ a okno po preklikoch zavrie', () => {
    mountApp();
    act(() => {
      api.overlay.setFeedOverlayTarget({ postId: 9 });
    });
    act(() => {
      api.overlay.setFeedOverlayTarget((current) =>
        current ? { ...current, highlightCommentId: 5 } : null,
      );
    });
    expect(currentTarget()).toEqual({ postId: 9, highlightCommentId: 5 });

    act(() => {
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(1);
  });

  it('funkcia vracajúca null okno zatvorí a preklik ho nezatvára druhýkrát', () => {
    mountApp();
    act(() => {
      api.overlay.setFeedOverlayTarget({ postId: 9 });
    });

    act(() => {
      api.overlay.setFeedOverlayTarget(() => null);
      dispatchProfileEvent();
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
  });
});

describe('zavreté okno', () => {
  it('preklik bez otvoreného okna nerobí nič: ani stav, ani história', () => {
    mountApp();

    act(() => {
      dispatchProfileEvent('goToUserProfile');
      dispatchProfileEvent('goToMyProfile');
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
    expect(pushFeedOverlayHistory).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('okno zatvorené krížikom (krok späť beží): preklik nezhasne príznak closing', () => {
    mountApp();
    openByNotification({ postId: 7 });
    act(() => {
      api.overlay.handleFeedOverlayTargetChange(null);
    });
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    act(() => {
      dispatchProfileEvent();
    });

    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(isFeedOverlayHistoryBusy()).toBe(true);
  });

  it('po zatvorení a opätovnom otvorení rozhoduje vždy aktuálny cieľ', () => {
    mountApp();

    openByNotification({ postId: 7 });
    act(() => {
      dispatchProfileEvent();
    });
    expect(currentTarget()).toBeNull();

    const second = { postId: 8, highlightCommentId: 3 };
    openByNotification(second);
    expect(currentTarget()).toBe(second);
    act(() => {
      dispatchProfileEvent('goToMyProfile');
    });

    expect(currentTarget()).toBeNull();
    expect(forgetFeedOverlayHistory).toHaveBeenCalledTimes(2);
  });
});

describe('Späť z profilu (skutočné efekty podľa adresy)', () => {
  const setActiveModule = jest.fn();

  /** Dashboard v malom aj s `usePathModuleEffects`: `pathPostId` je príspevok z cesty podľa routera. */
  function BackHarness({ pathPostId }: { pathPostId: number | null }) {
    const overlay = useFeedOverlayTarget();
    usePathModuleEffects({
      offerIdFromReviewsPath: null,
      portfolioItemIdFromPath: null,
      portfolioCreateMatch: null,
      feedPostIdFromPath: pathPostId,
      feedOverlayTarget: overlay.feedOverlayTarget,
      setFeedOverlayTarget: overlay.setFeedOverlayTarget,
      setActiveModule,
      isMobile: false,
      isViewportResolved: true,
    });
    return <Probe overlay={overlay} />;
  }

  beforeEach(() => {
    setActiveModule.mockClear();
  });

  it('okno otvorené z upozornenia sa po prekliknutí zavrie a po Späť sa znova otvorí z adresy', () => {
    const view = render(<BackHarness pathPostId={null} />);
    openByNotification({ postId: 7, highlightCommentId: null });
    expect(window.location.pathname).toBe(POST_URL);

    // Preklik na profil: okno sa zavrie, jeho záznam v histórii ostane a profil sa pridá nad neho.
    act(() => {
      dispatchProfileEvent();
    });
    window.history.pushState(null, '', '/dashboard/profile/jana');
    view.rerender(<BackHarness pathPostId={null} />);
    expect(currentTarget()).toBeNull();
    expect(backSpy).not.toHaveBeenCalled();

    // Späť z profilu: adresa je opäť cesta príspevku a router ju oznámi dashboardu.
    window.history.replaceState(null, '', POST_URL);
    view.rerender(<BackHarness pathPostId={7} />);

    expect(currentTarget()).toEqual({ postId: 7, highlightCommentId: null });
    expect(adoptFeedOverlayHistory).toHaveBeenCalledTimes(1);
    expect(setActiveModule).toHaveBeenCalledWith('home');
  });

  it('kým beží krok späť po zatvorení krížikom, okno sa z adresy neotvorí znova', () => {
    const view = render(<BackHarness pathPostId={null} />);
    openByNotification({ postId: 7, highlightCommentId: null });
    view.rerender(<BackHarness pathPostId={7} />);

    // Krížik: záznam sa odoberá krokom späť (`closing`), adresa príspevku ešte chvíľu platí.
    act(() => {
      api.overlay.handleFeedOverlayTargetChange(null);
    });
    act(() => {
      dispatchProfileEvent();
    });
    view.rerender(<BackHarness pathPostId={7} />);

    expect(currentTarget()).toBeNull();
    expect(isFeedOverlayHistoryBusy()).toBe(true);
    expect(adoptFeedOverlayHistory).not.toHaveBeenCalled();
  });
});

describe('listenery', () => {
  const countCalls = (spy: jest.SpyInstance, type: string) =>
    spy.mock.calls.filter(([name]) => name === type).length;

  it('registrujú sa raz (aj pri zmenách cieľa) a po odmountovaní sa odoberú', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    try {
      const view = mountApp();
      expect(countCalls(addSpy, 'goToUserProfile')).toBe(1);
      expect(countCalls(addSpy, 'goToMyProfile')).toBe(1);

      openByNotification({ postId: 7 });
      openByNotification({ postId: 8 });
      act(() => {
        api.overlay.handleFeedOverlayTargetChange(null);
      });
      view.rerender(<Harness />);
      expect(countCalls(addSpy, 'goToUserProfile')).toBe(1);
      expect(countCalls(addSpy, 'goToMyProfile')).toBe(1);
      expect(countCalls(removeSpy, 'goToUserProfile')).toBe(0);
      expect(countCalls(removeSpy, 'goToMyProfile')).toBe(0);

      view.unmount();
      expect(countCalls(removeSpy, 'goToUserProfile')).toBe(1);
      expect(countCalls(removeSpy, 'goToMyProfile')).toBe(1);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it('po odmountovaní preklik na nič nereaguje', () => {
    const view = mountApp();
    openByNotification({ postId: 7 });
    mockedHistory.forEach((fn) => fn.mockClear());
    view.unmount();

    window.dispatchEvent(new CustomEvent('goToUserProfile', { detail: { identifier: 'jana' } }));
    window.dispatchEvent(new CustomEvent('goToMyProfile', { detail: {} }));

    expect(forgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(popFeedOverlayHistory).not.toHaveBeenCalled();
  });
});
