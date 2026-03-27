'use client';

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { listConversations } from './messagingApi';
import { requestConversationsRefresh } from './messagesEvents';

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
}));

function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

describe('ConversationsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setVisibilityState('visible');
  });

  it('refreshes the list when a conversation refresh event is dispatched', async () => {
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Stará správa',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Nová správa',
          last_message_at: '2026-03-27T10:01:00Z',
          last_message_sender_id: 2,
          has_unread: true,
        },
      ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Stará správa')).toBeInTheDocument();
    });

    act(() => {
      requestConversationsRefresh();
    });

    await waitFor(() => {
      expect(screen.getByText('Nová správa')).toBeInTheDocument();
      expect(listConversations).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes the list when the tab becomes visible again', async () => {
    setVisibilityState('hidden');

    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Stará správa',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Viditeľná správa',
          last_message_at: '2026-03-27T10:01:00Z',
          last_message_sender_id: 2,
          has_unread: true,
        },
      ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Stará správa')).toBeInTheDocument();
    });

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(screen.getByText('Viditeľná správa')).toBeInTheDocument();
      expect(listConversations).toHaveBeenCalledTimes(2);
    });
  });
});
