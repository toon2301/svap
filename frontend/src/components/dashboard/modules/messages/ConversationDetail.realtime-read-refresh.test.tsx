'use client';

import React from 'react';
import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  ConversationDetail,
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
  clipboardWriteTextMock,
  deferred,
  deleteMessage,
  execCommandMock,
  hideConversation,
  installControllableResizeObserver,
  listConversations,
  listMessages,
  markConversationRead,
  message,
  messagePage,
  mockMessagesNotificationsState,
  mockSyncConversationReadState,
  mockVisualViewport,
  resolveMessagingImageUrl,
  revokeObjectURLMock,
  sendMessage,
  setVisibilityState,
  setupConversationDetailTestLifecycle,
  toast,
  updateConversationPinnedMessage,
  useIsMobile,
} from './ConversationDetail.test-utils';

setupConversationDetailTestLifecycle();

describe('ConversationDetail read state and realtime refresh', () => {
  it('coalesces duplicate mark-read requests while a shared refresh is still in flight', async () => {
    const messagesRequest = deferred<MessageListPage>();
    const markReadRequest = deferred<{
      conversation_id: number;
      last_read_at: string | null;
      total_unread_count?: number;
    }>();

    (listMessages as jest.Mock).mockReturnValue(messagesRequest.promise);
    (markConversationRead as jest.Mock).mockReturnValue(markReadRequest.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      messagesRequest.resolve(
        messagePage([
          message({
            id: 11,
            text: 'Nova prichadzajuca sprava',
          }),
        ]),
      );
      await messagesRequest.promise;
    });

    await waitFor(() => {
      expect(markConversationRead).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      markReadRequest.resolve({
        conversation_id: 9,
        last_read_at: '2026-03-27T10:05:00Z',
        total_unread_count: 0,
      });
      await markReadRequest.promise;
    });

    await waitFor(() => {
      expect(mockSyncConversationReadState).toHaveBeenCalledWith({
        conversationId: 9,
        totalUnreadCount: 0,
      });
    });

    expect(listMessages).toHaveBeenCalledTimes(1);
    expect(markConversationRead).toHaveBeenCalledTimes(1);
  });

  it('updates the seen indicator when a peer read event arrives for the open conversation', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Moja sprava')).toBeInTheDocument();
    expect(screen.queryByTestId('message-seen-indicator-1')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_READ_EVENT, {
          detail: {
            conversationId: 9,
            peerLastReadAt: '2026-03-27T10:00:30Z',
            readerId: 77,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('message-seen-indicator-1')).toBeInTheDocument();
    });
  });

  it('updates the open conversation when a realtime delete event arrives', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 4,
          text: 'Nova sprava',
          created_at: '2026-03-27T10:03:00Z',
        }),
        message({
          id: 3,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava',
          created_at: '2026-03-27T10:02:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Moja sprava')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_DELETED_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 3,
            deletedById: 1,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Moja sprava')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-bubble-3')).toHaveTextContent(/vymazan/i);
      expect(screen.getByText('Nova sprava')).toBeInTheDocument();
    });
  });

  it('refreshes the conversation and notifies the conversations rail when the tab becomes visible again', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
    setVisibilityState('hidden');

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Nova odpoved',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Moja sprava')).toBeInTheDocument();
    });

    expect(markConversationRead).not.toHaveBeenCalled();

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Nova odpoved')).toBeInTheDocument();
      expect(markConversationRead).toHaveBeenCalledWith(9);
      expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
  });

  it('does not poll the open conversation while realtime is connected', async () => {
    jest.useFakeTimers();
    mockMessagesNotificationsState.isRealtimeConnected = true;

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Moja sprava')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(listMessages).toHaveBeenCalledTimes(1);
  });

  it('refreshes immediately when a realtime event arrives for the open conversation', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Realtime odpoved',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Moja sprava')).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_MESSAGE_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 2,
            senderId: 77,
            createdAt: '2026-03-27T10:01:00Z',
          },
        }),
      );
    });

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Realtime odpoved')).toBeInTheDocument();
      expect(markConversationRead).toHaveBeenCalledWith(9);
      expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
  });
});
