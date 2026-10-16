/**
 * Pôvod odchodu z Nástenky v návratovej snímke.
 *
 * Snímka si pamätá, kam používateľ odišiel (vlastný profil, cudzí profil, iné),
 * aby tlačidlo Domov vedelo, či ju smie použiť. Tu sa overuje samotný záznam:
 * určenie pôvodu pri oboch vstupoch z Nástenky, prenos udalosťou, uloženie a
 * čítanie (vrátane záznamov spred zavedenia pôvodu) a platnosť 30 minút.
 */

import type { FeedPost } from '@/lib/feedApi';
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  FEED_RETURN_STORAGE_KEY,
  FEED_RETURN_TTL_MS,
  onFeedReturnCapture,
  peekFeedReturn,
  profileReturnEntry,
  requestFeedReturnCapture,
  resetFeedReturnState,
  saveFeedReturn,
  type FeedReturnEntry,
} from '../feedReturnState';
import { openUserProfile } from '../feedProfileNavigation';
import { buildSharedSourceHandler } from '../feedSharedContentNavigation';

const ACCOUNT_ID = 42;

const post = { id: 1, post_type: 'free_post', caption: 'Príspevok' } as never;

/** Pôvody všetkých žiadostí o snímku, ktoré od tohto volania prišli. */
function recordCaptures(): { entries: FeedReturnEntry[]; stop: () => void } {
  const entries: FeedReturnEntry[] = [];
  const stop = onFeedReturnCapture((entry) => entries.push(entry));
  return { entries, stop };
}

beforeEach(() => {
  resetFeedReturnState();
  setCurrentAccountId(ACCOUNT_ID);
});

afterEach(() => {
  jest.restoreAllMocks();
  resetFeedReturnState();
  setCurrentAccountId(null);
});

describe('profileReturnEntry', () => {
  it('recognises the signed-in account as an own profile', () => {
    expect(profileReturnEntry(ACCOUNT_ID)).toBe('own-profile');
  });

  it('treats any other account as a foreign profile', () => {
    expect(profileReturnEntry(ACCOUNT_ID + 1)).toBe('other-profile');
  });

  it('falls back to a foreign profile when the id is missing', () => {
    expect(profileReturnEntry(undefined)).toBe('other-profile');
    expect(profileReturnEntry(null)).toBe('other-profile');
  });

  it('falls back to a foreign profile while the account is still unknown', () => {
    setCurrentAccountId(null);

    expect(profileReturnEntry(ACCOUNT_ID)).toBe('other-profile');
  });
});

describe('žiadosť o snímku nesie pôvod', () => {
  it('delivers the entry to the listener', () => {
    const { entries, stop } = recordCaptures();

    requestFeedReturnCapture('own-profile');
    requestFeedReturnCapture('other-profile');
    stop();

    expect(entries).toEqual(['own-profile', 'other-profile']);
  });

  it('defaults to "other" when the caller does not say', () => {
    const { entries, stop } = recordCaptures();

    requestFeedReturnCapture();
    stop();

    expect(entries).toEqual(['other']);
  });

  it('reads a bare event without detail as "other"', () => {
    const { entries, stop } = recordCaptures();

    window.dispatchEvent(new Event('feed-return-capture'));
    stop();

    expect(entries).toEqual(['other']);
  });

  it('reads an unknown entry value as "other"', () => {
    const { entries, stop } = recordCaptures();

    window.dispatchEvent(
      new CustomEvent('feed-return-capture', { detail: { entry: 'admin' } }),
    );
    stop();

    expect(entries).toEqual(['other']);
  });

  it('stops delivering after unsubscribing', () => {
    const { entries, stop } = recordCaptures();
    stop();

    requestFeedReturnCapture('own-profile');

    expect(entries).toEqual([]);
  });
});

describe('uloženie pôvodu v snímke', () => {
  it.each(['own-profile', 'other-profile', 'other'] as const)(
    'keeps the entry "%s" in the snapshot',
    (entry) => {
      saveFeedReturn({ posts: [post], nextUrl: null, scrollTop: 300, entry });

      expect(peekFeedReturn()?.entry).toBe(entry);
    },
  );

  it('stores "other" when the entry is not given', () => {
    saveFeedReturn({ posts: [post], nextUrl: null, scrollTop: 300 });

    expect(peekFeedReturn()?.entry).toBe('other');
  });

  /** Záznam napísaný priamo do úložiska – tak, ako ho zanechala staršia verzia. */
  function writeRaw(extra: Record<string, unknown>) {
    window.sessionStorage.setItem(
      FEED_RETURN_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        id: 'raw-1',
        ownerId: ACCOUNT_ID,
        savedAt: Date.now(),
        posts: [post],
        nextUrl: null,
        scrollTop: 300,
        ...extra,
      }),
    );
  }

  it('reads a record from before the entry existed as "other" (Back keeps working)', () => {
    writeRaw({});

    const snapshot = peekFeedReturn();

    expect(snapshot?.scrollTop).toBe(300);
    expect(snapshot?.entry).toBe('other');
  });

  it('reads a record with an invalid entry as "other"', () => {
    writeRaw({ entry: 'nobody' });

    expect(peekFeedReturn()?.entry).toBe('other');
  });
});

describe('platnosť snímky', () => {
  it('is thirty minutes', () => {
    expect(FEED_RETURN_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('still returns the feed after a long detour within the limit', () => {
    saveFeedReturn({ posts: [post], nextUrl: null, scrollTop: 300, entry: 'own-profile' });

    const realNow = Date.now;
    Date.now = () => realNow() + 29 * 60 * 1000;
    try {
      expect(peekFeedReturn()?.scrollTop).toBe(300);
    } finally {
      Date.now = realNow;
    }
  });

  it('goes stale just past the limit', () => {
    saveFeedReturn({ posts: [post], nextUrl: null, scrollTop: 300, entry: 'own-profile' });

    const realNow = Date.now;
    Date.now = () => realNow() + FEED_RETURN_TTL_MS + 1000;
    try {
      expect(peekFeedReturn()).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});

describe('vstup z hlavičky príspevku (openUserProfile)', () => {
  it('marks a foreign profile', () => {
    const { entries, stop } = recordCaptures();

    openUserProfile({ id: 21, slug: 'peter' });
    stop();

    expect(entries).toEqual(['other-profile']);
  });

  it('marks the own profile', () => {
    const { entries, stop } = recordCaptures();

    openUserProfile({ id: ACCOUNT_ID, slug: 'me' });
    stop();

    expect(entries).toEqual(['own-profile']);
  });

  it('does not ask for a snapshot when the profile cannot be opened', () => {
    const { entries, stop } = recordCaptures();

    openUserProfile({ id: 0, slug: '' });
    stop();

    expect(entries).toEqual([]);
  });
});

describe('vstup z prezdieľaného obsahu (buildSharedSourceHandler)', () => {
  function sharedPost(type: 'offer' | 'portfolio_item' | 'feed_post', ownerId: number): FeedPost {
    return {
      id: 5,
      shared_content: {
        type,
        id: 77,
        owner: { id: ownerId, slug: `u${ownerId}`, display_name: 'U', user_type: null, avatar_url: null },
      },
    } as unknown as FeedPost;
  }

  function open(post: FeedPost): FeedReturnEntry[] {
    const router = { push: jest.fn() };
    const handler = buildSharedSourceHandler(post, { router });
    const { entries, stop } = recordCaptures();
    handler?.();
    stop();
    return entries;
  }

  it('marks a foreign offer as a foreign profile', () => {
    expect(open(sharedPost('offer', 21))).toEqual(['other-profile']);
  });

  it('marks the own offer as the own profile', () => {
    expect(open(sharedPost('offer', ACCOUNT_ID))).toEqual(['own-profile']);
  });

  it.each(['portfolio_item', 'feed_post'] as const)(
    'marks a shared %s as "other" (it is not a profile), even when it is own',
    (type) => {
      expect(open(sharedPost(type, 21))).toEqual(['other']);
      expect(open(sharedPost(type, ACCOUNT_ID))).toEqual(['other']);
    },
  );
});
