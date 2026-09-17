'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { setFavoriteUserState } from '../favoritesApi';
import { api } from '@/lib/api';
import { getMessagingErrorMessage } from '../messages/messagingApi';
import {
  invalidateUserProfileCache,
  setUserProfileToCache,
} from '../profile/profileUserCache';

const pushMock = jest.fn();
const replaceMock = jest.fn();

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
  useIsMobile: () => false,
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

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: ({
    onAvatarClick,
    onSendMessage,
    isOpeningConversation,
    onToggleFavorite,
    isFavorited,
    isFavoritePending,
    onBlockClick,
    activeTab,
    onChangeTab,
  }: {
    onAvatarClick?: () => void;
    onSendMessage?: () => void;
    isOpeningConversation?: boolean;
    onToggleFavorite?: () => void;
    isFavorited?: boolean;
    isFavoritePending?: boolean;
    onBlockClick?: () => void;
    activeTab?: string;
    onChangeTab?: (tab: string) => void;
  }) => (
    <div>
      <span data-testid="active-tab">{activeTab}</span>
      <button type="button" onClick={() => onChangeTab?.('portfolio')}>
        go portfolio
      </button>
      <button type="button" onClick={onAvatarClick}>
        open avatar
      </button>
      <button type="button" onClick={onSendMessage} disabled={Boolean(isOpeningConversation)}>
        {isOpeningConversation ? 'opening' : 'open message'}
      </button>
      <button type="button" onClick={onToggleFavorite} disabled={Boolean(isFavoritePending)}>
        {isFavorited ? 'remove favorite' : 'add favorite'}
      </button>
      {onBlockClick && (
        <button type="button" onClick={onBlockClick}>
          block profile
        </button>
      )}
    </div>
  ),
}));

jest.mock('../profile/ProfileMobileView', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../profile/ProfileWebsitesModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: ({
    open,
    images,
    alt,
    onClose,
  }: {
    open: boolean;
    images?: Array<{ image_url?: string | null }>;
    alt: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="mock avatar lightbox">
        <img src={images?.[0]?.image_url || ''} alt={alt} />
        <button type="button" onClick={onClose}>
          close lightbox
        </button>
      </div>
    ) : null,
}));

describe('SearchUserProfileModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Zalozka zije v adrese (`?tab=`) a jsdom si ju drzi medzi testami.
    window.history.replaceState(null, '', '/dashboard/users/42');
    invalidateUserProfileCache(42);
    pushMock.mockReset();
    replaceMock.mockReset();
    replaceMock.mockReset();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 42,
        user_type: 'personal',
        first_name: 'Test',
        last_name: 'User',
        is_favorited: false,
      },
    });
    (setFavoriteUserState as jest.Mock).mockResolvedValue(undefined);
    (api.post as jest.Mock).mockResolvedValue({
      data: { user_id: 42, is_blocked: true, created: true },
    });
    (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly open error');
  });

  it('shows a toast and re-enables the action when navigation fails', async () => {
    pushMock.mockImplementation(() => {
      throw new Error('push failed');
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42');
      expect(toast.error).toHaveBeenCalledWith('Friendly open error');
      expect(button).not.toBeDisabled();
    });
  });

  it('navigates to the draft messages route with target user id', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42');
    });
  });

  it('toggles the favorite state in the profile UI after a successful request', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    const favoriteButton = await screen.findByRole('button', { name: 'add favorite' });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(setFavoriteUserState).toHaveBeenCalledWith(42, true);
      expect(screen.getByRole('button', { name: 'remove favorite' })).toBeInTheDocument();
    });
  });

  it('opens the avatar lightbox when the foreign profile avatar is clicked', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 42,
        username: 'test-user',
        user_type: 'personal',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        updated_at: 'avatar-v1',
        is_favorited: false,
      },
    });

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));

    expect(screen.getByRole('dialog', { name: 'mock avatar lightbox' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Test User' })).toHaveAttribute(
      'src',
      'https://example.com/avatar.jpg?v=avatar-v1',
    );
  });

  it('does not open the avatar lightbox when the foreign profile has no avatar', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'open avatar' }));

    expect(screen.queryByRole('dialog', { name: 'mock avatar lightbox' })).not.toBeInTheDocument();
  });

  it('blocks a foreign profile only after confirmation and redirects to the dashboard home', async () => {
    const onBack = jest.fn();
    render(
      <SearchUserProfileModule userId={42} currentUserId={7} onBack={onBack} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/users/42/block/');
      expect(toast.success).toHaveBeenCalledWith('Používateľ bol zablokovaný.');
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
    // Navigates to the dashboard home route directly rather than restoring
    // the previous "back to search" module state.
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does not expose the block action for the current user profile', async () => {
    render(<SearchUserProfileModule userId={42} currentUserId={42} />);

    await screen.findByRole('button', { name: 'open message' });
    expect(screen.queryByRole('button', { name: 'block profile' })).not.toBeInTheDocument();
  });

  it('keeps the confirmation open and shows a localized toast when rate limited', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 429 } });
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Blokovanie skúšate príliš často. Skúste to o chvíľu.',
      );
      expect(screen.getByTestId('block-user-confirm-dialog')).toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});

describe('SearchUserProfileModule – zalozka pri prekliku na ponuku', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/dashboard/users/42');
    invalidateUserProfileCache(42);
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 42,
        user_type: 'personal',
        first_name: 'Test',
        last_name: 'User',
        is_favorited: false,
      },
    });
  });

  it('forces the offers tab when a specific offer is highlighted', async () => {
    const { rerender } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} />,
    );

    // Pouzivatel si najprv pozrie portfolio ciezieho profilu.
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');

    // Klik na zdielanu ponuku: `goToUserProfile` posle highlight. Adresu meni
    // cez `history.pushState`, takze ziadny `popstate` ani zmena pathname
    // nepride – jedinym signalom je prave `highlightedSkillId`.
    rerender(
      <SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={55} />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('active-tab')).toHaveTextContent('offers'),
    );
  });

  it('writes the forced tab into the URL, same as the own profile does', async () => {
    const { rerender } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(window.location.search).toBe('?tab=portfolio');

    rerender(
      <SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={55} />,
    );

    // Rovnaka cesta zapisu ako v ProfileModule – cez `useProfileTabQuery`,
    // takze zalozka prezije aj F5 na tejto adrese.
    await waitFor(() => expect(window.location.search).toBe('?tab=offers'));
  });

  it('leaves the tab alone when no offer is highlighted', async () => {
    const { rerender } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');

    // Bezne prekreslenie nesmie pouzivatelovi zalozku prepnut pod rukami.
    rerender(<SearchUserProfileModule userId={42} currentUserId={7} />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('portfolio');
  });
});

describe('SearchUserProfileModule – kanonizacia ID na slug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateUserProfileCache(42);
    pushMock.mockReset();
    replaceMock.mockReset();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 42,
        slug: 'test-user',
        user_type: 'personal',
        first_name: 'Test',
        last_name: 'User',
        is_favorited: false,
      },
    });
  });

  it('carries the query over to the canonical slug URL', async () => {
    // Stary odkaz s ciselnym ID a zaroven aktivnou zalozkou.
    window.history.replaceState(null, '', '/dashboard/users/42?tab=posts');

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/users/test-user?tab=posts'),
    );
    // Adresa sa meni aj priamo (bez reloadu) – zalozka musi prezit oboje.
    expect(window.location.pathname).toBe('/dashboard/users/test-user');
    expect(window.location.search).toBe('?tab=posts');
  });

  it('carries the highlight parameters and the fragment too', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42?offer=55#sekcia');

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        // Záložka je v adrese od vstupu do profilu; kanonizácia query nesie so sebou.
        '/dashboard/users/test-user?offer=55&tab=offers#sekcia',
      ),
    );
  });

  it('carries only the tab when there was nothing else', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42');

    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    // `?tab=` doplní vstup do profilu, aby záznam niesol svoju záložku sám.
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/users/test-user?tab=offers'),
    );
  });
});

describe('SearchUserProfileModule – historia pri odvodenej zmene zalozky', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateUserProfileCache(42);
    pushMock.mockReset();
    replaceMock.mockReset();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 42,
        user_type: 'personal',
        first_name: 'Test',
        last_name: 'User',
        is_favorited: false,
      },
    });
  });

  it('adds no history entry when offers is already active', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42');
    const { rerender } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} />,
    );
    await screen.findByTestId('active-tab');
    expect(screen.getByTestId('active-tab')).toHaveTextContent('offers');
    const lengthBefore = window.history.length;

    // Odkaz s highlightom, ale zalozka uz sedi – nie je co menit.
    rerender(
      <SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={55} />,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('offers');
    expect(window.history.length).toBe(lengthBefore);
  });

  it('replaces the entry when the tab really has to change', async () => {
    window.history.replaceState(null, '', '/dashboard/users/42');
    const { rerender } = render(
      <SearchUserProfileModule userId={42} currentUserId={7} />,
    );

    // Pouzivatel si sam otvoril portfolio – to je jeho navigacia, teda push.
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(window.location.search).toBe('?tab=portfolio');
    const lengthAtPortfolio = window.history.length;

    // Preklik na konkretnu ponuku zalozku prepne, ale je to oprava appky.
    rerender(
      <SearchUserProfileModule userId={42} currentUserId={7} highlightedSkillId={55} />,
    );

    await waitFor(() => expect(window.location.search).toBe('?tab=offers'));
    expect(window.history.length).toBe(lengthAtPortfolio);

    // A krok spat NEVEDIE do portfolia – ten zaznam bol prepisany, nie pridany.
    let popped = false;
    const onPopState = () => {
      popped = true;
    };
    window.addEventListener('popstate', onPopState);
    window.history.back();
    await waitFor(() => expect(popped).toBe(true));
    window.removeEventListener('popstate', onPopState);

    expect(window.location.search).not.toBe('?tab=portfolio');
  });
});

describe('SearchUserProfileModule – kanonizacia pocas rozbehnuteho fetchu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateUserProfileCache(42);
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it('canonicalises with the tab active AT THAT MOMENT, not the one from mount', async () => {
    // Fetch drzime otvoreny, nech sa da zalozka prepnut este pred odpovedou.
    let resolveProfile!: (value: { data: Record<string, unknown> }) => void;
    (api.get as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );

    // Z cache sa profil vykresli hned, takze view zije uz POCAS fetchu –
    // presne to je situacia, v ktorej sa zalozka da prepnut skor, nez odpoved
    // dorazi. (Bez cache je na obrazovke len loading a klikat nie je na co.)
    setUserProfileToCache(42, {
      id: 42,
      user_type: 'personal',
      first_name: 'Test',
      last_name: 'User',
    } as never);

    window.history.replaceState(null, '', '/dashboard/users/42?tab=posts');
    render(<SearchUserProfileModule userId={42} currentUserId={7} />);

    // Pocas cakania na profil sa zalozka prepne.
    fireEvent.click(await screen.findByRole('button', { name: 'go portfolio' }));
    expect(window.location.search).toBe('?tab=portfolio');

    await act(async () => {
      resolveProfile({
        data: {
          id: 42,
          slug: 'test-user',
          user_type: 'personal',
          first_name: 'Test',
          last_name: 'User',
          is_favorited: false,
        },
      });
    });

    // Kanonizacia cita adresu az v momente odpovede, takze prenesie AKTUALNU
    // zalozku – nie tu, s ktorou sa stranka mountovala.
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/users/test-user?tab=portfolio'),
    );
    expect(window.location.search).toBe('?tab=portfolio');
  });
});
