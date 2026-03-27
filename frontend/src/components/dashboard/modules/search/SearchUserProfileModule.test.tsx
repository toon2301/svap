'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { SearchUserProfileModule } from './SearchUserProfileModule';
import { api } from '@/lib/api';
import { getMessagingErrorMessage, openConversation } from '../messages/messagingApi';

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
  openConversation: jest.fn(),
  getMessagingErrorMessage: jest.fn(),
}));

jest.mock('../profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: ({ onSendMessage, isOpeningConversation }: { onSendMessage?: () => void; isOpeningConversation?: boolean }) => (
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  it('shows a toast and unlocks the action when opening a conversation fails', async () => {
    const pendingOpen = deferred<{ id: number }>();
    (openConversation as jest.Mock).mockReturnValue(pendingOpen.promise);

    render(<SearchUserProfileModule userId={42} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
      expect(button).toBeDisabled();
    });

    await act(async () => {
      pendingOpen.reject(new Error('open failed'));
      try {
        await pendingOpen.promise;
      } catch {
        // expected rejection
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Friendly open error');
      expect(button).not.toBeDisabled();
    });

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates to the stable messages route with query param when conversation opens', async () => {
    (openConversation as jest.Mock).mockResolvedValue({ id: 77 });

    render(<SearchUserProfileModule userId={42} />);

    const button = await screen.findByRole('button', { name: 'open message' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(openConversation).toHaveBeenCalledWith(42);
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?conversationId=77');
    });
  });
});
