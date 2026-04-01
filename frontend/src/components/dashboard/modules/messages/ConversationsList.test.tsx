'use client';

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { listConversations } from './messagingApi';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';
import { syncMessageUnreadCountFromConversations } from '@/components/dashboard/contexts/messageUnreadStore';
import { requestConversationsRefresh } from './messagesEvents';

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  syncMessageUnreadCountFromConversations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
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
    (ensureFreshSessionForBackgroundWork as jest.Mock).mockResolvedValue('ready');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs the global message unread count from the fetched conversations list', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: 'Nova sprava',
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: true,
        unread_count: 2,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Nova sprava')).toBeInTheDocument();
    });

    expect(syncMessageUnreadCountFromConversations).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 9,
        unread_count: 2,
      }),
    ]);
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

  it('does not run interval polling while a specific conversation is open', async () => {
    jest.useFakeTimers();

    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: 'Stabilná správa',
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" selectedConversationId={9} />);

    await waitFor(() => {
      expect(screen.getByText('Stabilná správa')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(35_000);
    });

    expect(listConversations).toHaveBeenCalledTimes(1);
  });

  it('keeps a slower fallback interval when no conversation is selected', async () => {
    jest.useFakeTimers();

    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Prvá správa',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Druhá správa',
          last_message_at: '2026-03-27T10:00:30Z',
          last_message_sender_id: 2,
          has_unread: true,
        },
      ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Prvá správa')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(screen.getByText('Druhá správa')).toBeInTheDocument();
      expect(listConversations).toHaveBeenCalledTimes(2);
    });
  });

  it('skips background refresh when auth preflight reports a transient failure', async () => {
    jest.useFakeTimers();
    (ensureFreshSessionForBackgroundWork as jest.Mock).mockResolvedValue('transient_failure');
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: 'Prva sprava',
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Prva sprava')).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(30_000);
    });

    expect(listConversations).toHaveBeenCalledTimes(1);
  });
  it('renders a hover-only hamburger action slot for rail conversations', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'VeÄ¾mi dlhÃ½ nÃ¡zov konverzÃ¡cie' },
        last_message_preview: 'UkÃ¡Å¾ka sprÃ¡vy',
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    const title = await screen.findByTestId('conversation-title-9');
    const action = screen.getByTestId('conversation-hover-action-9');

    expect(title.className).toContain('truncate');
    expect(action.className).toContain('opacity-0');
    expect(action.className).toContain('group-hover:opacity-100');
  });
});
