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

describe('ConversationDetail mobile message actions', () => {
  it('opens the message action sheet on mobile long press for an own message', async () => {
    jest.useFakeTimers();
    useIsMobile.mockReturnValue(true);
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja mobilna sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const bubble = await screen.findByTestId('message-bubble-1');
    const messageText = screen.getByText('Moja mobilna sprava');
    expect(bubble).toHaveClass('select-none');
    expect(messageText).toHaveClass('select-none');

    const contextMenuEvent = createEvent.contextMenu(bubble);
    fireEvent(bubble, contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(true);

    const textContextMenuEvent = createEvent.contextMenu(messageText);
    fireEvent(messageText, textContextMenuEvent);
    expect(textContextMenuEvent.defaultPrevented).toBe(true);

    fireEvent.touchStart(bubble);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(await screen.findByTestId('message-actions-menu')).toBeInTheDocument();
    expect(screen.getByTestId('message-delete-action')).toBeInTheDocument();
    expect(screen.getByTestId('message-actions-mobile-preview')).toHaveTextContent(
      'Moja mobilna sprava',
    );

    fireEvent.click(screen.getByTestId('message-actions-backdrop'));

    await waitFor(() => {
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });
  });

  it('copies an own message from the mobile long-press menu using the fallback path', async () => {
    jest.useFakeTimers();
    useIsMobile.mockReturnValue(true);
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja mobilna sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const bubble = await screen.findByTestId('message-bubble-1');
    fireEvent.touchStart(bubble);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(await screen.findByTestId('message-copy-action')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-copy-action'));

    await waitFor(() => {
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(toast.success).toHaveBeenCalledWith('Správa bola skopírovaná.');
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });
  });

  it('opens the message action sheet for another users mobile message with copy only', async () => {
    jest.useFakeTimers();
    useIsMobile.mockReturnValue(true);
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Mobilna sprava od druheho uzivatela',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const bubble = await screen.findByTestId('message-bubble-1');
    fireEvent.touchStart(bubble);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(await screen.findByTestId('message-actions-menu')).toBeInTheDocument();
    expect(screen.getByTestId('message-copy-action')).toBeInTheDocument();
    expect(screen.queryByTestId('message-delete-action')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-copy-action'));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Mobilna sprava od druheho uzivatela');
      expect(toast.success).toHaveBeenCalledWith('Správa bola skopírovaná.');
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });
  });
});
