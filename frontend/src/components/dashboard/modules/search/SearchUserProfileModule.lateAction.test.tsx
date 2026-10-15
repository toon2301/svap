/**
 * Neskoré dokončenie akcie (obľúbený, „páči sa mi“) predošlého profilu.
 *
 * Z profilu na profil sa prechádza bez odmountovania modulu, takže akcia môže skončiť, až keď sa už zobrazuje
 * iný profil (aj taký, ktorý sa ukázal hneď z medzipamäte). Jej výsledok – úspech aj návrat po chybe – nesmie
 * prepísať stav zobrazeného profilu: patrí tomu, pre ktorý sa spustila. Medzipamäť sa opravuje podľa ID.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import toast from 'react-hot-toast';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { api } from '@/lib/api';
import { setFavoriteUserState } from '../favoritesApi';
import { setProfileLikeState } from '../profile/profileLikesApi';
import { resetProfileFreshEntry } from '../profile/profileFreshEntry';
import {
  getUserProfileFromCache,
  invalidateUserProfileCache,
  setUserProfileToCache,
} from '../profile/profileUserCache';

type MockViewProps = {
  user: { first_name?: string; is_profile_liked_by_me?: boolean; profile_likes_count?: number };
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onToggleProfileLike: () => void;
};

/** Zobrazenie profilu, ktoré ukazuje len to, čo akcie menia: meno, obľúbený, „páči sa mi“ a ich počet. */
function MockProfileView(props: MockViewProps) {
  return (
    <div>
      <span data-testid="shown-name">{props.user.first_name}</span>
      <span data-testid="favorited">{String(props.isFavorited)}</span>
      <span data-testid="liked">{String(props.user.is_profile_liked_by_me)}</span>
      <span data-testid="likes">{String(props.user.profile_likes_count)}</span>
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
    replace: jest.fn(),
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
  default: (props: MockViewProps) => <MockProfileView {...props} />,
}));
jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => <MockProfileView {...props} />,
}));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({ __esModule: true, default: () => null }));

type ProfileData = Record<string, unknown>;

/** Profil 43 má v testoch iný počet „páči sa mi“ ako ostatné, aby bolo vidieť, čí stav je zobrazený. */
const profile = (id: number): ProfileData => ({
  id,
  user_type: 'personal',
  first_name: `Meno${id}`,
  last_name: 'Tester',
  is_favorited: false,
  is_profile_liked_by_me: false,
  profile_likes_count: id === 43 ? 5 : 1,
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

type LikeResponse = {
  profile_user_id: number;
  is_profile_liked_by_me: boolean;
  profile_likes_count: number;
};

/** Odpoveď API podľa ID z adresy; `pending` drží vybrané ID bez odpovede. */
function answerProfiles(pending: Record<number, Promise<unknown>> = {}) {
  (api.get as jest.Mock).mockImplementation((url: string) => {
    const id = Number(/\/users\/(\d+)\//.exec(url)?.[1]);
    return pending[id] ?? Promise.resolve({ data: profile(id) });
  });
}

const shown = (testId: string) => screen.getByTestId(testId);

/**
 * Otvorí profil 42 a vráti ovládanie pre ďalšie kroky. Nie je `async`: po vykreslení sa musí hneď čakať na
 * obsah, inak by odpoveď API prišla mimo `act`.
 */
function openProfile42() {
  const view = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
  const clickWhenShown = async (name: string) => {
    fireEvent.click(await screen.findByRole('button', { name }));
  };
  const goTo = async (userId: number) => {
    view.rerender(<SearchUserProfileModule userId={userId} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent(`Meno${userId}`);
  };
  return { view, clickWhenShown, goTo };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/dashboard/users/42');
  resetProfileFreshEntry();
  [42, 43].forEach((id) => invalidateUserProfileCache(id));
  answerProfiles();
});

describe('SearchUserProfileModule – neskorý výsledok akcie predošlého profilu', () => {
  it('a favorite that finishes after the switch does not change the profile shown now', async () => {
    const favorite = deferred<void>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(favorite.promise);
    const { clickWhenShown, goTo } = openProfile42();
    await clickWhenShown('add favorite');

    await goTo(43);
    expect(shown('favorited')).toHaveTextContent('false');
    await act(async () => {
      favorite.resolve();
    });

    expect(shown('shown-name')).toHaveTextContent('Meno43');
    expect(shown('favorited')).toHaveTextContent('false');
    // Medzipamäť sa opravuje podľa ID: po návrate na profil 42 je obľúbený.
    expect(getUserProfileFromCache(42)?.is_favorited).toBe(true);
    expect(getUserProfileFromCache(43)?.is_favorited).toBe(false);
  });

  it('the same holds when the profile shown now came straight from the cache', async () => {
    const favorite = deferred<void>();
    const never = deferred<{ data: ProfileData }>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(favorite.promise);
    answerProfiles({ 43: never.promise });
    setUserProfileToCache(43, profile(43) as never);
    const { clickWhenShown, goTo } = openProfile42();
    await clickWhenShown('add favorite');

    // Profil 43 sa ukáže z medzipamäte, jeho odpoveď z API ešte neprišla.
    await goTo(43);
    await act(async () => {
      favorite.resolve();
    });

    expect(shown('shown-name')).toHaveTextContent('Meno43');
    expect(shown('favorited')).toHaveTextContent('false');
  });

  it('a like that finishes after the switch does not change the profile shown now', async () => {
    const like = deferred<LikeResponse>();
    (setProfileLikeState as jest.Mock).mockReturnValue(like.promise);
    const { clickWhenShown, goTo } = openProfile42();
    await clickWhenShown('like profile');
    // Okamžitá zmena patrí profilu 42.
    expect(shown('liked')).toHaveTextContent('true');
    expect(shown('likes')).toHaveTextContent('2');

    await goTo(43);
    expect(shown('liked')).toHaveTextContent('false');
    expect(shown('likes')).toHaveTextContent('5');
    await act(async () => {
      like.resolve({ profile_user_id: 42, is_profile_liked_by_me: true, profile_likes_count: 9 });
    });

    expect(shown('shown-name')).toHaveTextContent('Meno43');
    expect(shown('liked')).toHaveTextContent('false');
    expect(shown('likes')).toHaveTextContent('5');
    expect(getUserProfileFromCache(42)).toMatchObject({
      is_profile_liked_by_me: true,
      profile_likes_count: 9,
    });
  });

  it('a like that fails after the switch neither rolls back nor changes the profile shown now', async () => {
    const like = deferred<LikeResponse>();
    (setProfileLikeState as jest.Mock).mockReturnValue(like.promise);
    const { clickWhenShown, goTo } = openProfile42();
    await clickWhenShown('like profile');

    await goTo(43);
    await act(async () => {
      like.reject({ response: { data: { error: 'Like zlyhal' } } });
    });

    expect(shown('shown-name')).toHaveTextContent('Meno43');
    expect(shown('liked')).toHaveTextContent('false');
    expect(shown('likes')).toHaveTextContent('5');
    // Používateľ sa o chybe dozvie a medzipamäť profilu 42 sa vráti na pôvodný stav.
    expect(toast.error).toHaveBeenCalledWith('Like zlyhal');
    expect(getUserProfileFromCache(42)).toMatchObject({
      is_profile_liked_by_me: false,
      profile_likes_count: 1,
    });
  });

  it('still applies the result when the user is back on the same profile before the action ends', async () => {
    const favorite = deferred<void>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(favorite.promise);
    const { clickWhenShown, goTo } = openProfile42();
    await clickWhenShown('add favorite');

    await goTo(43);
    await goTo(42);
    expect(shown('favorited')).toHaveTextContent('false');
    await act(async () => {
      favorite.resolve();
    });

    expect(shown('shown-name')).toHaveTextContent('Meno42');
    expect(shown('favorited')).toHaveTextContent('true');
  });
});
