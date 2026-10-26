/**
 * Cudzí profil: chyba pri „+ Pridať k obľúbeným“ a „Páči sa mi profil“ ukáže hlásku v jazyku aplikácie
 * (nález 166). Pri výpadku siete sa ukazovalo anglické „Network Error“ (surová správa knižnice axios).
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import { api } from '@/lib/api';
import { setFavoriteUserState } from '../favoritesApi';
import { setProfileLikeState } from '../profile/profileLikesApi';
import { invalidateUserProfileCache } from '../profile/profileUserCache';
import { SearchUserProfileModule } from './SearchUserProfileModule';
import sk from '../../../../../messages/sk.json';
import en from '../../../../../messages/en.json';
import cs from '../../../../../messages/cs.json';
import de from '../../../../../messages/de.json';
import pl from '../../../../../messages/pl.json';
import hu from '../../../../../messages/hu.json';

jest.unmock('@/contexts/LanguageContext');

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
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
jest.mock('@/hooks', () => ({ __esModule: true, useIsMobile: () => false }));
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
jest.mock('../profile/profileOffersCache', () => ({ __esModule: true, invalidateOffersCache: jest.fn() }));
jest.mock('./hooks/useSearchApi', () => ({ __esModule: true, invalidateSearchCacheForUser: jest.fn() }));
jest.mock('./recentSearchStorage', () => ({ __esModule: true, removeUserFromRecentSearches: jest.fn() }));
jest.mock('../profile/ProfileMobileView', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: (props: {
    onToggleFavorite: () => void;
    onToggleProfileLike: () => void;
    isFavorited: boolean;
  }) => (
    <div>
      <button type="button" onClick={props.onToggleFavorite}>
        {props.isFavorited ? 'remove favorite' : 'add favorite'}
      </button>
      <button type="button" onClick={props.onToggleProfileLike}>
        like profile
      </button>
    </div>
  ),
}));

type Dictionary = Record<string, unknown>;
const DICTIONARIES: Record<string, Dictionary> = { sk, en, cs, de, pl, hu };
const LOCALES = Object.keys(DICTIONARIES);

function text(locale: string, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === 'object' ? (current as Dictionary)[segment] : undefined,
      DICTIONARIES[locale],
    );
  if (typeof value !== 'string') throw new Error(`${locale}: chýba text ${key}`);
  return value;
}

function renderIn(locale: string, userExtra: Record<string, unknown> = {}) {
  localStorage.setItem('appLocale', locale);
  // Čerstvý odhad krajiny, aby provider nevolal sieť.
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  (api.get as jest.Mock).mockResolvedValue({
    data: {
      id: 42,
      user_type: 'personal',
      first_name: 'Jana',
      last_name: 'Nováková',
      is_favorited: false,
      is_profile_liked_by_me: false,
      profile_likes_count: 0,
      ...userExtra,
    },
  });
  return render(
    <LanguageProvider>
      <SearchUserProfileModule userId={42} currentUserId={7} />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  invalidateUserProfileCache(42);
  window.history.replaceState(null, '', '/dashboard/users/42');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const NETWORK = { code: 'ERR_NETWORK', message: 'Network Error' };
const TIMEOUT = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
const BAD_GATEWAY = { message: 'Request failed with status code 502', response: { status: 502 } };

describe.each(LOCALES)('jazyk %s: hlášky pri chybe akcií na profile', (locale) => {
  const toastText = () => (toast.error as jest.Mock).mock.calls.at(-1)?.[0];

  it.each([
    ['výpadok siete', NETWORK],
    ['časový limit', TIMEOUT],
  ])('%s: hláška o chybe siete namiesto anglickej správy knižnice', async (_label, failure) => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue(failure);
    (setProfileLikeState as jest.Mock).mockRejectedValue(failure);
    renderIn(locale);

    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    await waitFor(() => expect(toastText()).toBe(text(locale, 'common.networkError')));

    fireEvent.click(screen.getByRole('button', { name: 'like profile' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(toastText()).toBe(text(locale, 'common.networkError'));
  });

  it('chyba servera bez textu: hláška danej akcie, nie správa knižnice', async () => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue(BAD_GATEWAY);
    (setProfileLikeState as jest.Mock).mockRejectedValue(BAD_GATEWAY);
    renderIn(locale);

    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    await waitFor(() => expect(toastText()).toBe(text(locale, 'search.addToFavoritesError')));

    fireEvent.click(screen.getByRole('button', { name: 'like profile' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(toastText()).toBe(text(locale, 'profile.profileLikeUpdateFailed'));
  });

  it('odobratie z obľúbených: vlastná hláška akcie', async () => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue(BAD_GATEWAY);
    renderIn(locale, { is_favorited: true });

    fireEvent.click(await screen.findByRole('button', { name: 'remove favorite' }));
    await waitFor(() => expect(toastText()).toBe(text(locale, 'search.removeFromFavoritesError')));
  });

  it('text od servera sa ukáže tak, ako prišiel', async () => {
    const failure = { response: { status: 400, data: { error: 'Text od servera' } } };
    (setFavoriteUserState as jest.Mock).mockRejectedValue(failure);
    renderIn(locale);

    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    await waitFor(() => expect(toastText()).toBe('Text od servera'));
  });
});
