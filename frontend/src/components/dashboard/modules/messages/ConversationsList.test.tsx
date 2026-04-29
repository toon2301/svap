'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import {
  createGroupConversation,
  hideConversation,
  listGroupMemberCandidates,
  listConversations,
  updateConversationPinnedState,
} from './messagingApi';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';
import {
  publishMessageUnreadCount,
  syncMessageUnreadCountFromConversations,
} from '@/components/dashboard/contexts/messageUnreadStore';
import { requestConversationsRefresh } from './messagesEvents';

const pushMock = jest.fn();

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
  hideConversation: jest.fn(),
  createGroupConversation: jest.fn(),
  listGroupMemberCandidates: jest.fn(),
  getMessagingErrorMessage: jest.fn((_error, options) => options?.fallback || 'Messaging error'),
  updateConversationPinnedState: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  publishMessageUnreadCount: jest.fn(),
  syncMessageUnreadCountFromConversations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
}));

jest.mock('../profile/ReportUserModal', () => ({
  __esModule: true,
  ReportUserModal: ({ open, userId }: { open: boolean; userId: number }) =>
    open ? <div data-testid="report-user-modal" data-user-id={userId} /> : null,
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
    (updateConversationPinnedState as jest.Mock).mockImplementation(
      async (conversationId: number, isPinned: boolean) => ({
        conversation_id: conversationId,
        is_pinned: isPinned,
      }),
    );
    (createGroupConversation as jest.Mock).mockResolvedValue({
      id: 55,
      is_group: true,
      name: 'Nová skupina',
      other_user: null,
      last_message_at: '2026-03-27T10:05:00Z',
      updated_at: '2026-03-27T10:05:00Z',
    });
    (listGroupMemberCandidates as jest.Mock).mockResolvedValue([
      {
        id: 2,
        display_name: 'Anna',
        avatar_url: null,
        presence_status: 'unknown',
      },
      {
        id: 3,
        display_name: 'Peter',
        avatar_url: null,
        presence_status: 'unknown',
      },
    ]);
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
    (listConversations as jest.Mock).mockImplementation(() => new Promise(() => undefined));

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
        other_user: { id: 2, display_name: 'Veľmi dlhý názov konverzácie' },
        last_message_preview: 'Ukážka správy',
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

  it('pins a conversation from the rail menu, moves it to the top, and shows a pinned indicator', async () => {
    (listConversations as jest.Mock).mockResolvedValueOnce([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Newest Chat' },
        last_message_preview: 'Novsia sprava',
        last_message_at: '2026-03-27T10:05:00Z',
        last_message_sender_id: 2,
        has_unread: false,
        is_pinned: false,
      },
      {
        id: 8,
        other_user: { id: 3, display_name: 'Older Pinned' },
        last_message_preview: 'Starsia sprava',
        last_message_at: '2026-03-27T10:00:00Z',
        last_message_sender_id: 3,
        has_unread: false,
        is_pinned: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Novsia sprava')).toBeInTheDocument();
    expect(screen.getByText('Starsia sprava')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-8'));
    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();
    expect(screen.getByText('Pripnúť konverzáciu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-pin-action'));

    await waitFor(() => {
      expect(updateConversationPinnedState).toHaveBeenCalledWith(8, true);
      expect(screen.getByTestId('conversation-pinned-indicator-8')).toBeInTheDocument();
      const orderedTitles = screen
        .getAllByTestId(/conversation-title-/)
        .map((node) => node.textContent);
      expect(orderedTitles).toEqual(['Older Pinned', 'Newest Chat']);
    });

    expect(listConversations).toHaveBeenCalledTimes(1);
  });

  it('shows an unpin action for pinned conversations and removes the indicator after unpinning', async () => {
    (listConversations as jest.Mock).mockResolvedValueOnce([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Pinned Chat' },
        last_message_preview: 'Pripnuta sprava',
        last_message_at: '2026-03-27T10:05:00Z',
        last_message_sender_id: 2,
        has_unread: false,
        is_pinned: true,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByTestId('conversation-pinned-indicator-9')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));
    expect(await screen.findByText('Odopnúť konverzáciu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-pin-action'));

    await waitFor(() => {
      expect(updateConversationPinnedState).toHaveBeenCalledWith(9, false);
      expect(screen.queryByTestId('conversation-pinned-indicator-9')).not.toBeInTheDocument();
    });
  });

  it('opens the reusable user report modal with the other conversation participant id', async () => {
    (listConversations as jest.Mock).mockResolvedValueOnce([
      {
        id: 9,
        other_user: { id: 42, display_name: 'Reported User' },
        last_message_preview: 'Sprava',
        last_message_at: '2026-03-27T10:05:00Z',
        last_message_sender_id: 42,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Sprava')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));
    fireEvent.click(await screen.findByTestId('conversation-report-user-action'));

    expect(await screen.findByTestId('report-user-modal')).toHaveAttribute('data-user-id', '42');
    expect(screen.queryByTestId('conversation-actions-menu')).not.toBeInTheDocument();
  });

  it('does not show the user report action when the other participant is unavailable', async () => {
    (listConversations as jest.Mock).mockResolvedValueOnce([
      {
        id: 9,
        other_user: null,
        last_message_preview: 'Sprava',
        last_message_at: '2026-03-27T10:05:00Z',
        last_message_sender_id: null,
        has_unread: false,
      },
    ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Sprava')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));

    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();
    expect(screen.queryByTestId('conversation-report-user-action')).not.toBeInTheDocument();
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

  it('searches conversations by name after a short debounce', async () => {
    jest.useFakeTimers();
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Anna Tester' },
          last_message_preview: 'Prva sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: true,
          unread_count: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 10,
          other_user: { id: 3, display_name: 'Anna Novak' },
          last_message_preview: 'Filtrovana sprava',
          last_message_at: '2026-03-27T10:01:00Z',
          last_message_sender_id: 3,
          has_unread: true,
          unread_count: 1,
        },
      ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Prva sprava')).toBeInTheDocument();
    expect(syncMessageUnreadCountFromConversations).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Hľadať podľa mena...'), {
      target: { value: '  Anna   Novak ' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(listConversations).toHaveBeenLastCalledWith({ search: 'Anna Novak' });
      expect(screen.getByText('Filtrovana sprava')).toBeInTheDocument();
    });

    expect(syncMessageUnreadCountFromConversations).toHaveBeenCalledTimes(1);
  });

  it('shows a search-specific empty state when no conversation matches the query', async () => {
    jest.useFakeTimers();
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Anna Tester' },
          last_message_preview: 'Prva sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: false,
        },
      ])
      .mockResolvedValueOnce([]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Prva sprava')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Hľadať podľa mena...'), {
      target: { value: 'Neexistuje' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Nenašli sa žiadne konverzácie')).toBeInTheDocument();
      expect(
        screen.getByText('Skúste zmeniť meno používateľa alebo vymazať vyhľadávanie.'),
      ).toBeInTheDocument();
    });
  });

  it('publishes the unread count returned by hide conversation while a search is active', async () => {
    jest.useFakeTimers();
    (hideConversation as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      hidden_at: '2026-03-27T10:05:00Z',
      conversation_unread_count: 0,
      total_unread_count: 4,
    });
    (listConversations as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Anna Tester' },
          last_message_preview: 'Prva sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: true,
          unread_count: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          other_user: { id: 2, display_name: 'Anna Tester' },
          last_message_preview: 'Prva sprava',
          last_message_at: '2026-03-27T10:00:00Z',
          last_message_sender_id: 2,
          has_unread: true,
          unread_count: 3,
        },
      ]);

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Prva sprava')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Hľadať podľa mena...'), {
      target: { value: 'Anna' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(listConversations).toHaveBeenLastCalledWith({ search: 'Anna' });
    });

    fireEvent.click(screen.getByTestId('conversation-hover-action-9'));
    fireEvent.click(await screen.findByTestId('conversation-delete-action'));

    const modal = await screen.findByTestId('delete-conversation-confirm-modal');
    fireEvent.click(within(modal).getByRole('button', { name: /vymaza/i }));

    await waitFor(() => {
      expect(hideConversation).toHaveBeenCalledWith(9);
      expect(publishMessageUnreadCount).toHaveBeenCalledWith(4);
    });

    expect(syncMessageUnreadCountFromConversations).toHaveBeenCalledTimes(1);
  });

  it('renders group conversations with their group title', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 55,
        is_group: true,
        name: 'Projektový tím',
        other_user: null,
        avatar_members: [],
        last_message_type: 'group_invitation',
        last_message_preview: '',
        last_message_at: '2026-03-27T10:05:00Z',
        updated_at: '2026-03-27T10:05:00Z',
        unread_count: 0,
        has_unread: false,
      },
    ]);

    render(<ConversationsList onSelectConversation={jest.fn()} />);

    expect(await screen.findByText('Projektový tím')).toBeInTheDocument();
    expect(screen.getByText('Pozvánka do skupiny')).toBeInTheDocument();
  });

  it('creates a group conversation from the create group modal', async () => {
    (listConversations as jest.Mock).mockResolvedValue([]);

    render(<ConversationsList onSelectConversation={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /vytvoriť skupinu/i }));
    fireEvent.change(screen.getByPlaceholderText('Napr. Projektový tím'), {
      target: { value: 'Nová skupina' },
    });
    fireEvent.click(await screen.findByText('Anna'));
    fireEvent.click(await screen.findByText('Peter'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Vytvoriť skupinu' }).at(-1)!);

    await waitFor(() => {
      expect(createGroupConversation).toHaveBeenCalledWith({
        name: 'Nová skupina',
        invited_user_ids: [2, 3],
        avatar: null,
      });
    });
  });
});
