/**
 * Preklik na CUDZÍ profil nesmie otvoriť vlastný.
 *
 * Posledný tvrdo načítaný route (`initialProfileSlug`) je zamrznutý Next.js
 * param – dashboard ďalej prepína cez `pushState`. Keď to bol vlastný profil,
 * efekt prepínajúci na plný vlastný profil ho videl aj po preklike na autora
 * príspevku. Pôvodne sa rozhodoval podľa id, a to je pri preklike ešte
 * neznáme (slug sa nastaví hneď, id z cache alebo až z API) – nevyriešené id
 * sa bralo ako „pozerám seba".
 *
 * Testy idú cez SKUTOČNÚ slug-cache a skutočné dispatchery (Nástenka,
 * notifikácia). Dashboard okolo hooku je zrkadlom `DashboardContent` – ten má
 * vlastný handler `goToUserProfile` a drží `activeModule` v stave, takže
 * prepnutie z hooku sa naozaj prejaví aj s následkami (kanonizácia adresy).
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}`,
      userProfile: (id: number) => `/profile/${id}`,
    },
  },
}));

import { api } from '@/lib/api';
import { useDashboardUserProfile } from '../useDashboardUserProfile';
import {
  getUserIdBySlug,
  invalidateUserProfileCache,
  primeUserSlugId,
  setUserProfileToCache,
} from '../../modules/profile/profileUserCache';
import { openUserProfile } from '../../modules/feed/feedProfileNavigation';
import { dispatchOfferWatchNotificationNavigation } from '../../modules/notifications/offerWatchNotificationNavigation';
import { resetProfileFreshEntry } from '../../modules/profile/profileFreshEntry';

const mockedGet = api.get as jest.Mock;

const OWN = { id: 1, slug: 'me' };
const AUTHOR = { id: 77, slug: 'jana', display_name: 'Jana' };
const OTHER = { id: 42, slug: 'peter' };

const viewer = OWN as never;
const noop = () => {};
const setHighlightedSkillId = jest.fn();

/** Serverové profily podľa slugu. Neznámy slug = odpoveď ešte nedorazila. */
let profilesBySlug: Record<string, { id: number; slug: string }>;

type HarnessProps = {
  initialRoute: string;
  initialProfileSlug: string | null;
};

/**
 * Dashboard okolo hooku: `activeModule` v stave a handler `goToUserProfile`
 * s rovnakými zápismi ako v `DashboardContent`.
 */
function useDashboardHarness({ initialRoute, initialProfileSlug }: HarnessProps) {
  const [activeModule, setActiveModule] = React.useState(initialRoute);
  const dashboardState = React.useMemo(
    () => ({
      setActiveModule,
      setIsRightSidebarOpen: noop,
      setActiveRightItem: noop,
      isRightSidebarOpen: false,
      activeRightItem: '',
    }),
    [],
  );

  const profile = useDashboardUserProfile({
    user: viewer,
    activeModule,
    dashboardState: dashboardState as never,
    initialProfileSlug,
    setHighlightedSkillId,
  });
  const { setViewedUserId, setViewedUserSlug } = profile;

  React.useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{
        identifier?: string;
        highlightId?: number | null;
        offerId?: number | null;
      }>).detail;
      const identifier = (detail?.identifier || '').trim();
      if (!identifier) return;
      const highlightId = detail?.offerId ?? detail?.highlightId ?? null;

      setActiveModule('user-profile');
      if (/^\d+$/.test(identifier)) {
        setViewedUserId(Number(identifier));
        setViewedUserSlug(null);
      } else {
        setViewedUserSlug(identifier);
        setViewedUserId(null);
        const cachedId = getUserIdBySlug(identifier);
        if (cachedId) {
          setViewedUserId(cachedId);
        } else {
          void (async () => {
            try {
              const { data } = await mockedGet(`/profile/slug/${identifier}`);
              setViewedUserId(data.id);
              setUserProfileToCache(data.id, data);
            } catch {
              // not-found rieši UI
            }
          })();
        }
      }
      const query =
        highlightId != null
          ? `?${detail?.offerId != null ? 'offer' : 'highlight'}=${highlightId}`
          : '';
      window.history.pushState(null, '', `/dashboard/users/${identifier}${query}`);
    };
    window.addEventListener('goToUserProfile', handler);
    return () => window.removeEventListener('goToUserProfile', handler);
  }, [setViewedUserId, setViewedUserSlug]);

  return { ...profile, activeModule, setActiveModule };
}

/** Tvrdé načítanie route – nový mount dashboardu na danej adrese. */
function hardLoad(path: string, props: HarnessProps) {
  window.history.replaceState(null, '', path);
  return renderHook(() => useDashboardHarness(props));
}

/** Klik na „Nástenka" – `handleMainModuleChange('home')`. */
function goToFeed(result: { current: ReturnType<typeof useDashboardHarness> }) {
  act(() => {
    window.history.pushState(null, '', '/dashboard');
    result.current.setActiveModule('home');
  });
}

/** Nechá dobehnúť efekty aj prípadné odpovede API. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileFreshEntry();
  [OWN.id, AUTHOR.id, OTHER.id].forEach(invalidateUserProfileCache);
  profilesBySlug = { me: OWN, peter: OTHER };
  mockedGet.mockImplementation((url: string) => {
    const slug = url.replace('/profile/slug/', '');
    const data = profilesBySlug[slug];
    // Autor sa ešte načítava – presne okno, v ktorom je id neznáme.
    return data ? Promise.resolve({ data }) : new Promise(() => {});
  });
});

afterEach(() => {
  resetProfileFreshEntry();
});

const OWN_PROFILE = { initialRoute: 'user-profile', initialProfileSlug: 'me' };
const FEED = { initialRoute: 'home', initialProfileSlug: null };
const FOREIGN_PROFILE = { initialRoute: 'user-profile', initialProfileSlug: 'peter' };

describe('tvrdé načítanie → Nástenka → klik na cudzieho autora', () => {
  it.each([
    ['vlastný profil', 'MIMO cache', '/dashboard/users/me', OWN_PROFILE],
    ['vlastný profil', 'V cache', '/dashboard/users/me', OWN_PROFILE],
    ['podstránka vlastného profilu', 'MIMO cache', '/dashboard/users/me/posts', OWN_PROFILE],
    ['podstránka vlastného profilu', 'V cache', '/dashboard/users/me/posts', OWN_PROFILE],
    ['Nástenka', 'MIMO cache', '/dashboard', FEED],
    ['Nástenka', 'V cache', '/dashboard', FEED],
    ['cudzí profil', 'MIMO cache', '/dashboard/users/peter', FOREIGN_PROFILE],
    ['cudzí profil', 'V cache', '/dashboard/users/peter', FOREIGN_PROFILE],
  ])('%s, slug autora %s → otvorí autora', async (_name, cache, path, props) => {
    const authorCached = cache === 'V cache';
    if (authorCached) primeUserSlugId(AUTHOR.slug, AUTHOR.id);

    const { result } = hardLoad(path, props);
    await settle();
    goToFeed(result);
    await settle();
    expect(result.current.activeModule).toBe('home');

    act(() => openUserProfile(AUTHOR));
    await settle();

    expect(result.current.activeModule).toBe('user-profile');
    expect(result.current.viewedUserSlug).toBe('jana');
    expect(result.current.viewedUserId).toBe(authorCached ? AUTHOR.id : null);
    // Kanonizácia vlastného profilu sa nespustila – adresa ostala autorova.
    expect(window.location.pathname).toBe('/dashboard/users/jana');
  });
});

describe('nefeedový vstup – notifikácia o sledovanej ponuke', () => {
  it('po tvrdom načítaní vlastného profilu otvorí vlastníka ponuky, nie seba', async () => {
    const { result } = hardLoad('/dashboard/users/me', OWN_PROFILE);
    await settle();
    goToFeed(result);
    await settle();

    act(() => {
      dispatchOfferWatchNotificationNavigation('/dashboard/users/jana?highlight=12');
    });
    await settle();

    expect(result.current.activeModule).toBe('user-profile');
    expect(result.current.viewedUserSlug).toBe('jana');
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/dashboard/users/jana?highlight=12',
    );
  });
});

describe('legitímny prípad – plný vlastný profil', () => {
  it.each([
    ['cache miss (F5)', false],
    ['cache hit (remount bez F5)', true],
  ])('tvrdé načítanie vlastného profilu, %s → modul profile', async (_name, cached) => {
    if (cached) setUserProfileToCache(OWN.id, OWN as never);

    const { result } = hardLoad('/dashboard/users/me', OWN_PROFILE);

    await waitFor(() => expect(result.current.activeModule).toBe('profile'));
    expect(mockedGet).toHaveBeenCalledTimes(cached ? 0 : 1);
  });

  it('F5 na vlastnom profile → vlastná portfólio položka → appkové späť → plný vlastný profil', async () => {
    // 1) F5 na vlastnom profile: slug nie je v cache, dotiahne sa z API.
    const first = hardLoad('/dashboard/users/me', OWN_PROFILE);
    await waitFor(() => expect(first.result.current.activeModule).toBe('profile'));
    expect(getUserIdBySlug('me')).toBe(OWN.id);
    first.unmount();

    // 2) Vlastná portfólio položka – `router.push` remountne dashboard.
    const detail = hardLoad('/dashboard/users/me/portfolio/5', {
      initialRoute: 'portfolio-detail',
      initialProfileSlug: 'me',
    });
    await settle();
    expect(detail.result.current.activeModule).toBe('portfolio-detail');
    detail.unmount();

    // 3) Appkové „späť" – `router.replace` na zoznam portfólia, ďalší remount.
    //    Slug je už v cache, takže sa vyrieši synchrónne.
    mockedGet.mockClear();
    const back = hardLoad('/dashboard/users/me/portfolio', OWN_PROFILE);

    await waitFor(() => expect(back.result.current.activeModule).toBe('profile'));
    // Naozaj šlo o cache hit – na API sa nesiahlo.
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
