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

describe('ConversationDetail scroll layout', () => {
  it('anchors loaded messages to the bottom of the scroll area', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Jedna sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Jedna sprava')).toBeInTheDocument();

    const messagesStack = screen.getByTestId('conversation-messages-stack');

    expect(messagesStack.className).toContain('flex');
    expect(messagesStack.className).toContain('min-h-full');
    expect(messagesStack.className).toContain('flex-col');
    expect(messagesStack.className).toContain('justify-end');
  });

  it('keeps the initial thread open pinned to the bottom while the message layout is still settling', async () => {
    const pendingInitialPage = deferred<MessageListPage>();
    const resizeObserver = installControllableResizeObserver();

    (listMessages as jest.Mock).mockReturnValueOnce(pendingInitialPage.promise);

    try {
      render(<ConversationDetail conversationId={9} currentUserId={1} />);

      const messagesScroll = screen.getByTestId('conversation-messages-scroll');
      let currentScrollTop = 0;
      let currentScrollHeight = 640;
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
        pendingInitialPage.resolve(
          messagePage([
            message({
              id: 1,
              sender: { id: 1, display_name: 'Me' },
              text: 'Jedna sprava',
              created_at: '2026-03-27T10:00:00Z',
            }),
          ]),
        );
      });

      expect(await screen.findByText('Jedna sprava')).toBeInTheDocument();

      await waitFor(() => {
        expect(currentScrollTop).toBe(640);
      });

      const messagesStack = screen.getByTestId('conversation-messages-stack');
      currentScrollHeight = 820;

      act(() => {
        resizeObserver.trigger(messagesStack);
      });

      await waitFor(() => {
        expect(currentScrollTop).toBe(820);
      });
    } finally {
      resizeObserver.restore();
    }
  });

  it('keeps the scroll container aligned to the latest messages when the focused mobile viewport height changes', async () => {
    useIsMobile.mockReturnValue(true);
    const viewport = mockVisualViewport();

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 2,
          text: 'Nova sprava',
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

    expect(await screen.findByText('Nova sprava')).toBeInTheDocument();

    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    const input = screen.getByRole('textbox');

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
    currentScrollHeight = 712;
    fireEvent.focus(input);
    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(currentScrollTop).toBe(712);
      expect(messagesScroll.style.paddingBottom).toBe('');
    });
  });

  it('keeps the focused mobile thread pinned to the bottom without a fixed composer overlay', async () => {
    useIsMobile.mockReturnValue(true);
    const viewport = mockVisualViewport();

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 2,
          text: 'Najnovsia sprava',
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

    const composer = screen.getByTestId('conversation-composer');
    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    const input = screen.getByRole('textbox');

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
    currentScrollHeight = 778;
    fireEvent.focus(input);
    viewport.setMetrics({ height: 650 });
    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(currentScrollTop).toBe(778);
      expect(messagesScroll.style.paddingBottom).toBe('');
      expect(composer.style.bottom).toBe('');
      expect(composer.className).not.toContain('fixed');
    });
  });
});
