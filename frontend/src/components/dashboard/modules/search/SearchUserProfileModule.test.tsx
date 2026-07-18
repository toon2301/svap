'use client';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { setFavoriteUserState } from '../favoritesApi';
import { api } from '@/lib/api';
import { getMessagingErrorMessage } from '../messages/messagingApi';
import { invalidateUserProfileCache } from '../profile/profileUserCache';

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
  }: {
    onAvatarClick?: () => void;
    onSendMessage?: () => void;
    isOpeningConversation?: boolean;
    onToggleFavorite?: () => void;
    isFavorited?: boolean;
    isFavoritePending?: boolean;
    onBlockClick?: () => void;
  }) => (
    <div>
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

  it('blocks a foreign profile only after confirmation and returns to search', async () => {
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
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/search');
    });
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
