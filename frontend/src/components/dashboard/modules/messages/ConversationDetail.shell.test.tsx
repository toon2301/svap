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

describe('ConversationDetail shell and conversation actions', () => {
  it('renders message skeleton placeholders while the initial messages request is loading', async () => {
    const messagesRequest = deferred<MessageListPage>();
    (listMessages as jest.Mock).mockReturnValue(messagesRequest.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('conversation-messages-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('conversation-message-skeleton-row')).toHaveLength(8);
    expect(screen.getAllByTestId('conversation-message-skeleton-bubble')).toHaveLength(8);
    expect(screen.getAllByTestId('conversation-message-skeleton-avatar')).toHaveLength(2);
    expect(screen.queryByText(/bez/i)).not.toBeInTheDocument();

    await act(async () => {
      messagesRequest.resolve(messagePage([]));
      await messagesRequest.promise;
    });

    await waitFor(() => {
      expect(screen.queryByTestId('conversation-messages-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText(/bez/i)).toBeInTheDocument();
    });
  });

  it('renders the request picker from message metadata when the conversation is missing from the sidebar list', async () => {
    (listConversations as jest.Mock).mockResolvedValue([]);
    (listMessages as jest.Mock).mockResolvedValue(
      messagePage([], {
        conversation: {
          id: 9,
          has_requestable_offers: true,
          other_user: {
            id: 77,
            display_name: 'Tester',
          },
          last_message_preview: null,
          last_message_at: null,
          last_read_at: null,
          has_unread: false,
          unread_count: 0,
          updated_at: '2026-01-01T00:00:00Z',
        },
      }),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-request-offer-picker')).toBeInTheDocument();
    });
  });

  it('renders the request picker only when the conversation exposes requestable offers', async () => {
    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-request-offer-picker')).toBeInTheDocument();
    });
  });

  it('hides the request picker when the other user has no requestable offers', async () => {
    (listMessages as jest.Mock).mockResolvedValue(
      messagePage([], {
        conversation: {
          id: 9,
          has_requestable_offers: false,
          other_user: {
            id: 77,
            display_name: 'Tester',
          },
          last_message_preview: null,
          last_message_at: null,
          last_read_at: null,
          has_unread: false,
          unread_count: 0,
          updated_at: '2026-01-01T00:00:00Z',
        },
      }),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    expect(screen.queryByTestId('chat-request-offer-picker')).not.toBeInTheDocument();
  });

  it('keeps the desktop conversation header fixed while only the messages area scrolls', async () => {
    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const header = await screen.findByTestId('conversation-header');
    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    expect(header.className).not.toContain('sticky');
    expect(messagesScroll.className).toContain('overflow-y-auto');
  });

  it('opens the other user profile when the desktop conversation header is clicked', async () => {
    const profileEventSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileEventSpy as EventListener);
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        has_requestable_offers: true,
        other_user: {
          id: 77,
          slug: 'tester-slug',
          display_name: 'Tester',
        },
      },
    ]);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const headerTrigger = await screen.findByTestId('conversation-header-trigger');
    await waitFor(() => {
      expect(headerTrigger).not.toBeDisabled();
    });
    fireEvent.click(headerTrigger);

    expect(profileEventSpy).toHaveBeenCalledTimes(1);
    expect((profileEventSpy.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      identifier: 'tester-slug',
    });

    window.removeEventListener('goToUserProfile', profileEventSpy as EventListener);
  });

  it('opens conversation actions from the desktop header and hides the conversation after confirmation', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const trigger = await screen.findByTestId('conversation-actions-trigger');
    fireEvent.click(trigger);

    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('conversation-delete-action'));

    const confirmModal = await screen.findByTestId('delete-conversation-confirm-modal');
    fireEvent.click(within(confirmModal).getByRole('button', { name: /vymaza/i }));

    await waitFor(() => {
      expect(hideConversation).toHaveBeenCalledWith(9);
      expect(window.location.pathname + window.location.search).toBe('/dashboard/messages');
      expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    });

    expect(mockSyncConversationReadState).toHaveBeenCalledWith({
      conversationId: 9,
      totalUnreadCount: 0,
    });

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
  });

  it('keeps the conversation detail root stretched to the available width on mobile', async () => {
    useIsMobile.mockReturnValue(true);

    const { container } = render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    expect(container.firstElementChild).toHaveClass('w-full');
    expect(container.firstElementChild).toHaveClass('max-w-4xl');
    expect(container.firstElementChild).toHaveClass('mx-auto');
  });

  it('opens conversation actions on mobile when the top bar requests them', async () => {
    useIsMobile.mockReturnValue(true);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    act(() => {
      window.dispatchEvent(new Event(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT));
    });

    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-delete-action')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('conversation-report-user-action'));

    expect(await screen.findByTestId('report-user-modal')).toHaveAttribute('data-user-id', '77');
    expect(screen.queryByTestId('conversation-actions-menu')).not.toBeInTheDocument();
  });
});
