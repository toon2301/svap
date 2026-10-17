'use client';

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { listConversationsPage } from './conversationsPagingApi';
import { legacyListAsPages } from './conversationsPagingTestUtils';
import {
  getMessageRequestsUnseenSummary,
  getUnreadMessagesSummary,
  listConversations,
  listMessageRequests,
} from './messagingApi';
import {
  getMessageUnreadCountStore,
  publishMessageUnreadCount,
} from '@/components/dashboard/contexts/messageUnreadStore';

// ZÁMERNE bez mocku messageUnreadStore — test overuje reálnu integráciu
// ConversationsList so store (stale-response guard).
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

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
}));

jest.mock('../profile/ReportUserModal', () => ({
  __esModule: true,
  ReportUserModal: () => null,
}));

function resetStore() {
  delete (globalThis as { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
}

describe('ConversationsList stale unread race', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    window.history.replaceState(null, '', '/dashboard/messages');
    (getMessageRequestsUnseenSummary as jest.Mock).mockResolvedValue({ count: 0 });
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 2 });
    (listMessageRequests as jest.Mock).mockResolvedValue([]);
    (listConversationsPage as jest.Mock).mockImplementation(
      legacyListAsPages(
        (params) => (listConversations as jest.Mock)(params),
        (params) => (listMessageRequests as jest.Mock)(params),
      ),
    );
  });

  afterEach(() => {
    resetStore();
  });

  it('does not overwrite a fresher mark-read update with a stale in-flight list response', async () => {
    // Repro bugu: fetch zoznamu začne, kým sú neprečítané správy; používateľ si
    // ich medzitým prečíta (mark-read publikuje 0); stale response dobehne
    // neskôr a NESMIE vrátiť badge na staré číslo. Súhrn zo servera tu hlási 2
    // (stav spred prečítania), takže test padne, ak by ho obnova nezahodila.
    let resolveList: (items: unknown[]) => void = () => undefined;
    (listConversations as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    render(<ConversationsList currentUserId={1} variant="rail" />);
    expect(screen.getByTestId('conversations-list-skeleton')).toBeInTheDocument();

    // Mark-read (response / WS messaging_read) — novší autoritatívny update.
    // setTimeout(1): store guard porovnáva milisekundy, v teste by inak fetch
    // aj publish padli do tej istej ms.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      publishMessageUnreadCount(0);
    });

    // Stale response so starým unread_count dobehne po mark-read.
    await act(async () => {
      resolveList([
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
    });

    expect(await screen.findByText('Tester')).toBeInTheDocument();
    await waitFor(() => expect(getUnreadMessagesSummary).toHaveBeenCalled());
    // Badge zdroj pravdy ostáva 0 — stale snapshot ho neprepísal.
    expect(getMessageUnreadCountStore().unreadCount).toBe(0);
  });

  it('does not overwrite a mark-read that lands while the server summary is in flight', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_at: '2026-03-27T10:00:00Z',
        has_unread: true,
        unread_count: 2,
      },
    ]);
    let resolveSummary: (summary: { count: number }) => void = () => undefined;
    (getUnreadMessagesSummary as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSummary = resolve;
        }),
    );

    render(<ConversationsList currentUserId={1} variant="rail" />);
    // Zoznam sa zobrazí, až keď obnova skončí (vrátane súhrnu), preto sa čaká na jeho volanie.
    await waitFor(() => expect(getUnreadMessagesSummary).toHaveBeenCalledTimes(1));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      publishMessageUnreadCount(0);
    });
    await act(async () => {
      resolveSummary({ count: 2 });
    });

    expect(await screen.findByText('Tester')).toBeInTheDocument();
    expect(getMessageUnreadCountStore().unreadCount).toBe(0);
  });

  it('publishes the server summary when nothing fresher arrived meanwhile', async () => {
    // Kontrola opaku: bez novšieho update-u sa súhrn zo servera do odznaku dostane.
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        other_user: { id: 2, display_name: 'Tester' },
        last_message_at: '2026-03-27T10:00:00Z',
        has_unread: true,
        unread_count: 1,
      },
    ]);
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 5 });

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Tester')).toBeInTheDocument();
    await waitFor(() => expect(getMessageUnreadCountStore().unreadCount).toBe(5));
  });
});
