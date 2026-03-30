'use client';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { SearchUserProfileModule } from './SearchUserProfileModule';
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

jest.mock('../messages/messagingApi', () => ({
  __esModule: true,
  getMessagingErrorMessage: jest.fn(),
}));

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: ({
    onSendMessage,
    isOpeningConversation,
  }: {
    onSendMessage?: () => void;
    isOpeningConversation?: boolean;
  }) => (
    <button type="button" onClick={onSendMessage} disabled={Boolean(isOpeningConversation)}>
      {isOpeningConversation ? 'opening' : 'open message'}
    </button>
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
      },
    });
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
});
