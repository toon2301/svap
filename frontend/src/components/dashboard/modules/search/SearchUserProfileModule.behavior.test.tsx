/**
 * Správanie `SearchUserProfileModule`, ktoré nepokrýva `SearchUserProfileModule.test.tsx`:
 * načítanie (stav načítavania, cache, chyby 404 / 429 / ostatné), akcie (obľúbené, „páči sa mi“,
 * blokovanie, klávesnica), vstup do profilu, odvodené hodnoty (avatar, meno, typ účtu) a rovnaké
 * vlastnosti pre mobilné a desktopové zobrazenie.
 *
 * Testy hovoria len cez verejné rozhranie modulu (props → DOM atrapy zobrazení), takže platia
 * nezávisle od toho, ako je modul vnútri rozdelený.
 */

import React from 'react';
import { TextEncoder } from 'util';
import { MessageChannel } from 'worker_threads';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { onFeedHomeNavigation } from '../feed/feedHomeNavigation';
import { setFavoriteUserState } from '../favoritesApi';
import { api } from '@/lib/api';
import { getMessagingErrorMessage } from '../messages/messagingApi';
import { setProfileLikeState } from '../profile/profileLikesApi';
import { invalidateOffersCache } from '../profile/profileOffersCache';
import { markProfileFreshEntry, resetProfileFreshEntry } from '../profile/profileFreshEntry';
import { resetMessagesProfileOrigin } from '../messages/messagesProfileOrigin';
import {
  getUserProfileFromCache,
  invalidateUserProfileCache,
  setUserProfileToCache,
} from '../profile/profileUserCache';
import { invalidateSearchCacheForUser } from './hooks/useSearchApi';
import { removeUserFromRecentSearches } from './recentSearchStorage';

const pushMock = jest.fn();
const replaceMock = jest.fn();
let mockIsMobile = false;

type MockUser = {
  first_name?: string;
  is_profile_liked_by_me?: boolean;
  profile_likes_count?: number;
};

type MockViewProps = {
  user: MockUser;
  accountType: string;
  activeTab: string;
  offersOwnerId: number;
  isFavorited: boolean;
  isFavoritePending: boolean;
  isProfileLikePending: boolean;
  isOpeningConversation: boolean;
  onTabsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onToggleFavorite: () => void;
  onToggleProfileLike: () => void;
  onSendMessage: () => void;
  onAvatarClick: () => void;
  onOpenAllWebsitesModal: () => void;
  onBlockClick?: () => void;
};

/** Posledné vlastnosti, s ktorými sa vykreslilo mobilné / desktopové zobrazenie. */
const mockViewProps: { mobile: MockViewProps | null; desktop: MockViewProps | null } = {
  mobile: null,
  desktop: null,
};

function mockRenderProfileView(kind: 'mobile' | 'desktop', props: MockViewProps) {
  mockViewProps[kind] = props;
  return (
    <div data-testid={`${kind}-view`}>
      <span data-testid="shown-name">{props.user.first_name}</span>
      <span data-testid="owner-id">{String(props.offersOwnerId)}</span>
      <span data-testid="active-tab">{props.activeTab}</span>
      <span data-testid="account-type">{props.accountType}</span>
      <span data-testid="like-state">
        {`${props.user.is_profile_liked_by_me === true}:${props.user.profile_likes_count ?? 0}`}
      </span>
      <div role="tablist" tabIndex={0} data-testid="tabs" onKeyDown={props.onTabsKeyDown} />
      <button type="button" onClick={props.onToggleProfileLike} disabled={props.isProfileLikePending}>
        like profile
      </button>
      <button type="button" onClick={props.onToggleFavorite} disabled={props.isFavoritePending}>
        {props.isFavorited ? 'remove favorite' : 'add favorite'}
      </button>
      <button type="button" onClick={props.onSendMessage} disabled={props.isOpeningConversation}>
        open message
      </button>
      <button type="button" onClick={props.onAvatarClick}>
        open avatar
      </button>
      <button type="button" onClick={props.onOpenAllWebsitesModal}>
        open websites
      </button>
      {props.onBlockClick && (
        <button type="button" onClick={props.onBlockClick}>
          block profile
        </button>
      )}
    </div>
  );
}

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: () => mockIsMobile,
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  endpoints: {
    dashboard: {
      userProfile: (id: number) => `/auth/dashboard/users/${id}/`,
    },
    users: {
      block: (id: number) => `/auth/users/${id}/block/`,
    },
  },
}));

jest.mock('../favoritesApi', () => ({
  __esModule: true,
  setFavoriteUserState: jest.fn(),
}));

jest.mock('../messages/messagingApi', () => ({
  __esModule: true,
  getMessagingErrorMessage: jest.fn(),
}));

jest.mock('../profile/profileLikesApi', () => ({
  __esModule: true,
  setProfileLikeState: jest.fn(),
}));

jest.mock('../profile/profileOffersCache', () => ({
  __esModule: true,
  invalidateOffersCache: jest.fn(),
}));

jest.mock('./hooks/useSearchApi', () => ({
  __esModule: true,
  invalidateSearchCacheForUser: jest.fn(),
}));

jest.mock('./recentSearchStorage', () => ({
  __esModule: true,
  removeUserFromRecentSearches: jest.fn(),
}));

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => mockRenderProfileView('desktop', props),
}));

jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: (props: MockViewProps) => mockRenderProfileView('mobile', props),
}));

jest.mock('../profile/ProfileWebsitesModal', () => ({
  __esModule: true,
  default: ({
    open,
    user,
    onClose,
  }: {
    open: boolean;
    user: MockUser;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="mock websites modal">
        <span data-testid="websites-owner">{user.first_name}</span>
        <button type="button" onClick={onClose}>
          close websites
        </button>
      </div>
    ) : null,
}));

jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: ({
    open,
    images,
    alt,
    onClose,
    reportTarget,
  }: {
    open: boolean;
    images?: Array<{ image_url?: string | null }>;
    alt: string;
    onClose: () => void;
    reportTarget?: { type: string; userId: number };
  }) =>
    open ? (
      <div
        role="dialog"
        aria-label="mock avatar lightbox"
        data-report-type={reportTarget?.type}
        data-report-user={reportTarget?.userId}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images?.[0]?.image_url || ''} alt={alt} />
        <button type="button" onClick={onClose}>
          close lightbox
        </button>
      </div>
    ) : null,
}));

type ProfileData = Record<string, unknown>;

const profile = (id: number, extra: ProfileData = {}): ProfileData => ({
  id,
  user_type: 'personal',
  first_name: `Meno${id}`,
  last_name: 'Tester',
  is_favorited: false,
  is_profile_liked_by_me: false,
  profile_likes_count: 3,
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

const LOADING_TEXT = 'Načítavam profil používateľa...';

// Odchod na Nástenku prepisuje adresu (history.replaceState); ďalší test začína znova od koreňa.
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobile = false;
  mockViewProps.mobile = null;
  mockViewProps.desktop = null;
  window.history.replaceState(null, '', '/dashboard/users/42');
  resetProfileFreshEntry();
  // Ochrana pred dvojklikom na „Poslať správu“ je časová a modulová – testy sa nesmú ovplyvňovať.
  resetMessagesProfileOrigin();
  [42, 43].forEach((id) => invalidateUserProfileCache(id));
  pushMock.mockReset();
  replaceMock.mockReset();
  (api.get as jest.Mock).mockResolvedValue({ data: profile(42) });
  (api.post as jest.Mock).mockResolvedValue({ data: { user_id: 42, is_blocked: true, created: true } });
  (setFavoriteUserState as jest.Mock).mockResolvedValue(undefined);
  (setProfileLikeState as jest.Mock).mockResolvedValue({
    profile_user_id: 42,
    is_profile_liked_by_me: true,
    profile_likes_count: 4,
  });
  (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly open error');
});

describe('SearchUserProfileModule – načítanie profilu', () => {
  it('shows the loading text and no profile view until the first answer arrives', async () => {
    const pending = deferred<{ data: ProfileData }>();
    (api.get as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/dashboard/users/42/');

    await act(async () => {
      pending.resolve({ data: profile(42, { first_name: 'Anna' }) });
    });

    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Anna');
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument();
  });

  it('renders the loading text already in the very first render, before any effect runs', async () => {
    // `react-dom/server` v jsdom potrebuje `TextEncoder` a (od Reactu 19) aj `MessageChannel`.
    Object.assign(globalThis, { TextEncoder, MessageChannel });
    // `render` z testovacej knižnice efekty hneď prebehne; `renderToString` ukáže presne prvé vykreslenie.
    const { renderToString } = await import('react-dom/server');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = renderToString(<SearchUserProfileModule userId={42} currentUserId={7} />);
      expect(html).toContain(LOADING_TEXT);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('invalidates the offers cache of the shown profile before it loads', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await screen.findByTestId('shown-name');

    expect(invalidateOffersCache).toHaveBeenCalledWith(42);
  });

  it('shows a cached profile at once and replaces it with the fresh answer', async () => {
    const pending = deferred<{ data: ProfileData }>();
    (api.get as jest.Mock).mockReturnValue(pending.promise);
    setUserProfileToCache(42, profile(42, { first_name: 'Cache' }) as never);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    // Z cache sa profil ukáže bez čakania na odpoveď.
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Cache');
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ data: profile(42, { first_name: 'Cerstve' }) });
    });

    expect(screen.getByTestId('shown-name')).toHaveTextContent('Cerstve');
    expect(getUserProfileFromCache(42)?.first_name).toBe('Cerstve');
  });

  it('does not depend on the id stored inside the answer', async () => {
    // Identitu profilu určuje požadované ID (`userId`), nie `id` v odpovedi.
    (api.get as jest.Mock).mockResolvedValue({ data: profile(999, { first_name: 'Ine' }) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Ine');
    expect(screen.getByTestId('owner-id')).toHaveTextContent('999');
  });

  it('shows the not-found text and forgets the profile on a 404', async () => {
    setUserProfileToCache(42, profile(42) as never);
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(await screen.findByText('Profil používateľa sa nepodarilo načítať.')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
    expect(getUserProfileFromCache(42)).toBeUndefined();
    // Raz pri štarte načítania a raz pri zabudnutí profilu.
    expect(invalidateOffersCache).toHaveBeenCalledTimes(2);
    expect(invalidateSearchCacheForUser).toHaveBeenCalledWith(42);
    expect(removeUserFromRecentSearches).toHaveBeenCalledWith(7, 42);
  });

  it.each([
    [
      '429 -> rate limit text',
      { response: { status: 429 } },
      'Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.',
    ],
    [
      'API error text',
      { response: { status: 500, data: { error: 'Chyba servera' } } },
      'Chyba servera',
    ],
    [
      'API detail text',
      { response: { status: 500, data: { detail: 'Podrobnosť' } } },
      'Podrobnosť',
    ],
    [
      'network failure -> translated text (nález 166)',
      { code: 'ERR_NETWORK', message: 'Network Error' },
      'Chyba siete. Skontrolujte pripojenie a skúste to znova.',
    ],
    [
      'timeout -> translated text (nález 166)',
      { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' },
      'Chyba siete. Skontrolujte pripojenie a skúste to znova.',
    ],
    [
      'library message of a failed answer is not shown (nález 166)',
      { message: 'Request failed with status code 502', response: { status: 502 } },
      'Nepodarilo sa načítať profil používateľa.',
    ],
    [
      'plain message without a code -> generic text (nález 166)',
      { message: 'Network Error' },
      'Nepodarilo sa načítať profil používateľa.',
    ],
    ['nothing known -> generic text', {}, 'Nepodarilo sa načítať profil používateľa.'],
  ])('shows the right text for a failed load: %s', async (_label, failure, expected) => {
    (api.get as jest.Mock).mockRejectedValue(failure);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(await screen.findByText(expected)).toBeInTheDocument();
    // Iná chyba než 404 nemaže stav klienta.
    expect(removeUserFromRecentSearches).not.toHaveBeenCalled();
  });

  it('leads the error screen back to the dashboard home', async () => {
    // Na Nástenku prepína Dashboard (žiadosť `feed-go-home`), nie router (nález 172).
    const homeRequests = jest.fn();
    const stopHomeRequests = onFeedHomeNavigation(homeRequests);
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 500 } });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Späť na nástenku' }));
    stopHomeRequests();

    expect(homeRequests).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('keeps a cached profile on screen when the refresh fails', async () => {
    const pending = deferred<{ data: ProfileData }>();
    setUserProfileToCache(42, profile(42, { first_name: 'Cache' }) as never);
    (api.get as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Cache');

    // Zlyhanie sa spracuje v act, takže stav je pri kontrole už vykreslený.
    await act(async () => {
      pending.reject({ response: { status: 500 } });
    });

    expect(screen.getByTestId('shown-name')).toHaveTextContent('Cache');
    expect(screen.queryByText('Nepodarilo sa načítať profil používateľa.')).not.toBeInTheDocument();
  });

  it('ignores the answer when the module was unmounted meanwhile', async () => {
    const pending = deferred<{ data: ProfileData }>();
    (api.get as jest.Mock).mockReturnValue(pending.promise);
    window.history.replaceState(null, '', '/dashboard/users/42');

    const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    unmount();

    await act(async () => {
      pending.resolve({ data: profile(42, { slug: 'test-user' }) });
    });

    // Kanonizácia adresy sa po odmountovaní nespustí.
    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/dashboard/users/42');
  });

  it('leaves an address that already uses the slug alone', async () => {
    window.history.replaceState(null, '', '/dashboard/users/test-user?tab=offers');
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { slug: 'test-user' }) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await screen.findByTestId('shown-name');

    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/dashboard/users/test-user');
  });

  it('loads the new profile when the id changes and ignores a late answer for the old one', async () => {
    const first = deferred<{ data: ProfileData }>();
    const second = deferred<{ data: ProfileData }>();
    (api.get as jest.Mock).mockImplementation((url: string) =>
      url.includes('/42/') ? first.promise : second.promise,
    );

    const { rerender } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);
    expect(api.get).toHaveBeenCalledWith('/auth/dashboard/users/43/');

    await act(async () => {
      second.resolve({ data: profile(43, { first_name: 'Nova' }) });
    });
    expect(await screen.findByTestId('shown-name')).toHaveTextContent('Nova');

    // Neskorá odpoveď pre predošlý profil nesmie nič prepísať.
    await act(async () => {
      first.resolve({ data: profile(42, { first_name: 'Stara' }) });
    });
    expect(screen.getByTestId('shown-name')).toHaveTextContent('Nova');
    expect(getUserProfileFromCache(43)?.first_name).toBe('Nova');
  });

  it('closes an open avatar lightbox when the shown profile changes', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data: profile(url.includes('/43/') ? 43 : 42, {
          avatar_url: 'https://example.com/a.jpg',
        }),
      }),
    );

    const { rerender } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));
    expect(screen.getByRole('dialog', { name: 'mock avatar lightbox' })).toBeInTheDocument();

    rerender(<SearchUserProfileModule userId={43} currentUserId={7} />);

    // Až keď je na obrazovke nový profil: dovtedy je stránka v stave načítavania a okno tam tak či tak nie je.
    await waitFor(() => expect(screen.getByTestId('owner-id')).toHaveTextContent('43'));
    expect(screen.queryByRole('dialog', { name: 'mock avatar lightbox' })).not.toBeInTheDocument();
  });
});

describe('SearchUserProfileModule – vstup do profilu a záložky', () => {
  it('opens a fresh entry on the offers tab', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42?tab=portfolio');
    markProfileFreshEntry({ id: 42 });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await waitFor(() => expect(screen.getByTestId('active-tab')).toHaveTextContent('offers'));
    expect(window.location.search).toBe('?tab=offers');
  });

  it('replaces the history entry for a fresh entry instead of adding one', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42?tab=portfolio');
    markProfileFreshEntry({ id: 42 });
    const lengthBefore = window.history.length;

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    await waitFor(() => expect(screen.getByTestId('active-tab')).toHaveTextContent('offers'));

    expect(window.history.length).toBe(lengthBefore);
  });

  it('keeps the tab from the address when the entry is not fresh', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42?tab=portfolio');

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await screen.findByTestId('active-tab');
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');
    expect(window.location.search).toBe('?tab=portfolio');
  });

  it('moves between tabs with the arrow keys and wraps around at both ends', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const tabs = await screen.findByTestId('tabs');
    const tab = () => screen.getByTestId('active-tab');
    expect(tab()).toHaveTextContent('offers');

    // `fireEvent` vráti false, keď sa udalosť zrušila (`preventDefault`).
    expect(fireEvent.keyDown(tabs, { key: 'ArrowRight' })).toBe(false);
    expect(tab()).toHaveTextContent('portfolio');
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(tab()).toHaveTextContent('posts');
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(tab()).toHaveTextContent('tagged');
    fireEvent.keyDown(tabs, { key: 'ArrowRight' });
    expect(tab()).toHaveTextContent('offers');

    expect(fireEvent.keyDown(tabs, { key: 'ArrowLeft' })).toBe(false);
    expect(tab()).toHaveTextContent('tagged');
    fireEvent.keyDown(tabs, { key: 'ArrowLeft' });
    expect(tab()).toHaveTextContent('posts');

    // Iné klávesy nič nerobia a udalosť nechávajú prehliadaču.
    expect(fireEvent.keyDown(tabs, { key: 'Enter' })).toBe(true);
    expect(tab()).toHaveTextContent('posts');
  });
});

describe('SearchUserProfileModule – obľúbené', () => {
  it('shows the next favorite state only after the request succeeded and patches the cache', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));

    expect(await screen.findByRole('button', { name: 'remove favorite' })).toBeInTheDocument();
    expect(setFavoriteUserState).toHaveBeenCalledWith(42, true);
    expect(getUserProfileFromCache(42)?.is_favorited).toBe(true);
  });

  it('keeps the state, reports the API text and re-enables the button when adding fails', async () => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue({ response: { data: { error: 'Nie' } } });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nie'));
    expect(screen.getByRole('button', { name: 'add favorite' })).toBeEnabled();
  });

  it('uses a fallback text per direction when the failure carries no text', async () => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue({});
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { is_favorited: false }) });

    const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa pridať k obľúbeným.'),
    );
    unmount();

    invalidateUserProfileCache(42);
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { is_favorited: true }) });
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'remove favorite' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa odobrať z obľúbených.'),
    );
  });

  it('sends one request only while the previous one is pending', async () => {
    const pending = deferred<void>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const button = await screen.findByRole('button', { name: 'add favorite' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(setFavoriteUserState).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve();
    });
    expect(await screen.findByRole('button', { name: 'remove favorite' })).toBeEnabled();
  });

  it('ignores the action for a profile without a valid id', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: profile(0) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));

    expect(setFavoriteUserState).not.toHaveBeenCalled();
  });
});

describe('SearchUserProfileModule – „páči sa mi“ na profile', () => {
  it('shows the optimistic state at once, then the numbers confirmed by the server, and patches the cache', async () => {
    const pending = deferred<{
      profile_user_id: number;
      is_profile_liked_by_me: boolean;
      profile_likes_count: number;
    }>();
    (setProfileLikeState as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const like = await screen.findByRole('button', { name: 'like profile' });
    expect(screen.getByTestId('like-state')).toHaveTextContent('false:3');

    fireEvent.click(like);

    expect(setProfileLikeState).toHaveBeenCalledWith(42, true);
    expect(screen.getByTestId('like-state')).toHaveTextContent('true:4');
    expect(like).toBeDisabled();
    expect(getUserProfileFromCache(42)).toMatchObject({
      is_profile_liked_by_me: true,
      profile_likes_count: 4,
    });

    await act(async () => {
      pending.resolve({ profile_user_id: 42, is_profile_liked_by_me: true, profile_likes_count: 9 });
    });

    expect(screen.getByTestId('like-state')).toHaveTextContent('true:9');
    expect(like).toBeEnabled();
    expect(getUserProfileFromCache(42)).toMatchObject({
      is_profile_liked_by_me: true,
      profile_likes_count: 9,
    });
  });

  it('removes the like and never lets the count drop below zero', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: profile(42, { is_profile_liked_by_me: true, profile_likes_count: 0 }),
    });
    (setProfileLikeState as jest.Mock).mockResolvedValue({
      profile_user_id: 42,
      is_profile_liked_by_me: false,
      profile_likes_count: 0,
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    expect(setProfileLikeState).toHaveBeenCalledWith(42, false);
    expect(screen.getByTestId('like-state')).toHaveTextContent('false:0');
    await waitFor(() => expect(screen.getByRole('button', { name: 'like profile' })).toBeEnabled());
  });

  it('sanitises the numbers from the server (non-true flag, negative count)', async () => {
    (setProfileLikeState as jest.Mock).mockResolvedValue({
      profile_user_id: 42,
      is_profile_liked_by_me: 'yes',
      profile_likes_count: -5,
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    await waitFor(() => expect(screen.getByTestId('like-state')).toHaveTextContent('false:0'));
  });

  it('rolls the state and the cache back and reports the API text when the request fails', async () => {
    (setProfileLikeState as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Zlyhalo' } },
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Zlyhalo'));
    expect(screen.getByTestId('like-state')).toHaveTextContent('false:3');
    expect(screen.getByRole('button', { name: 'like profile' })).toBeEnabled();
    expect(getUserProfileFromCache(42)).toMatchObject({
      is_profile_liked_by_me: false,
      profile_likes_count: 3,
    });
  });

  it('uses the generic text when the failure carries none', async () => {
    (setProfileLikeState as jest.Mock).mockRejectedValue({});

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa aktualizovat paci sa mi.'),
    );
  });

  it('sends one request only while the previous one is pending', async () => {
    const pending = deferred<{
      profile_user_id: number;
      is_profile_liked_by_me: boolean;
      profile_likes_count: number;
    }>();
    (setProfileLikeState as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const like = await screen.findByRole('button', { name: 'like profile' });
    fireEvent.click(like);
    fireEvent.click(like);

    expect(setProfileLikeState).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ profile_user_id: 42, is_profile_liked_by_me: true, profile_likes_count: 4 });
    });
  });

  it('ignores the action for a profile without a valid id', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: profile(0) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));

    expect(setProfileLikeState).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'like profile' })).toBeEnabled();
  });
});

describe('SearchUserProfileModule – blokovanie a správa', () => {
  it('forgets the blocked profile on the client before it leaves for the dashboard', async () => {
    const homeRequests = jest.fn();
    const stopHomeRequests = onFeedHomeNavigation(homeRequests);
    setUserProfileToCache(42, profile(42) as never);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const blockButton = await screen.findByRole('button', { name: 'block profile' });
    // Načítanie profilu už cache ponúk raz zrušilo – počíta sa až čistenie po blokovaní.
    (invalidateOffersCache as jest.Mock).mockClear();
    fireEvent.click(blockButton);
    fireEvent.click(screen.getByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => expect(homeRequests).toHaveBeenCalledTimes(1));
    stopHomeRequests();
    expect(getUserProfileFromCache(42)).toBeUndefined();
    expect(invalidateOffersCache).toHaveBeenCalledTimes(1);
    expect(invalidateOffersCache).toHaveBeenCalledWith(42);
    expect(invalidateSearchCacheForUser).toHaveBeenCalledWith(42);
    expect(removeUserFromRecentSearches).toHaveBeenCalledWith(7, 42);
  });

  it('opens the draft conversation route for the shown profile', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'open message' }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42'),
    );
  });
});

describe('SearchUserProfileModule – odvodené hodnoty', () => {
  it('maps the account type from the user type', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { user_type: 'company' }) });
    const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('account-type')).toHaveTextContent('business');
    unmount();

    invalidateUserProfileCache(42);
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { user_type: 'individual' }) });
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('account-type')).toHaveTextContent('personal');
  });

  it('opens the websites modal for the shown profile and closes it again', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    const openButton = await screen.findByRole('button', { name: 'open websites' });
    // Až keď je profil na obrazovke: okno webov je na začiatku zatvorené.
    expect(screen.queryByRole('dialog', { name: 'mock websites modal' })).not.toBeInTheDocument();

    fireEvent.click(openButton);
    const dialog = screen.getByRole('dialog', { name: 'mock websites modal' });
    expect(within(dialog).getByTestId('websites-owner')).toHaveTextContent('Meno42');

    fireEvent.click(within(dialog).getByRole('button', { name: 'close websites' }));
    expect(screen.queryByRole('dialog', { name: 'mock websites modal' })).not.toBeInTheDocument();
  });

  it('opens the websites modal from the mobile view as well', async () => {
    mockIsMobile = true;
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('mobile-view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open websites' }));

    expect(screen.getByRole('dialog', { name: 'mock websites modal' })).toBeInTheDocument();
  });

  it('closes the avatar lightbox with its own close button', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: profile(42, { avatar_url: 'https://x.test/a.jpg' }),
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'close lightbox' }));

    expect(screen.queryByRole('dialog', { name: 'mock avatar lightbox' })).not.toBeInTheDocument();
  });

  it('builds the avatar address: trimmed, with the version after an existing query, from the fallback field', async () => {
    const lightboxSource = async (data: ProfileData) => {
      invalidateUserProfileCache(42);
      (api.get as jest.Mock).mockResolvedValue({ data: profile(42, data) });
      const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
      fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));
      const dialog = screen.queryByRole('dialog', { name: 'mock avatar lightbox' });
      const source = dialog?.querySelector('img')?.getAttribute('src') ?? null;
      unmount();
      return source;
    };

    expect(await lightboxSource({ avatar_url: '  https://x.test/a.jpg?size=1  ', updated_at: 'v2' })).toBe(
      'https://x.test/a.jpg?size=1&v=v2',
    );
    expect(await lightboxSource({ avatar: 'https://x.test/b.jpg', updated_at: ' v3 ' })).toBe(
      'https://x.test/b.jpg?v=v3',
    );
    // Prázdna verzia nepridá nič; chýbajúci obrázok lightbox neotvorí.
    expect(await lightboxSource({ avatar_url: 'https://x.test/c.jpg', updated_at: '   ' })).toBe(
      'https://x.test/c.jpg',
    );
    expect(await lightboxSource({ avatar_url: '   ', avatar: '' })).toBeNull();
  });

  it('names the lightbox image after the profile: full name, then username, then a fallback', async () => {
    const lightboxAlt = async (data: ProfileData) => {
      invalidateUserProfileCache(42);
      (api.get as jest.Mock).mockResolvedValue({
        data: profile(42, { avatar_url: 'https://x.test/a.jpg', ...data }),
      });
      const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
      fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));
      const alt = screen.getByRole('dialog', { name: 'mock avatar lightbox' }).querySelector('img')?.getAttribute('alt');
      unmount();
      return alt;
    };

    expect(await lightboxAlt({ first_name: 'Jan', last_name: 'Novak' })).toBe('Jan Novak');
    expect(await lightboxAlt({ first_name: 'Jan', last_name: '' })).toBe('Jan');
    expect(await lightboxAlt({ first_name: '', last_name: '', username: 'jnovak' })).toBe('jnovak');
    expect(await lightboxAlt({ first_name: '', last_name: '', username: '' })).toBe('Fotky');
  });

  it('reports the avatar of the shown profile', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: profile(42, { avatar_url: 'https://x.test/a.jpg' }),
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));

    const dialog = screen.getByRole('dialog', { name: 'mock avatar lightbox' });
    expect(dialog).toHaveAttribute('data-report-type', 'user_avatar');
    expect(dialog).toHaveAttribute('data-report-user', '42');
  });
});

describe('SearchUserProfileModule – mobilné a desktopové zobrazenie', () => {
  const EXPECTED_PROPS = [
    'user',
    'displayUser',
    'isEditMode',
    'accountType',
    'isUploading',
    'onUserUpdate',
    'onEditProfileClick',
    'onPhotoUpload',
    'onAvatarClick',
    'onSkillsClick',
    'activeTab',
    'onChangeTab',
    'onTabsKeyDown',
    'onOpenAllWebsitesModal',
    'offersOwnerId',
    'ownerSlug',
    'isOtherUserProfile',
    'highlightedSkillId',
    'onSendMessage',
    'isOpeningConversation',
    'onToggleFavorite',
    'isFavorited',
    'isFavoritePending',
    'onToggleProfileLike',
    'isProfileLikePending',
    'onBlockClick',
  ].sort();

  async function renderedProps(mobile: boolean) {
    mockIsMobile = mobile;
    (api.get as jest.Mock).mockResolvedValue({
      data: profile(42, { slug: 'test-user', is_favorited: true }),
    });
    window.history.replaceState(null, '', '/dashboard/users/test-user');
    const { unmount } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={55} />,
    );
    await screen.findByTestId(mobile ? 'mobile-view' : 'desktop-view');
    const props = (mobile ? mockViewProps.mobile : mockViewProps.desktop) as unknown as Record<string, unknown>;
    unmount();
    invalidateUserProfileCache(42);
    return props;
  }

  it('renders the mobile view on a phone and the desktop view elsewhere, never both', async () => {
    mockIsMobile = true;
    const { unmount } = render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('mobile-view')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
    unmount();

    mockIsMobile = false;
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    expect(await screen.findByTestId('desktop-view')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-view')).not.toBeInTheDocument();
  });

  it('gives both views exactly the same properties', async () => {
    const mobile = await renderedProps(true);
    const desktop = await renderedProps(false);

    expect(Object.keys(mobile).sort()).toEqual(EXPECTED_PROPS);
    expect(Object.keys(desktop).sort()).toEqual(EXPECTED_PROPS);
    EXPECTED_PROPS.forEach((key) => {
      if (typeof desktop[key] === 'function') {
        expect(typeof mobile[key]).toBe('function');
      } else {
        expect(mobile[key]).toEqual(desktop[key]);
      }
    });
  });

  it('describes a foreign profile to the view: read-only, no edit handlers, the owner and the highlight', async () => {
    const props = await renderedProps(false);

    expect(props).toMatchObject({
      isEditMode: false,
      isUploading: false,
      isOtherUserProfile: true,
      accountType: 'personal',
      offersOwnerId: 42,
      ownerSlug: 'test-user',
      highlightedSkillId: 55,
      isFavorited: true,
      isFavoritePending: false,
      isProfileLikePending: false,
      isOpeningConversation: false,
    });
    expect(props.user).toBe(props.displayUser);
    expect(props.onUserUpdate).toBeUndefined();
    expect(props.onEditProfileClick).toBeUndefined();
    expect(props.onSkillsClick).toBeUndefined();
    expect(typeof props.onBlockClick).toBe('function');
    expect(() => (props.onPhotoUpload as () => void)()).not.toThrow();
  });
});

describe('SearchUserProfileModule – kanonizácia adresy a chybové texty', () => {
  it('canonicalises only a numeric identifier: an old slug in the address is left alone', async () => {
    window.history.replaceState(null, '', '/dashboard/users/stary-nazov');
    (api.get as jest.Mock).mockResolvedValue({ data: profile(42, { slug: 'test-user' }) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    await screen.findByTestId('shown-name');

    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/dashboard/users/stary-nazov');
  });

  it.each([
    ['an answer without a body', { response: { status: 500 } }, null],
    [
      'a network failure (nález 166)',
      { code: 'ERR_NETWORK', message: 'Network Error' },
      'Chyba siete. Skontrolujte pripojenie a skúste to znova.',
    ],
    ['a plain library message (nález 166)', { message: 'Network Error' }, null],
  ])('favorite and like report %s the same way as the load does', async (_label, failure, expectedText) => {
    (setFavoriteUserState as jest.Mock).mockRejectedValue(failure);
    (setProfileLikeState as jest.Mock).mockRejectedValue(failure);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenLastCalledWith(expectedText ?? 'Nepodarilo sa pridať k obľúbeným.'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'like profile' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenLastCalledWith(
        expectedText ?? 'Nepodarilo sa aktualizovat paci sa mi.',
      ),
    );
  });
});

describe('SearchUserProfileModule – správa a ochrany akcií', () => {
  it('does not open a conversation for a profile without a valid id', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: profile(0) });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'open message' }));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('hands the localized fallbacks to the messaging error helper when opening fails', async () => {
    pushMock.mockImplementation(() => {
      throw new Error('push failed');
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'open message' }));

    await waitFor(() =>
      expect(getMessagingErrorMessage).toHaveBeenCalledWith(expect.any(Error), {
        fallback: 'Nepodarilo sa otvoriť konverzáciu. Skúste to znova.',
        rateLimitFallback: 'Konverzácie otvárate príliš rýchlo. Skúste chvíľu počkať.',
        unavailableFallback: 'Používateľovi momentálne nie je možné napísať.',
      }),
    );
  });

  it('ignores a second favorite request while one is pending, even when the handler is called directly', async () => {
    const pending = deferred<void>();
    (setFavoriteUserState as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'add favorite' }));
    // Obsluha z posledného vykreslenia (príznak „prebieha“ je zapnutý), zavolaná mimo zablokovaného tlačidla.
    await act(async () => {
      await mockViewProps.desktop?.onToggleFavorite();
    });

    expect(setFavoriteUserState).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve();
    });
  });

  it('ignores a second like request while one is pending, even when the handler is called directly', async () => {
    const pending = deferred<{
      profile_user_id: number;
      is_profile_liked_by_me: boolean;
      profile_likes_count: number;
    }>();
    (setProfileLikeState as jest.Mock).mockReturnValue(pending.promise);

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'like profile' }));
    await act(async () => {
      await mockViewProps.desktop?.onToggleProfileLike();
    });

    expect(setProfileLikeState).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ profile_user_id: 42, is_profile_liked_by_me: true, profile_likes_count: 4 });
    });
  });
});
