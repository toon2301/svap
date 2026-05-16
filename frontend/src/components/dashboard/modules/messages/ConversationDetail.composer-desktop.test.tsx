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

describe('ConversationDetail desktop composer', () => {
  it('shows a toast and re-enables sending when sendMessage fails', async () => {
    const pendingSend = deferred<unknown>();
    (sendMessage as jest.Mock).mockReturnValue(pendingSend.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ahoj' } });

    const sendButton = screen.getByRole('button', { name: /odosla/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
      expect(sendButton).toBeDisabled();
    });

    await act(async () => {
      pendingSend.reject(new Error('send failed'));
      try {
        await pendingSend.promise;
      } catch {
        // expected rejection
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Friendly messaging error');
      expect(sendButton).not.toBeDisabled();
    });

    expect((input as HTMLInputElement).value).toBe('Ahoj');
  });

  it('suppresses only passive refreshes after a forbidden send error', async () => {
    (sendMessage as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 403,
        data: {},
      },
    });

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Tretia sprava' } });
    fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Friendly messaging error');
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(listMessages).toHaveBeenCalledTimes(1);
  });

  it('inserts emoji into the desktop composer input', async () => {
    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const input = (await screen.findByRole('textbox')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj ' } });
    input.focus();
    input.setSelectionRange(5, 5);

    fireEvent.click(screen.getByRole('button', { name: /emoji/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mock emoji' }));

    await waitFor(() => {
      expect(input.value).toBe(`Ahoj ${String.fromCodePoint(0x1f642)}`);
    });
  });

  it('focuses the desktop composer on open and after sending a message', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(undefined);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const input = (await screen.findByRole('textbox')) as HTMLInputElement;
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    fireEvent.change(input, { target: { value: 'Ahoj' } });

    const sendButton = screen.getByRole('button', { name: /odosla/i });
    sendButton.focus();
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
    });

    await waitFor(() => {
      expect(input).toHaveFocus();
      expect(input.value).toBe('');
    });
  });

  it('sends a desktop message with an attached image and clears the preview after success', async () => {
    const attachment = new File(['image'], 'photo.png', { type: 'image/png' });
    (sendMessage as jest.Mock).mockResolvedValue(undefined);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    fireEvent.change(screen.getByTestId('conversation-image-picker-input'), {
      target: { files: [attachment] },
    });

    const preview = await screen.findByTestId('message-composer-image-preview');
    const previewImage = within(preview).getByRole('img');
    expect(previewImage.className).toContain('object-contain');
    expect(previewImage.className).not.toContain('object-cover');
    expect(previewImage.className).toContain('max-h-40');

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ahoj s obrazkom' } });
    fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          text: 'Ahoj s obrazkom',
          image: attachment,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('message-composer-image-preview')).not.toBeInTheDocument();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:message-preview');
    });
  });
});
