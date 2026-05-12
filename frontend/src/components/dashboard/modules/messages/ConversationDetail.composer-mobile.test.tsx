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

describe('ConversationDetail mobile composer', () => {
  it('keeps the mobile composer in the normal layout flow even after focus', async () => {
    useIsMobile.mockReturnValue(true);
    const viewport = mockVisualViewport();

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const composer = await screen.findByTestId('conversation-composer');
    const composerStack = screen.getByTestId('conversation-mobile-composer-stack');
    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    const input = screen.getByRole('textbox');

    Object.defineProperty(composerStack, 'offsetHeight', {
      configurable: true,
      get: () => 50,
    });

    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(composer.style.bottom).toBe('');
      expect(messagesScroll.style.paddingBottom).toBe('');
    });
    expect(composerStack.className).toMatch(/safe-area-inset-left/);
    expect(composer.className).not.toContain('px-4');
    expect(composer.className).not.toContain('fixed');
    expect(composer.className).not.toContain('mt-1.5');
    expect(composer.className).not.toContain('pt-2');
    expect(composerStack.className).toContain('pb-[max(1.75rem,env(safe-area-inset-bottom,0px))]');
    expect(messagesScroll.className).not.toContain('space-y-2');

    viewport.setMetrics({ height: 650 });
    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(composer.style.bottom).toBe('');
      expect(messagesScroll.style.paddingBottom).toBe('');
    });

    fireEvent.focus(input);

    await waitFor(() => {
      expect(composer.style.bottom).toBe('');
      expect(messagesScroll.style.paddingBottom).toBe('');
      expect(composer.className).not.toContain('fixed');
      expect(composerStack.className).toContain('pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]');
    });

    fireEvent.blur(input);

    await waitFor(() => {
      expect(composer.style.bottom).toBe('');
      expect(messagesScroll.style.paddingBottom).toBe('');
      expect(composerStack.className).toContain('pb-[max(1.75rem,env(safe-area-inset-bottom,0px))]');
    });
  });

  it('sends a mobile message on the first tap while the keyboard is open', async () => {
    useIsMobile.mockReturnValue(true);
    (sendMessage as jest.Mock).mockResolvedValue(undefined);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj' } });
    fireEvent.focus(input);

    const sendButton = await screen.findByRole('button', { name: /odosla/i });
    const pointerDownEvent = createEvent.pointerDown(sendButton, { bubbles: true, cancelable: true });
    fireEvent(sendButton, pointerDownEvent);

    expect(pointerDownEvent.defaultPrevented).toBe(true);

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
      expect(input.value).toBe('');
    });
  });

  it('keeps the mobile composer input enabled and preserves follow-up text while sending', async () => {
    useIsMobile.mockReturnValue(true);
    const pendingSend = deferred<void>();
    (sendMessage as jest.Mock).mockReturnValue(pendingSend.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj' } });
    fireEvent.focus(input);

    const sendButton = await screen.findByRole('button', { name: /odosla/i });
    const pointerDownEvent = createEvent.pointerDown(sendButton, { bubbles: true, cancelable: true });
    fireEvent(sendButton, pointerDownEvent);
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
      expect(input).not.toBeDisabled();
      expect(input.value).toBe('');
    });

    fireEvent.change(input, { target: { value: 'Ďalšia správa' } });
    expect(input.value).toBe('Ďalšia správa');

    await act(async () => {
      pendingSend.resolve(undefined);
      await pendingSend.promise;
    });

    await waitFor(() => {
      expect(input.value).toBe('Ďalšia správa');
    });
  });

  it('restores the original mobile text when sending fails before the user types again', async () => {
    useIsMobile.mockReturnValue(true);
    const pendingSend = deferred<void>();
    (sendMessage as jest.Mock).mockReturnValue(pendingSend.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj' } });
    fireEvent.focus(input);

    const sendButton = await screen.findByRole('button', { name: /odosla/i });
    const pointerDownEvent = createEvent.pointerDown(sendButton, { bubbles: true, cancelable: true });
    fireEvent(sendButton, pointerDownEvent);
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
      expect(input).not.toBeDisabled();
      expect(input.value).toBe('');
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
      expect(input.value).toBe('Ahoj');
    });
  });

  it('does not overwrite follow-up mobile text when sending fails after more typing', async () => {
    useIsMobile.mockReturnValue(true);
    const pendingSend = deferred<void>();
    (sendMessage as jest.Mock).mockReturnValue(pendingSend.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ahoj' } });
    fireEvent.focus(input);

    const sendButton = await screen.findByRole('button', { name: /odosla/i });
    const pointerDownEvent = createEvent.pointerDown(sendButton, { bubbles: true, cancelable: true });
    fireEvent(sendButton, pointerDownEvent);
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(9, 'Ahoj');
      expect(input.value).toBe('');
    });

    fireEvent.change(input, { target: { value: 'Nový text' } });
    expect(input.value).toBe('Nový text');

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
      expect(input.value).toBe('Nový text');
    });
  });
});
