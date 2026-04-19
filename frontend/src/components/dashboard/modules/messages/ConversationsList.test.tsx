'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { hideConversation, listConversations } from './messagingApi';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';
import { syncMessageUnreadCountFromConversations } from '@/components/dashboard/contexts/messageUnreadStore';
import { requestConversationsRefresh } from './messagesEvents';

const pushMock = jest.fn();

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
  hideConversation: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  syncMessageUnreadCountFromConversations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: pushMock,
  }),
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
    (hideConversation as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      hidden_at: '2026-03-27T10:05:00Z',
      conversation_unread_count: 0,
      total_unread_count: 0,
    });
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

  it('renders skeleton placeholders while the conversations list is loading', async () => {
    (listConversations as jest.Mock).mockImplementation(
      () => new Promise(() => undefined),
    );

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(screen.getByTestId('conversations-list-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('conversation-skeleton-row')).toHaveLength(6);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
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

  it('opens the conversation actions menu from the rail hamburger and hides the conversation after confirmation', async () => {
    const refreshSpy = jest.fn();
    window.addEventListener('messaging:conversations:refresh', refreshSpy);
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Nova sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Nova sprava')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));
    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-delete-action'));

    const modal = await screen.findByTestId('delete-conversation-confirm-modal');
    fireEvent.click(within(modal).getByRole('button', { name: /vymaza/i }));

    await waitFor(() => {
      expect(hideConversation).toHaveBeenCalledWith(9);
      expect(screen.queryByText('Nova sprava')).not.toBeInTheDocument();
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(window.location.pathname + window.location.search).not.toBe('/dashboard/messages');
    window.removeEventListener('messaging:conversations:refresh', refreshSpy);
  });

  it('navigates back to the messages root when the selected conversation is hidden from the list menu', async () => {
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Tester' },
          last_message_preview: 'Nova sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([]);

    render(<ConversationsList currentUserId={1} variant="rail" selectedConversationId={9} />);

    expect(await screen.findByText('Nova sprava')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));
    fireEvent.click(await screen.findByTestId('conversation-delete-action'));

    const modal = await screen.findByTestId('delete-conversation-confirm-modal');
    fireEvent.click(within(modal).getByRole('button', { name: /vymaza/i }));

    await waitFor(() => {
      expect(hideConversation).toHaveBeenCalledWith(9);
      expect(window.location.pathname + window.location.search).toBe('/dashboard/messages');
    });
  });

  it('shows a deleted-preview label for the current user when the latest message was deleted by them', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: null,
        last_message_is_deleted: true,
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 1,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Vymazali ste správu')).toBeInTheDocument();
    });
  });

  it('shows a deleted-preview label with the other user name when they deleted the latest message', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: null,
        last_message_is_deleted: true,
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Tester vymazal/a správu')).toBeInTheDocument();
    });
  });
  it('shows an image preview label when the latest message only contains an image', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_preview: null,
        last_message_has_image: true,
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 2,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(screen.getByText('Obrázok')).toBeInTheDocument();
    });
  });
});
