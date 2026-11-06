import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/api';
import type { SearchResults, SearchSkill, SearchUserResult } from '../types';
import { clearSearchResultsCache } from './searchResultsCache';
import { useRecentSearches } from './useRecentSearches';
import { useSearchApi } from './useSearchApi';
import { useSearchState } from './useSearchState';

/**
 * Klik na položku histórie hľadania overuje ponuky cez API. Kým overenie beží, môže používateľ kliknúť na inú položku,
 * spustiť nové hľadanie alebo hľadanie vymazať. Zastaraný klik potom nesmie prepísať novší stav ani zapísať históriu.
 * Testy bežia nad skutočnými hookmi (stav, história, hľadanie); mockuje sa len prenos a jazyk.
 */

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ searchCountry: 'SK', t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: {
      search: '/dashboard/search/',
      userSkills: (id: number) => `/skills/${id}/`,
      userProfile: (id: number) => `/profile/${id}/`,
    },
  },
}));

const mockGet = api.get as jest.Mock;

type Call = {
  url: string;
  signal: AbortSignal | undefined;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};
let calls: Call[] = [];

/**
 * Každé volanie API ostane nevybavené, kým test sám nerozhodne. Zrušenie signálu odpoveď nevybaví: zastaraná
 * odpoveď tak dorazí aj vtedy, keď prenos signál ignoruje (prísnejší prípad ako zrušenie v Axiose).
 */
function installTransport(rejectOnAbort = false) {
  calls = [];
  mockGet.mockReset().mockImplementation((url: string, config?: { signal?: AbortSignal }) =>
    new Promise((resolve, reject) => {
      calls.push({ url, signal: config?.signal, resolve, reject });
      if (rejectOnAbort) {
        config?.signal?.addEventListener('abort', () => reject(
          Object.assign(new Error('canceled'), { name: 'CanceledError', code: 'ERR_CANCELED' }),
        ));
      }
    }));
}

function call(url: string, nth = 0): Call {
  const found = calls.filter((item) => item.url === url)[nth];
  if (!found) throw new Error(`Chýba volanie API: ${url}`);
  return found;
}

const USER_ID = 12;
const HISTORY_KEY = `searchRecentResults_${USER_ID}`;
const ME = { id: USER_ID, username: 'ja', slug: 'ja' };

const skill = (id: number, ownerId: number) => ({
  id, user_id: ownerId, category: 'Kategória', subcategory: 'Podkategória', description: `Ponuka ${id}`,
}) as unknown as SearchSkill;
const person = (id: number, name: string): SearchUserResult => ({
  id, display_name: name, slug: `slug-${id}`, is_verified: false,
});

const entryA: SearchResults = { skills: [skill(11, 1)], users: [] };
const entryB: SearchResults = { skills: [skill(22, 2)], users: [] };
const entryWithUser: SearchResults = { skills: [], users: [person(5, 'Staré Meno')] };

/** Skutočný stav hľadania, história aj hľadanie nad jedným zdieľaným stavom, tak ako ich skladá SearchModule. */
function harness() {
  return renderHook(() => {
    const state = useSearchState();
    const recent = useRecentSearches({ user: ME as never, searchState: state });
    const search = useSearchApi({
      searchState: state,
      user: { id: USER_ID, location: '', district: '' } as never,
      isActive: true,
    });
    return { state, recent, search };
  });
}
type Harness = ReturnType<typeof harness>;

const click = (hook: Harness, entry: SearchResults) => act(() => {
  hook.result.current.recent.handleRecentResultClick(entry);
});
/** Vybaví volanie API odpoveďou a nechá dobehnúť pokračovanie. */
const respond = (target: Call, data: unknown, status = 200) => act(async () => {
  target.resolve({ data, status });
});
const resultIds = (hook: Harness) => hook.result.current.state.results?.skills.map((item) => item.id);

beforeEach(() => {
  localStorage.clear();
  clearSearchResultsCache();
  installTransport();
});

describe('useRecentSearches – jeden klik (základné správanie)', () => {
  it('overí ponuky cez API: ponechá len tie, ktoré API vráti, neoverené a poškodené zahodí', async () => {
    const hook = harness();
    const damaged = { id: 'x', user_id: 1 } as unknown as SearchSkill;
    const withoutOwner = { id: 14 } as unknown as SearchSkill;
    click(hook, { skills: [skill(11, 1), skill(12, 1), skill(13, 3), damaged, withoutOwner], users: [] });
    expect(hook.result.current.state.isSearching).toBe(true);

    await act(async () => {
      call('/skills/1/').resolve({ data: [{ id: 11 }] });
      call('/skills/3/').reject(new Error('sieť'));
    });

    expect(resultIds(hook)).toEqual([11]);
    expect(hook.result.current.state.hasSearched).toBe(true);
    expect(hook.result.current.state.isFromRecentSearch).toBe(true);
    expect(hook.result.current.state.error).toBeNull();
    expect(hook.result.current.state.isSearching).toBe(false);
  });
});

describe('useRecentSearches – zastaraný klik nesmie prepísať novší stav', () => {
  it('dva kliky po sebe: odpoveď prvého príde neskôr, ostane výsledok druhého', async () => {
    const hook = harness();
    click(hook, entryA);
    click(hook, entryB);
    expect(call('/skills/1/').signal?.aborted).toBe(true);
    expect(call('/skills/2/').signal?.aborted).toBe(false);

    await respond(call('/skills/2/'), [{ id: 22 }]);
    expect(resultIds(hook)).toEqual([22]);

    await respond(call('/skills/1/'), [{ id: 11 }]);
    expect(resultIds(hook)).toEqual([22]);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.state.isFromRecentSearch).toBe(true);
  });

  it('odpoveď zrušeného prvého kliku nič nezapíše a nevypne načítavanie druhého', async () => {
    const hook = harness();
    click(hook, entryA);
    click(hook, entryB);

    await respond(call('/skills/1/'), [{ id: 11 }]);
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.hasSearched).toBe(false);
    expect(hook.result.current.state.isSearching).toBe(true);

    await respond(call('/skills/2/'), [{ id: 22 }]);
    expect(resultIds(hook)).toEqual([22]);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('vymazanie hľadania počas overovania: oneskorený klik výsledky nevráti', async () => {
    const hook = harness();
    click(hook, entryA);
    act(() => hook.result.current.state.clearSearch());
    expect(call('/skills/1/').signal?.aborted).toBe(true);

    await respond(call('/skills/1/'), [{ id: 11 }]);
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.hasSearched).toBe(false);
    expect(hook.result.current.state.isFromRecentSearch).toBe(false);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('nové hľadanie počas overovania: klik sa zruší a jeho odpoveď výsledky hľadania nezmení', async () => {
    const hook = harness();
    click(hook, entryA);
    act(() => hook.result.current.state.setSearchQuery('Monitoring'));
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    expect(call('/skills/1/').signal?.aborted).toBe(true);

    // Odpoveď kliku príde skôr než odpoveď hľadania: hľadanie beží ďalej a klik nič nezapíše.
    await respond(call('/skills/1/'), [{ id: 11 }]);
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.isFromRecentSearch).toBe(false);
    expect(hook.result.current.state.isSearching).toBe(true);

    await act(async () => {
      call('/dashboard/search/').resolve({ data: { skills: [skill(33, 3)], users: [] }, status: 200 });
      await work;
    });
    expect(resultIds(hook)).toEqual([33]);
    expect(hook.result.current.state.isFromRecentSearch).toBe(false);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('nové hľadanie: odpoveď kliku, ktorá príde až po dokončení hľadania, výsledky neprepíše', async () => {
    const hook = harness();
    click(hook, entryA);
    act(() => hook.result.current.state.setSearchQuery('Monitoring'));
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });

    await act(async () => {
      call('/dashboard/search/').resolve({ data: { skills: [skill(33, 3)], users: [] }, status: 200 });
      await work;
    });
    expect(resultIds(hook)).toEqual([33]);

    await respond(call('/skills/1/'), [{ id: 11 }]);
    expect(resultIds(hook)).toEqual([33]);
    expect(hook.result.current.state.isFromRecentSearch).toBe(false);
    expect(hook.result.current.state.hasSearched).toBe(true);
  });

  it('zrušenie, ktoré prenos odmietne (CanceledError), nezanechá chybu ani zlý stav', async () => {
    installTransport(true);
    const hook = harness();
    click(hook, entryA);
    click(hook, entryB);

    await respond(call('/skills/2/'), [{ id: 22 }]);
    expect(resultIds(hook)).toEqual([22]);
    expect(hook.result.current.state.error).toBeNull();
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('odmontovanie zruší rozbehnutý klik', async () => {
    const hook = harness();
    click(hook, entryA);
    hook.unmount();
    expect(call('/skills/1/').signal?.aborted).toBe(true);

    await act(async () => { call('/skills/1/').resolve({ data: [{ id: 11 }], status: 200 }); });
    expect(hook.result.current.state.results).toBeNull();
  });
});

describe('useRecentSearches – obnova mien na pozadí a zápis histórie', () => {
  const freshProfile = { id: 5, username: 'zmenene', first_name: 'Nové', last_name: 'Meno', slug: 'nove-meno' };
  const seedHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify([entryWithUser]));
  const storedName = () => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')[0]?.users[0]?.display_name;

  it('aktuálny klik po overení obnoví meno vo výsledkoch aj v histórii (kontrolný prípad)', async () => {
    seedHistory();
    const hook = harness();
    click(hook, entryWithUser);
    await act(async () => {});
    expect(hook.result.current.state.results?.users[0]?.display_name).toBe('Staré Meno');

    await respond(call('/profile/5/'), freshProfile);
    expect(hook.result.current.state.results?.users[0]?.display_name).toBe('Nové Meno');
    expect(storedName()).toBe('Nové Meno');
  });

  it('zastaraný klik: obnova na pozadí nepíše ani do výsledkov, ani do histórie', async () => {
    seedHistory();
    const historyBefore = localStorage.getItem(HISTORY_KEY);
    const hook = harness();
    click(hook, entryWithUser);
    await act(async () => {});
    click(hook, entryB);
    expect(call('/profile/5/').signal?.aborted).toBe(true);

    await respond(call('/profile/5/'), freshProfile);
    expect(localStorage.getItem(HISTORY_KEY)).toBe(historyBefore);
    expect(hook.result.current.state.results?.users[0]?.display_name).toBe('Staré Meno');

    await respond(call('/skills/2/'), [{ id: 22 }]);
    expect(resultIds(hook)).toEqual([22]);
    expect(localStorage.getItem(HISTORY_KEY)).toBe(historyBefore);
  });
});
