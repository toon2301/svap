'use client';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

import { SearchUserProfileModule } from './SearchUserProfileModule';
import { setFavoriteUserState } from '../favoritesApi';
import { api } from '@/lib/api';
import { getMessagingErrorMessage } from '../messages/messagingApi';

const pushMock = jest.fn();

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
  api: {
    get: jest.fn(),
  },
  endpoints: {
    dashboard: {
      userProfile: (id: number) => `/auth/dashboard/users/${id}/`,
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
    onSendMessage,
    isOpeningConversation,
    onToggleFavorite,
    isFavorited,
    isFavoritePending,
  }: {
    onSendMessage?: () => void;
    isOpeningConversation?: boolean;
    onToggleFavorite?: () => void;
    isFavorited?: boolean;
    isFavoritePending?: boolean;
  }) => (
    <div>
      <button type="button" onClick={onSendMessage} disabled={Boolean(isOpeningConversation)}>
        {isOpeningConversation ? 'opening' : 'open message'}
      </button>
      <button type="button" onClick={onToggleFavorite} disabled={Boolean(isFavoritePending)}>
        {isFavorited ? 'remove favorite' : 'add favorite'}
      </button>
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

describe('SearchUserProfileModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushMock.mockReset();
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
    (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly open error');
  });

  it('shows a toast and re-enables the action when navigation fails', async () => {
    pushMock.mockImplementation(() => {
      throw new Error('push failed');
    });

    render(<SearchUserProfileModule userId={42} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42');
      expect(toast.error).toHaveBeenCalledWith('Friendly open error');
      expect(button).not.toBeDisabled();
    });
  });

  it('navigates to the draft messages route with target user id', async () => {
    render(<SearchUserProfileModule userId={42} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=42');
    });
  });

  it('toggles the favorite state in the profile UI after a successful request', async () => {
    render(<SearchUserProfileModule userId={42} />);

    const favoriteButton = await screen.findByRole('button', { name: 'add favorite' });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(setFavoriteUserState).toHaveBeenCalledWith(42, true);
      expect(screen.getByRole('button', { name: 'remove favorite' })).toBeInTheDocument();
    });
  });
});
