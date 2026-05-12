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

describe('ConversationDetail desktop message actions', () => {
  it('opens the desktop message actions from the hover trigger and keeps the deleted placeholder in the thread', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage(
        [
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ],
        { peerLastReadAt: '2026-03-27T10:00:30Z' },
      ),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await screen.findByText('Moja sprava');
    expect(screen.getByTestId('message-seen-indicator-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-actions-trigger-1'));

    expect(await screen.findByTestId('message-actions-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('message-delete-action'));

    const confirmModal = await screen.findByTestId('delete-message-confirm-modal');
    fireEvent.click(within(confirmModal).getByRole('button', { name: /vymaza/i }));

    await waitFor(() => {
      expect(deleteMessage).toHaveBeenCalledWith(9, 1);
      expect(screen.queryByText('Moja sprava')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-bubble-1')).toHaveTextContent(/vymazan/i);
    });

    expect(screen.queryByTestId('message-seen-indicator-1')).not.toBeInTheDocument();
    expect(mockSyncConversationReadState).toHaveBeenCalledWith({
      conversationId: 9,
      totalUnreadCount: 0,
    });
  });

  it('keeps the desktop message actions trigger clickable briefly after leaving the message row', async () => {
    jest.useFakeTimers();
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

    await screen.findByText('Moja sprava');

    const row = screen.getByTestId('message-row-1');
    const trigger = screen.getByTestId('message-actions-trigger-1');

    expect(trigger.className).toContain('pointer-events-none');
    expect(trigger.className).toContain('opacity-0');

    fireEvent.mouseEnter(row);

    expect(trigger.className).toContain('pointer-events-auto');
    expect(trigger.className).toContain('opacity-100');

    fireEvent.mouseLeave(row);
    fireEvent.click(trigger);

    expect(await screen.findByTestId('message-actions-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-actions-menu'));

    await waitFor(() => {
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(151);
    });

    expect(trigger.className).toContain('pointer-events-none');
    expect(trigger.className).toContain('opacity-0');
  });

  it('copies an own message from the desktop message actions menu', async () => {
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

    await screen.findByText('Moja sprava');

    fireEvent.click(screen.getByTestId('message-actions-trigger-1'));

    expect(await screen.findByTestId('message-copy-action')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-copy-action'));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Moja sprava');
      expect(toast.success).toHaveBeenCalledWith('Správa bola skopírovaná.');
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });

    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it('copies another users message from the desktop message actions menu without offering delete', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Sprava od druheho uzivatela',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await screen.findByText('Sprava od druheho uzivatela');

    fireEvent.click(screen.getByTestId('message-actions-trigger-1'));

    expect(await screen.findByTestId('message-copy-action')).toBeInTheDocument();
    expect(screen.queryByTestId('message-delete-action')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-copy-action'));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Sprava od druheho uzivatela');
      expect(toast.success).toHaveBeenCalledWith('Správa bola skopírovaná.');
      expect(screen.queryByTestId('message-actions-menu')).not.toBeInTheDocument();
    });

    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it('shows an error toast when message copy fails', async () => {
    clipboardWriteTextMock.mockRejectedValueOnce(new Error('copy failed'));
    execCommandMock.mockReturnValue(false);
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

    await screen.findByText('Moja sprava');

    fireEvent.click(screen.getByTestId('message-actions-trigger-1'));
    fireEvent.click(await screen.findByTestId('message-copy-action'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Správu sa nepodarilo skopírovať.');
      expect(screen.getByTestId('message-actions-menu')).toBeInTheDocument();
    });
  });
});
