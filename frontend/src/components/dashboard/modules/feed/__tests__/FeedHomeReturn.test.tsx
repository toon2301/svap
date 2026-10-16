/**
 * Tlačidlo Domov a zapamätané miesto Nástenky – rozhodovacia vrstva.
 *
 * Obnovu robí `FeedList` (pokrýva ju `FeedHomeEntryScroll` cez skutočný
 * dashboard). Tu sa overuje, KEDY smie Domov snímku použiť, čo sa so snímkou
 * stane pri voľbe sekcie a ako sa správa druhý klik (scroll na vrch).
 */

import { renderHook } from '@testing-library/react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  canRestoreFeedOnHome,
  FEED_SCROLL_TOP_EVENT,
  onFeedScrollTop,
  scrollFeedToTop,
  settleFeedReturnOnModuleChange,
} from '../feedHomeReturn';
import {
  FEED_RETURN_TTL_MS,
  peekFeedReturn,
  resetFeedReturnState,
  saveFeedReturn,
  type FeedReturnEntry,
} from '../feedReturnState';
import { useFeedHomeItemClick } from '../useFeedHomeItemClick';

const post = { id: 1, post_type: 'free_post', caption: 'Príspevok' } as never;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

function capture(entry: FeedReturnEntry | undefined, scrollTop = 500) {
  saveFeedReturn({ posts: [post], nextUrl: null, scrollTop, entry });
}

function mountMain(scrollTop: number): HTMLElement {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  document.body.appendChild(main);
  main.scrollTop = scrollTop;
  return main;
}

beforeEach(() => {
  resetFeedReturnState();
  setCurrentAccountId(42);
  setViewportWidth(1280);
});

afterEach(() => {
  resetFeedReturnState();
  setCurrentAccountId(null);
  document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
});

describe('canRestoreFeedOnHome', () => {
  it.each([
    ['own-profile', 1280, true],
    ['own-profile', 390, true],
    ['other-profile', 1280, true],
    ['other-profile', 390, false],
    ['other', 1280, false],
    ['other', 390, false],
    [undefined, 1280, false],
  ] as const)('entry %s at width %i → %s', (entry, width, expected) => {
    setViewportWidth(width);
    capture(entry);

    expect(canRestoreFeedOnHome()).toBe(expected);
  });

  it('uses the desktop boundary of 1024 px', () => {
    capture('other-profile');

    setViewportWidth(1023);
    expect(canRestoreFeedOnHome()).toBe(false);
    setViewportWidth(1024);
    expect(canRestoreFeedOnHome()).toBe(true);
  });

  it('is false without a snapshot', () => {
    expect(canRestoreFeedOnHome()).toBe(false);
  });

  it('is false for a snapshot taken at the very top', () => {
    capture('own-profile', 0);

    expect(canRestoreFeedOnHome()).toBe(false);
  });

  it('is false for an expired snapshot', () => {
    capture('own-profile');

    const realNow = Date.now;
    Date.now = () => realNow() + FEED_RETURN_TTL_MS + 1000;
    try {
      expect(canRestoreFeedOnHome()).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  it('is false for a snapshot of another account', () => {
    capture('own-profile');
    setCurrentAccountId(43);

    expect(canRestoreFeedOnHome()).toBe(false);
  });

  it('does not consume the snapshot (the feed does that on mount)', () => {
    capture('own-profile');

    canRestoreFeedOnHome();

    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });
});

describe('settleFeedReturnOnModuleChange', () => {
  it('keeps a usable snapshot when going home from another screen', () => {
    capture('own-profile');

    settleFeedReturnOnModuleChange('home', 'profile');

    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });

  it('drops a snapshot that Domov may not use', () => {
    setViewportWidth(390);
    capture('other-profile');

    settleFeedReturnOnModuleChange('home', 'messages');

    expect(peekFeedReturn()).toBeNull();
  });

  it('drops the snapshot on the repeated Domov (the feed is already shown)', () => {
    capture('own-profile');

    settleFeedReturnOnModuleChange('home', 'home');

    expect(peekFeedReturn()).toBeNull();
  });

  it('drops the snapshot when the own profile is chosen from the menu', () => {
    capture('own-profile');

    settleFeedReturnOnModuleChange('profile', 'home');

    expect(peekFeedReturn()).toBeNull();
  });

  it.each(['messages', 'statistics', 'requests', 'notifications', 'settings', 'favorites', 'search'])(
    'leaves the snapshot alone when %s is chosen',
    (moduleId) => {
      capture('other-profile');

      settleFeedReturnOnModuleChange(moduleId, 'user-profile');

      expect(peekFeedReturn()?.scrollTop).toBe(500);
    },
  );
});

describe('scrollFeedToTop', () => {
  it('moves the dashboard scroll area to the top', () => {
    const main = mountMain(2400);

    scrollFeedToTop();

    expect(main.scrollTop).toBe(0);
  });

  it('tells a pending restore to stand down', () => {
    mountMain(100);
    const heard = jest.fn();
    const stop = onFeedScrollTop(heard);

    scrollFeedToTop();
    stop();
    scrollFeedToTop();

    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('still announces the event when there is no scroll area on screen', () => {
    const listener = jest.fn();
    window.addEventListener(FEED_SCROLL_TOP_EVENT, listener);

    expect(() => scrollFeedToTop()).not.toThrow();

    window.removeEventListener(FEED_SCROLL_TOP_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('useFeedHomeItemClick', () => {
  function renderClick(activeModule: string) {
    const onItemClick = jest.fn();
    const { result } = renderHook(() => useFeedHomeItemClick(activeModule, onItemClick));
    return { click: result.current, onItemClick };
  }

  it('sends the feed to the top on a repeated Domov, then goes through the usual switch', () => {
    const main = mountMain(1800);
    const { click, onItemClick } = renderClick('home');

    click('home');

    expect(main.scrollTop).toBe(0);
    expect(onItemClick).toHaveBeenCalledWith('home');
  });

  it('does not scroll on Domov from another screen (the feed mounts on its own terms)', () => {
    const main = mountMain(1800);
    const { click, onItemClick } = renderClick('profile');

    click('home');

    expect(main.scrollTop).toBe(1800);
    expect(onItemClick).toHaveBeenCalledWith('home');
  });

  it('does not scroll for other items, even while the feed is shown', () => {
    const main = mountMain(1800);
    const { click, onItemClick } = renderClick('home');

    click('messages');

    expect(main.scrollTop).toBe(1800);
    expect(onItemClick).toHaveBeenCalledWith('messages');
  });
});
