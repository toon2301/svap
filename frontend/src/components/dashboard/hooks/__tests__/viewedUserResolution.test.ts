/**
 * Preklad slug → ID profilu (Nález 2 a 3 z mapovania Scenárov A+B).
 *
 * Každý beh končí práve jedným výsledkom – profil, „neexistuje" alebo chyba –
 * a nikdy neostane visieť. Zrušený beh (nový vstup, odchod) už nič nezapíše,
 * ani keď jeho odpoveď dorazí neskôr.
 */

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: { userProfileBySlug: (slug: string) => `/profile/slug/${slug}` },
  },
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  getUserIdBySlug: jest.fn(),
  setUserProfileToCache: jest.fn(),
}));

import { api } from '@/lib/api';
import { getUserIdBySlug, setUserProfileToCache } from '../../modules/profile/profileUserCache';
import {
  VIEWED_USER_RESOLVE_TIMEOUT_MS,
  startViewedUserResolution,
} from '../viewedUserResolution';

const mockedGet = api.get as jest.Mock;
const mockedCacheLookup = getUserIdBySlug as jest.Mock;

/** Odpoveď, ktorú test pustí, až keď chce. */
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function handlers() {
  return { onResolved: jest.fn(), onNotFound: jest.fn(), onFailed: jest.fn() };
}

/** Nechá dobehnúť všetky čakajúce promise reťaze. */
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCacheLookup.mockReturnValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('výsledok prekladu', () => {
  it('uses the cached id without any request', () => {
    mockedCacheLookup.mockReturnValue(10);
    const h = handlers();

    startViewedUserResolution('jana', h);

    expect(h.onResolved).toHaveBeenCalledWith(10);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('resolves the id from the API and caches the profile', async () => {
    mockedGet.mockResolvedValue({ data: { id: 10, slug: 'jana' } });
    const h = handlers();

    startViewedUserResolution('jana', h);
    await flush();

    expect(mockedGet).toHaveBeenCalledWith('/profile/slug/jana', {
      signal: expect.any(AbortSignal),
    });
    expect(h.onResolved).toHaveBeenCalledWith(10);
    expect(setUserProfileToCache).toHaveBeenCalledWith(10, { id: 10, slug: 'jana' });
    expect(h.onFailed).not.toHaveBeenCalled();
  });

  it('reports 404 as not found, not as an error', async () => {
    mockedGet.mockRejectedValue({ response: { status: 404 } });
    const h = handlers();

    startViewedUserResolution('neexistuje', h);
    await flush();

    expect(h.onNotFound).toHaveBeenCalledTimes(1);
    expect(h.onFailed).not.toHaveBeenCalled();
    expect(h.onResolved).not.toHaveBeenCalled();
  });

  it.each([
    ['výpadok siete (bez odpovede)', { code: 'ERR_NETWORK', message: 'Network Error' }],
    ['500', { response: { status: 500 } }],
    ['429', { response: { status: 429 } }],
    ['timeout requestu', { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }],
  ])('reports %s as an error, never as endless loading', async (_label, error) => {
    mockedGet.mockRejectedValue(error);
    const h = handlers();

    startViewedUserResolution('jana', h);
    await flush();

    expect(h.onFailed).toHaveBeenCalledTimes(1);
    expect(h.onNotFound).not.toHaveBeenCalled();
    expect(h.onResolved).not.toHaveBeenCalled();
  });

  it('ends a request that never answers as an error after the limit', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    mockedGet.mockImplementation((_url: string, config: { signal: AbortSignal }) => {
      signal = config.signal;
      return new Promise(() => {});
    });
    const h = handlers();

    startViewedUserResolution('jana', h);
    jest.advanceTimersByTime(VIEWED_USER_RESOLVE_TIMEOUT_MS - 1);
    expect(h.onFailed).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(h.onFailed).toHaveBeenCalledTimes(1);
    // Request sa zároveň preruší – nevisí ďalej na pozadí.
    expect(signal?.aborted).toBe(true);
  });

  it('ignores a success that arrives after the limit', async () => {
    jest.useFakeTimers();
    const late = deferred();
    mockedGet.mockReturnValue(late.promise);
    const h = handlers();

    startViewedUserResolution('jana', h);
    jest.advanceTimersByTime(VIEWED_USER_RESOLVE_TIMEOUT_MS);
    late.resolve({ data: { id: 10 } });
    await flush();

    expect(h.onFailed).toHaveBeenCalledTimes(1);
    expect(h.onResolved).not.toHaveBeenCalled();
  });
});

describe('zrušenie behu', () => {
  it.each([
    ['úspech', (d: ReturnType<typeof deferred>) => d.resolve({ data: { id: 10 } })],
    ['404', (d: ReturnType<typeof deferred>) => d.reject({ response: { status: 404 } })],
    ['chyba', (d: ReturnType<typeof deferred>) => d.reject({ response: { status: 500 } })],
  ])('a late %s after cancel writes nothing', async (_label, settle) => {
    const late = deferred();
    let signal: AbortSignal | undefined;
    mockedGet.mockImplementation((_url: string, config: { signal: AbortSignal }) => {
      signal = config.signal;
      return late.promise;
    });
    const h = handlers();

    const cancel = startViewedUserResolution('jana', h);
    cancel();
    expect(signal?.aborted).toBe(true);

    settle(late);
    await flush();

    expect(h.onResolved).not.toHaveBeenCalled();
    expect(h.onNotFound).not.toHaveBeenCalled();
    expect(h.onFailed).not.toHaveBeenCalled();
    expect(setUserProfileToCache).not.toHaveBeenCalled();
  });

  it('a cancelled run does not fire the limit later', () => {
    jest.useFakeTimers();
    mockedGet.mockReturnValue(new Promise(() => {}));
    const h = handlers();

    const cancel = startViewedUserResolution('jana', h);
    cancel();
    jest.advanceTimersByTime(VIEWED_USER_RESOLVE_TIMEOUT_MS * 2);

    expect(h.onFailed).not.toHaveBeenCalled();
  });
});
