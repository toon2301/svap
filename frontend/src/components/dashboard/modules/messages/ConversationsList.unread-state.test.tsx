'use client';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  publishMessageUnreadCount,
  syncMessageUnreadCountFromConversations,
} from '@/components/dashboard/contexts/messageUnreadStore';
import { ConversationsList } from './ConversationsList';
import { listConversationsPage } from './conversationsPagingApi';
import { legacyListAsPages } from './conversationsPagingTestUtils';
import {
  createGroupConversation,
  getMessageRequestsUnseenSummary,
  getUnreadMessagesSummary,
  hideConversation,
  listConversations,
  listGroupMemberCandidates,
  listMessageRequests,
  markMessageRequestsSeen,
  updateConversationPinnedState,
} from './messagingApi';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';

jest.mock('./messagingApi', () => ({
  __esModule: true,
  acceptMessageRequest: jest.fn(),
  createGroupConversation: jest.fn(),
  deleteMessageRequest: jest.fn(),
  getMessageRequestsUnseenSummary: jest.fn(),
  getMessagingErrorMessage: jest.fn((_error, options) => options?.fallback || 'Messaging error'),
  getUnreadMessagesSummary: jest.fn(),
  hideConversation: jest.fn(),
  listConversations: jest.fn(),
  listGroupMemberCandidates: jest.fn(),
  listMessageRequests: jest.fn(),
  markMessageRequestsSeen: jest.fn(),
  updateConversationPinnedState: jest.fn(),
}));

jest.mock('./conversationsPagingApi', () => ({
  ...jest.requireActual('./conversationsPagingApi'),
  listConversationsPage: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  getMessageUnreadCountStore: jest.fn(() => ({ lastSuccessfulRefreshAt: 0 })),
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

function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

describe('ConversationsList unread state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/dashboard/messages');
    setVisibilityState('visible');
    (ensureFreshSessionForBackgroundWork as jest.Mock).mockResolvedValue('ready');
    (getMessageRequestsUnseenSummary as jest.Mock).mockResolvedValue({ count: 0 });
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 0 });
    (hideConversation as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      hidden_at: '2026-03-27T10:05:00Z',
      conversation_unread_count: 0,
      total_unread_count: 0,
    });
    (updateConversationPinnedState as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      is_pinned: false,
    });
    (createGroupConversation as jest.Mock).mockResolvedValue({
      id: 55,
      is_group: true,
      name: 'Nova skupina',
      last_message_at: '2026-03-27T10:05:00Z',
      updated_at: '2026-03-27T10:05:00Z',
    });
    (listGroupMemberCandidates as jest.Mock).mockResolvedValue([]);
    (listMessageRequests as jest.Mock).mockResolvedValue([]);
    (markMessageRequestsSeen as jest.Mock).mockResolvedValue({ count: 0 });
    (listConversationsPage as jest.Mock).mockImplementation(
      legacyListAsPages(
        (params) => (listConversations as jest.Mock)(params),
        (params) => (listMessageRequests as jest.Mock)(params),
      ),
    );
  });

  it('keeps unread state visible until the detail marks the conversation as read', async () => {
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

    expect(await screen.findByLabelText('2 unread messages')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tester'));

    expect(window.location.pathname + window.location.search).toBe('/dashboard/messages?conversationId=9');
    expect(screen.getByLabelText('2 unread messages')).toBeInTheDocument();
  });

  it('takes the badge total from the server summary so PENDING requests are not undercounted', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Accepted' },
        last_message_at: '2026-03-27T10:00:00Z',
        has_unread: false,
        unread_count: 0,
      },
    ]);
    // Prijatá PENDING žiadosť nie je v hlavnom zozname (patrí do záložky Žiadosti), no jej
    // neprečítaná správa sa do odznaku počíta. Súhrn zo servera ju obsahuje, preto sa odznak
    // berie z neho – nie zo súčtu načítaných položiek, ktorý by ju (a ďalšie stránky) vynechal.
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 1 });

    render(<ConversationsList currentUserId={1} variant="rail" />);

    await waitFor(() => {
      expect(publishMessageUnreadCount).toHaveBeenCalledWith(1);
    });
    expect(syncMessageUnreadCountFromConversations).not.toHaveBeenCalled();
    expect(listMessageRequests).not.toHaveBeenCalled();
  });
});
