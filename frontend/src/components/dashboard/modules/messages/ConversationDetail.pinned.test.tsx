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

describe('ConversationDetail pinned messages', () => {
  it('renders a pinned message banner from the messages response and jumps to the loaded message', async () => {
    const pinned = message({
      id: 1,
      sender: { id: 77, display_name: 'Tester' },
      text: 'Pripnuta sprava',
      created_at: '2026-03-27T10:00:00Z',
    });
    const scrollIntoViewMock = Element.prototype.scrollIntoView as jest.Mock;
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([pinned], {
        pinnedMessage: pinned,
      }),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('pinned-message-banner')).toHaveTextContent(
      'Pripnuta sprava',
    );
    scrollIntoViewMock.mockClear();

    fireEvent.click(screen.getByTestId('pinned-message-banner-trigger'));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('pins another users image-only message from the desktop actions menu', async () => {
    const imageOnlyMessage = message({
      id: 1,
      sender: { id: 77, display_name: 'Tester' },
      text: null,
      image_url: 'https://example.com/chat-image.png',
      has_image: true,
      created_at: '2026-03-27T10:00:00Z',
    });
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([imageOnlyMessage], {
        pinnedMessage: null,
      }),
    );
    (updateConversationPinnedMessage as jest.Mock).mockResolvedValueOnce({
      conversation_id: 9,
      pinned_message: imageOnlyMessage,
    });

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('message-actions-trigger-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-actions-trigger-1'));

    expect(await screen.findByTestId('message-pin-action')).toBeInTheDocument();
    expect(screen.queryByTestId('message-copy-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-delete-action')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-pin-action'));

    await waitFor(() => {
      expect(updateConversationPinnedMessage).toHaveBeenCalledWith(9, 1);
      expect(screen.getByTestId('pinned-message-banner')).toBeInTheDocument();
      expect(screen.getByTestId('pinned-message-banner')).toHaveTextContent('Obrázok');
    });
  });

  it('unpins the current banner without disturbing the thread', async () => {
    const pinned = message({
      id: 1,
      sender: { id: 77, display_name: 'Tester' },
      text: 'Pripnuta sprava',
      created_at: '2026-03-27T10:00:00Z',
    });
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([pinned], {
        pinnedMessage: pinned,
      }),
    );
    (updateConversationPinnedMessage as jest.Mock).mockResolvedValueOnce({
      conversation_id: 9,
      pinned_message: null,
    });

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('pinned-message-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pinned-message-unpin-button'));

    await waitFor(() => {
      expect(updateConversationPinnedMessage).toHaveBeenCalledWith(9, null);
      expect(screen.queryByTestId('pinned-message-banner')).not.toBeInTheDocument();
    });
  });

  it('loads older pages until the pinned message is found before scrolling to it', async () => {
    const oldPinnedMessage = message({
      id: 1,
      sender: { id: 77, display_name: 'Tester' },
      text: 'Stara pripnuta sprava',
      created_at: '2026-03-27T10:00:00Z',
    });
    const scrollIntoViewMock = Element.prototype.scrollIntoView as jest.Mock;
    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage(
          [
            message({
              id: 3,
              sender: { id: 1, display_name: 'Me' },
              text: 'Nova sprava',
              created_at: '2026-03-27T10:02:00Z',
            }),
            message({
              id: 2,
              sender: { id: 77, display_name: 'Tester' },
              text: 'Stred threadu',
              created_at: '2026-03-27T10:01:00Z',
            }),
          ],
          {
            nextPage: 2,
            pinnedMessage: oldPinnedMessage,
          },
        ),
      )
      .mockResolvedValueOnce(
        messagePage([oldPinnedMessage], {
          nextPage: null,
          pinnedMessage: oldPinnedMessage,
        }),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('pinned-message-banner')).toBeInTheDocument();
    scrollIntoViewMock.mockClear();

    fireEvent.click(screen.getByTestId('pinned-message-banner-trigger'));

    await waitFor(() => {
      expect(listMessages).toHaveBeenNthCalledWith(2, 9, 100, 2);
    });

    expect(await screen.findByText('Stara pripnuta sprava')).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('updates the pinned banner when a realtime pin event arrives for the open conversation', async () => {
    const pinned = message({
      id: 8,
      sender: { id: 77, display_name: 'Tester' },
      text: 'Realtime pripnuta sprava',
      created_at: '2026-03-27T10:08:00Z',
    });
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
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
    expect(screen.queryByTestId('pinned-message-banner')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_PINNED_MESSAGE_EVENT, {
          detail: {
            conversationId: 9,
            pinnedMessage: pinned,
            actorId: 77,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('pinned-message-banner')).toHaveTextContent(
        'Realtime pripnuta sprava',
      );
    });
  });

  it('clears the pinned banner when the pinned message is deleted in realtime', async () => {
    const pinned = message({
      id: 3,
      sender: { id: 77, display_name: 'Tester' },
      text: 'Mazatelna pripnuta sprava',
      created_at: '2026-03-27T10:03:00Z',
    });
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([pinned], {
        pinnedMessage: pinned,
      }),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByTestId('pinned-message-banner')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_DELETED_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 3,
            deletedById: 77,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('pinned-message-banner')).not.toBeInTheDocument();
    });
  });
});
