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

describe('ConversationDetail realtime and paginated scrolling', () => {
  it('lets the user scroll older messages while the mobile keyboard is open', async () => {
    useIsMobile.mockReturnValue(true);
    const viewport = mockVisualViewport();

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
    const input = screen.getByRole('textbox');

    let currentScrollTop = 980;
    const currentScrollHeight = 980;
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

    fireEvent.focus(input);

    await waitFor(() => {
      expect(currentScrollTop).toBe(980);
    });

    currentScrollTop = 120;
    fireEvent.scroll(messagesScroll);

    viewport.setMetrics({ height: 650, offsetTop: 24 });
    act(() => {
      viewport.dispatch('scroll');
    });

    await waitFor(() => {
      expect(currentScrollTop).toBe(120);
    });
  });

  it('auto-scrolls incoming mobile messages only when the user is already near the bottom', async () => {
    useIsMobile.mockReturnValue(true);

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Druha sprava',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Prva sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 3,
            text: 'Nova realtime sprava',
            created_at: '2026-03-27T10:02:00Z',
          }),
          message({
            id: 2,
            text: 'Druha sprava',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Prva sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Druha sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    let currentScrollTop = 0;
    let currentScrollHeight = 900;
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

    currentScrollTop = 500;
    currentScrollHeight = 980;

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_MESSAGE_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 3,
            senderId: 77,
            createdAt: '2026-03-27T10:02:00Z',
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nova realtime sprava')).toBeInTheDocument();
      expect(currentScrollTop).toBe(980);
    });
  });

  it('keeps mobile scroll position when a realtime message arrives while reading older history', async () => {
    useIsMobile.mockReturnValue(true);

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Druha sprava',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Prva sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 3,
            text: 'Nova realtime sprava',
            created_at: '2026-03-27T10:02:00Z',
          }),
          message({
            id: 2,
            text: 'Druha sprava',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Prva sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Druha sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    let currentScrollTop = 120;
    const currentScrollHeight = 980;
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

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_MESSAGE_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 3,
            senderId: 77,
            createdAt: '2026-03-27T10:02:00Z',
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nova realtime sprava')).toBeInTheDocument();
      expect(currentScrollTop).toBe(120);
    });
  });

  it('loads older messages when the user scrolls near the top of the thread', async () => {
    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage(
          [
            message({
              id: 3,
              sender: { id: 1, display_name: 'Me' },
              text: 'Treta sprava',
              created_at: '2026-03-27T10:02:00Z',
            }),
            message({
              id: 2,
              text: 'Druha sprava',
              created_at: '2026-03-27T10:01:00Z',
            }),
          ],
          { nextPage: 2 },
        ),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 1,
            text: 'Prva sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Treta sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    let currentScrollTop = 0;
    let currentScrollHeight = 640;

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

    currentScrollTop = 48;
    currentScrollHeight = 900;
    fireEvent.scroll(messagesScroll);

    await waitFor(() => {
      expect(listMessages).toHaveBeenNthCalledWith(2, 9, 100, 2);
    });

    currentScrollHeight = 1180;

    expect(await screen.findByText('Prva sprava')).toBeInTheDocument();
  });
});
