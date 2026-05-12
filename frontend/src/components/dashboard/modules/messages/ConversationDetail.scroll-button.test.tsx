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

describe('ConversationDetail scroll-to-bottom button', () => {
  it('shows the mobile scroll-to-bottom button only when the user is far from the latest messages', async () => {
    useIsMobile.mockReturnValue(true);

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 3,
          text: 'Najnovsia sprava',
          created_at: '2026-03-27T10:02:00Z',
        }),
        message({
          id: 2,
          text: 'Stredna sprava',
          created_at: '2026-03-27T10:01:00Z',
        }),
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Starsia sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Najnovsia sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    let currentScrollTop = 540;
    const currentScrollHeight = 1000;
    const currentClientHeight = 400;

    Object.defineProperty(messagesScroll, 'scrollTop', {
      configurable: true,
      get: () => currentScrollTop,
      set: (value: number) => {
        currentScrollTop = value;
      },
    });
    Object.defineProperty(messagesScroll, 'scrollHeight', {
      configurable: true,
      get: () => currentScrollHeight,
    });
    Object.defineProperty(messagesScroll, 'clientHeight', {
      configurable: true,
      get: () => currentClientHeight,
    });

    fireEvent.scroll(messagesScroll);

    expect(screen.queryByTestId('conversation-scroll-to-bottom')).not.toBeInTheDocument();

    currentScrollTop = 120;
    fireEvent.scroll(messagesScroll);

    expect(await screen.findByTestId('conversation-scroll-to-bottom')).toBeInTheDocument();

    currentScrollTop = 560;
    fireEvent.scroll(messagesScroll);

    await waitFor(() => {
      expect(screen.queryByTestId('conversation-scroll-to-bottom')).not.toBeInTheDocument();
    });
  });

  it('smooth-scrolls to the latest mobile messages when the scroll-to-bottom button is tapped', async () => {
    useIsMobile.mockReturnValue(true);

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 3,
          text: 'Najnovsia sprava',
          created_at: '2026-03-27T10:02:00Z',
        }),
        message({
          id: 2,
          text: 'Stredna sprava',
          created_at: '2026-03-27T10:01:00Z',
        }),
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Starsia sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Najnovsia sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    let currentScrollTop = 120;
    const currentScrollHeight = 1000;
    const currentClientHeight = 400;
    const scrollTo = jest.fn(({ top }: { top: number }) => {
      currentScrollTop = top;
    });

    Object.defineProperty(messagesScroll, 'scrollTop', {
      configurable: true,
      get: () => currentScrollTop,
      set: (value: number) => {
        currentScrollTop = value;
      },
    });
    Object.defineProperty(messagesScroll, 'scrollHeight', {
      configurable: true,
      get: () => currentScrollHeight,
    });
    Object.defineProperty(messagesScroll, 'clientHeight', {
      configurable: true,
      get: () => currentClientHeight,
    });
    Object.defineProperty(messagesScroll, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    fireEvent.scroll(messagesScroll);

    const button = await screen.findByTestId('conversation-scroll-to-bottom');
    fireEvent.click(button);

    expect(scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: 'smooth',
    });
    expect(currentScrollTop).toBe(1000);

    await waitFor(() => {
      expect(screen.queryByTestId('conversation-scroll-to-bottom')).not.toBeInTheDocument();
    });
  });
});
