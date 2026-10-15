/**
 * Prechod z profilu na profil bez odmountovania modulu (`goToUserProfile` s číselným ID alebo s ID z cache).
 *
 * Pod novou adresou sa nesmie ukázať nič z predošlého profilu: ani jeho profil, ani jeho chyba, ani
 * stav jeho zobrazenia (zoznam ponúk). Sleduje sa KAŽDÉ potvrdené vykreslenie (`Profiler`), nielen
 * výsledok po dobehnutí efektov – chyba bola práve v snímkach medzi prechodom a odpoveďou.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { api } from '@/lib/api';
import { setFavoriteUserState } from '../favoritesApi';
import { setProfileLikeState } from '../profile/profileLikesApi';
import { markProfileFreshEntry, resetProfileFreshEntry } from '../profile/profileFreshEntry';
import { invalidateUserProfileCache, setUserProfileToCache } from '../profile/profileUserCache';

const replaceMock = jest.fn();

type MockViewProps = {
  user: { first_name?: string };
  activeTab: string;
  offersOwnerId: number;
  onChangeTab: (tab: string) => void;
  onToggleFavorite: () => void;
  onToggleProfileLike: () => void;
};

/** Zobrazenie profilu s vlastným stavom (ako zoznam ponúk): drží vlastníka z prvého vykreslenia. */
function MockProfileView({ props }: { props: MockViewProps }) {
  const [firstOwner] = React.useState(props.offersOwnerId);
  return (
    <div data-testid="profile-view">
      <span data-testid="shown-name">{props.user.first_name}</span>
      <span data-testid="owner-id">{String(props.offersOwnerId)}</span>
      <span data-testid="first-owner">{String(firstOwner)}</span>
      <span data-testid="active-tab">{props.activeTab}</span>
      <button type="button" onClick={() => props.onChangeTab('portfolio')}>
        go portfolio
      </button>
      <button type="button" onClick={props.onToggleFavorite}>
        add favorite
      </button>
      <button type="button" onClick={props.onToggleProfileLike}>
        like profile
      </button>
    </div>
  );
}

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: replaceMock,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: () => false,
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn(), post: jest.fn() },
  endpoints: {
    dashboard: { userProfile: (id: number) => `/auth/dashboard/users/${id}/` },
    users: { block: (id: number) => `/auth/users/${id}/block/` },
  },
}));

jest.mock('../favoritesApi', () => ({ __esModule: true, setFavoriteUserState: jest.fn() }));
jest.mock('../messages/messagingApi', () => ({ __esModule: true, getMessagingErrorMessage: jest.fn() }));
jest.mock('../profile/profileLikesApi', () => ({ __esModule: true, setProfileLikeState: jest.fn() }));

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => <MockProfileView props={props} />,
}));
jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => <MockProfileView props={props} />,
}));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({ __esModule: true, default: () => null }));

type ProfileData = Record<string, unknown>;

const profile = (id: number, extra: ProfileData = {}): ProfileData => ({
  id,
  user_type: 'personal',
  first_name: `Meno${id}`,
  last_name: 'Tester',
  is_favorited: false,
  ...extra,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Obsah stránky v jednom potvrdenom vykreslení: celý text, meno zobrazeného profilu a aktívna záložka. */
type Commit = { text: string; name: string | null; tab: string | null };

/** Vykreslí modul a zapisuje obsah stránky po KAŽDOM potvrdenom vykreslení. */
function renderLogged(element: React.ReactElement) {
  const commits: Commit[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const textOf = (testId: string) =>
    container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? null;
  const wrap = (child: React.ReactElement) => (
    <React.Profiler
      id="module"
      onRender={() =>
        commits.push({
          text: container.textContent ?? '',
          name: textOf('shown-name'),
          tab: textOf('active-tab'),
        })
      }
    >
      {child}
    </React.Profiler>
  );
  const utils = render(wrap(element), { container });
  return {
    ...utils,
    commits,
    forgetCommits: () => {
      commits.length = 0;
    },
    rerender: (child: React.ReactElement) => utils.rerender(wrap(child)),
  };
}

const LOADING_TEXT = 'Načítavam profil používateľa...';
const LOAD_ERROR = 'Nepodarilo sa načítať profil používateľa.';

/** Odpoveď API podľa ID z adresy; `pending` drží vybrané ID bez odpovede. */
function answerProfiles(pending: Record<number, Promise<unknown>> = {}, failing: number[] = []) {
  (api.get as jest.Mock).mockImplementation((url: string) => {
    const id = Number(/\/users\/(\d+)\//.exec(url)?.[1]);
    if (failing.includes(id)) return Promise.reject({ response: { status: 500 } });
    if (pending[id]) return pending[id];
    return Promise.resolve({ data: profile(id) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/dashboard/users/42');
  resetProfileFreshEntry();
  [42, 43, 44].forEach((id) => invalidateUserProfileCache(id));
  replaceMock.mockReset();
  answerProfiles();
});

describe('SearchUserProfileModule – prechod z profilu na profil', () => {
  it('shows nothing of the previous profile while the new one loads (target not cached)', async () => {
    const pending = deferred<{ data: ProfileData }>();
    answerProfiles({ 43: pending.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno42');

    view.forgetCommits();
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    expect(view.commits.length).toBeGreaterThan(0);
    // Prvé potvrdené vykreslenie po prechode je už stav načítavania (nie prázdna stránka a nie predošlý profil).
    expect(view.commits[0].text).toContain(LOADING_TEXT);
    // Ani jedno potvrdené vykreslenie po prechode neobsahuje predošlý profil.
    expect(view.commits.filter((commit) => commit.text.includes('Meno42'))).toEqual([]);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();

    pending.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');
    expect(screen.getByTestId('owner-id')).toHaveTextContent('43');
  });

  it('shows nothing of the previous profile when the new one is cached, and never on the old tab', async () => {
    const pending = deferred<{ data: ProfileData }>();
    answerProfiles({ 43: pending.promise });
    window.history.replaceState(null, '', '/dashboard/users/42?tab=portfolio');
    setUserProfileToCache(43, profile(43) as never);
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno42');
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');

    view.forgetCommits();
    // To, čo robí `goToUserProfile`: nový záznam bez záložky, príznak nového vstupu, potom nové ID.
    window.history.pushState(null, '', '/dashboard/users/43');
    markProfileFreshEntry({ id: 43 });
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    await waitFor(() => expect(screen.getByTestId('shown-name')).toHaveTextContent('Meno43'));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('offers');
    // Aj profil z cache príde až po stave načítavania, nie v prvom vykreslení po prechode.
    expect(view.commits[0].text).toContain(LOADING_TEXT);
    expect(view.commits.filter((commit) => commit.text.includes('Meno42'))).toEqual([]);
    // Nový profil sa nikdy neukáže na záložke predošlého.
    expect(view.commits.filter((commit) => commit.name === 'Meno43' && commit.tab === 'portfolio')).toEqual([]);
  });

  it('gives the new profile a fresh view, so the state of the old one does not leak into it', async () => {
    const pending = deferred<{ data: ProfileData }>();
    answerProfiles({ 43: pending.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('first-owner')).toHaveTextContent('42');

    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);
    pending.resolve({ data: profile(43) });

    expect(await screen.findByTestId('owner-id')).toHaveTextContent('43');
    // Zobrazenie sa zmontovalo nanovo: jeho vlastný stav (zoznam ponúk) začína pri novom vlastníkovi.
    expect(screen.getByTestId('first-owner')).toHaveTextContent('43');
  });

  it('never shows the error of the previous profile under the new one', async () => {
    const pending = deferred<{ data: ProfileData }>();
    answerProfiles({ 43: pending.promise }, [42]);
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();

    view.forgetCommits();
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    expect(view.commits.length).toBeGreaterThan(0);
    expect(view.commits.filter((commit) => commit.text.includes(LOAD_ERROR))).toEqual([]);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();

    pending.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');
  });

  it('shows its own error for a new profile that fails, not a stale profile', async () => {
    answerProfiles({}, [43]);
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno42');

    view.forgetCommits();
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(view.commits.filter((commit) => commit.text.includes('Meno42'))).toEqual([]);
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();
  });

  it('ends on the profile it was switched back to, without a mixed state on the way', async () => {
    const pending = deferred<{ data: ProfileData }>();
    answerProfiles({ 43: pending.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno42');

    // Na Janu a hneď späť na prvý profil, skôr než odpovie.
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);
    view.forgetCommits();
    view.rerender(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno42');
    expect(screen.getByTestId('owner-id')).toHaveTextContent('42');
    expect(screen.getByTestId('first-owner')).toHaveTextContent('42');
    expect(view.commits.filter((commit) => commit.text.includes('Meno43'))).toEqual([]);

    // Neskorá odpoveď pre profil, z ktorého sa odišlo, nič nezmení.
    pending.resolve({ data: profile(43) });
    await waitFor(() => expect(screen.getByTestId('shown-name')).toHaveTextContent('Meno42'));
  });

  it('does not reset anything when the same profile is rendered again', async () => {
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');
    const calls = (api.get as jest.Mock).mock.calls.length;

    view.forgetCommits();
    view.rerender(<SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={null} />);
    view.rerender(<SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={null} />);

    // Rovnaké ID = rovnaký profil: bez načítavania, bez nového požiadavku a bez straty záložky.
    expect(view.commits.filter((commit) => commit.text.includes(LOADING_TEXT))).toEqual([]);
    expect(screen.getByTestId('shown-name')).toHaveTextContent('Meno42');
    expect(screen.getByTestId('first-owner')).toHaveTextContent('42');
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');
    expect((api.get as jest.Mock).mock.calls.length).toBe(calls);
  });
});

describe('SearchUserProfileModule – neskoré dokončenie práce predošlého profilu', () => {
  it('a late answer of the previous profile does not end the loading of the new one', async () => {
    const first = deferred<{ data: ProfileData }>();
    const second = deferred<{ data: ProfileData }>();
    answerProfiles({ 42: first.promise, 43: second.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    view.forgetCommits();
    await act(async () => {
      first.resolve({ data: profile(42) });
    });

    // Odpoveď predošlého profilu nič neukáže a načítavanie nového neukončí (nie prázdna stránka).
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();
    expect(view.commits.filter((commit) => commit.text.includes('Meno42'))).toEqual([]);

    second.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');
  });

  it('a late failure of the previous profile neither wipes the new profile nor shows its error', async () => {
    const first = deferred<{ data: ProfileData }>();
    const second = deferred<{ data: ProfileData }>();
    answerProfiles({ 42: first.promise, 43: second.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    second.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');

    view.forgetCommits();
    await act(async () => {
      first.reject({ response: { status: 404 } });
    });

    // Neskoré „nenájdené“ pre predošlý profil nesmie zmazať nový profil ani ukázať chybu.
    expect(screen.getByTestId('shown-name')).toHaveTextContent('Meno43');
    expect(view.commits.filter((commit) => commit.text.includes('Profil používateľa sa nepodarilo načítať.'))).toEqual([]);
  });

  it('a favorite that finishes while the next profile loads does not make a profile out of nothing', async () => {
    const favorite = deferred<void>();
    const pending = deferred<{ data: ProfileData }>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(favorite.promise);
    answerProfiles({ 43: pending.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));

    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    view.forgetCommits();
    await act(async () => {
      favorite.resolve();
    });

    // Dokončenie práce predošlého profilu nevytvorí z prázdneho stavu nový „profil“.
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();

    pending.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');
  });

  it('a like that finishes while the next profile loads does not make a profile out of nothing', async () => {
    const like = deferred<{
      profile_user_id: number;
      is_profile_liked_by_me: boolean;
      profile_likes_count: number;
    }>();
    const pending = deferred<{ data: ProfileData }>();
    (setProfileLikeState as jest.Mock).mockReturnValue(like.promise);
    answerProfiles({ 43: pending.promise });
    const view = renderLogged(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    view.rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    await act(async () => {
      like.resolve({ profile_user_id: 42, is_profile_liked_by_me: true, profile_likes_count: 9 });
    });

    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();

    pending.resolve({ data: profile(43) });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Meno43');
  });
});
