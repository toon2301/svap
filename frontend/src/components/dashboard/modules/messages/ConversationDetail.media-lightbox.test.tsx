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

describe('ConversationDetail message media lightbox', () => {
  it('renders an attached image inside the message bubble', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Sprava s obrazkom',
          image_url: 'https://example.com/chat-image.png',
          has_image: true,
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const bubble = await screen.findByTestId('message-bubble-1');
    const imageElement = within(bubble).getByRole('img');

    expect(imageElement).toHaveAttribute('src', 'https://example.com/chat-image.png');
    expect(imageElement.className).toContain('object-contain');
    expect(imageElement.className).not.toContain('object-cover');
    expect(imageElement.className).toContain('max-w-[min(75vw,18rem)]');
    expect(within(bubble).getByText('Sprava s obrazkom')).toBeInTheDocument();
  });

  it('rewrites a proxied message image URL and opens the lightbox from the message bubble', async () => {
    process.env.NEXT_PUBLIC_API_URL = '/api';
    delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Sprava s proxied obrazkom',
          image_url: 'https://backend.example/api/auth/messaging/conversations/9/messages/1/image/',
          has_image: true,
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const bubble = await screen.findByTestId('message-bubble-1');
    const imageElement = within(bubble).getByRole('img');
    expect(imageElement).toHaveAttribute('src', '/api/auth/messaging/conversations/9/messages/1/image/');

    fireEvent.click(screen.getByTestId('message-image-trigger-1'));

    expect(await screen.findByTestId('message-image-lightbox')).toBeInTheDocument();
    expect(screen.getByTestId('message-image-lightbox-image')).toHaveAttribute(
      'src',
      '/api/auth/messaging/conversations/9/messages/1/image/',
    );

    fireEvent.click(screen.getByTestId('message-image-lightbox'));

    await waitFor(() => {
      expect(screen.queryByTestId('message-image-lightbox')).not.toBeInTheDocument();
    });
  });

  it('closes the image lightbox on Escape and when the message is deleted in realtime', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 3,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava s obrazkom',
          image_url: 'https://example.com/chat-image.png',
          has_image: true,
          created_at: '2026-03-27T10:02:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await screen.findByText('Moja sprava s obrazkom');

    fireEvent.click(screen.getByTestId('message-image-trigger-3'));
    expect(await screen.findByTestId('message-image-lightbox')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('message-image-lightbox')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('message-image-trigger-3'));
    expect(await screen.findByTestId('message-image-lightbox')).toBeInTheDocument();

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
      expect(screen.queryByTestId('message-image-lightbox')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-bubble-3')).toHaveTextContent(/vymazan/i);
    });
  });
});
