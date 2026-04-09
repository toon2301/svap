'use client';

import React from 'react';
import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { ConversationDetail } from './ConversationDetail';
import {
  deleteMessage,
  getMessagingErrorMessage,
  hideConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from './messagingApi';
import {
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
} from './messagesEvents';
import type { MessageItem, MessageListPage } from './types';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

const mockSetActiveConversationId = jest.fn();
const mockSyncConversationReadState = jest.fn();

jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  useMessagesNotifications: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    setActiveConversationId: mockSetActiveConversationId,
    syncConversationReadState: mockSyncConversationReadState,
  }),
}));

jest.mock('@emoji-mart/data', () => ({}));

jest.mock('@emoji-mart/react', () => ({
  __esModule: true,
  default: ({ onEmojiSelect }: { onEmojiSelect: (value: { native: string }) => void }) => (
    <button
      type="button"
      onClick={() => onEmojiSelect({ native: String.fromCodePoint(0x1f642) })}
    >
      Mock emoji
    </button>
  ),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('./ChatRequestOfferPicker', () => ({
  __esModule: true,
  ChatRequestOfferPicker: () => <div data-testid="chat-request-offer-picker" />,
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  deleteMessage: jest.fn(),
  hideConversation: jest.fn(),
  listConversations: jest.fn(),
  listMessages: jest.fn(),
  markConversationRead: jest.fn(),
  sendMessage: jest.fn(),
  updateMessagingPresence: jest.fn().mockResolvedValue(undefined),
  getMessagingErrorMessage: jest.fn(),
}));

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

function mockVisualViewport({ innerHeight = 900, height = 900, offsetTop = 0 } = {}) {
  let currentHeight = height;
  let currentOffsetTop = offsetTop;
  const listeners = {
    resize: new Set<() => void>(),
    scroll: new Set<() => void>(),
  };

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeight,
  });

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      get height() {
        return currentHeight;
      },
      get offsetTop() {
        return currentOffsetTop;
      },
      addEventListener: jest.fn((event: 'resize' | 'scroll', listener: () => void) => {
        listeners[event]?.add(listener);
      }),
      removeEventListener: jest.fn((event: 'resize' | 'scroll', listener: () => void) => {
        listeners[event]?.delete(listener);
      }),
    },
  });

  return {
    setMetrics(next: { height?: number; offsetTop?: number }) {
      if (typeof next.height === 'number') {
        currentHeight = next.height;
      }
      if (typeof next.offsetTop === 'number') {
        currentOffsetTop = next.offsetTop;
      }
    },
    dispatch(event: 'resize' | 'scroll') {
      listeners[event].forEach((listener) => listener());
    },
  };
}

function message(overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id: 1,
    conversation: 9,
    sender: { id: 77, display_name: 'Tester' },
    text: 'Sprava',
    created_at: '2026-03-27T10:00:00Z',
    edited_at: null,
    is_deleted: false,
    ...overrides,
  };
}

function messagePage(
  results: MessageItem[],
  overrides: Partial<MessageListPage> = {},
): MessageListPage {
  return {
    results,
    nextPage: null,
    previousPage: null,
    peerLastReadAt: null,
    ...overrides,
  };
}

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

describe('ConversationDetail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useIsMobile.mockReturnValue(false);
    setVisibilityState('visible');
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        has_requestable_offers: true,
        other_user: {
          id: 77,
          display_name: 'Tester',
        },
      },
    ]);
    (listMessages as jest.Mock).mockResolvedValue(messagePage([]));
    (markConversationRead as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      last_read_at: null,
    });
    (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly messaging error');
    (deleteMessage as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      message: message({
        id: 1,
        sender: { id: 1, display_name: 'Me' },
        text: null,
        is_deleted: true,
      }),
      total_unread_count: 0,
    });
    (hideConversation as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      hidden_at: '2026-03-27T10:10:00Z',
      total_unread_count: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('renders the request picker only when the conversation exposes requestable offers', async () => {
    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    expect(screen.getByTestId('chat-request-offer-picker')).toBeInTheDocument();
  });

  it('hides the request picker when the other user has no requestable offers', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        has_requestable_offers: false,
        other_user: {
          id: 77,
          display_name: 'Tester',
        },
      },
    ]);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    expect(screen.queryByTestId('chat-request-offer-picker')).not.toBeInTheDocument();
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
      expect(pushMock).toHaveBeenCalledWith('/dashboard/messages');
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
  });

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

  it('coalesces duplicate mark-read requests while a shared refresh is still in flight', async () => {
    const messagesRequest = deferred<MessageListPage>();
    const markReadRequest = deferred<{
      conversation_id: number;
      last_read_at: string | null;
      total_unread_count?: number;
    }>();

    (listMessages as jest.Mock).mockReturnValue(messagesRequest.promise);
    (markConversationRead as jest.Mock).mockReturnValue(markReadRequest.promise);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      messagesRequest.resolve(
        messagePage([
          message({
            id: 11,
            text: 'Nova prichadzajuca sprava',
          }),
        ]),
      );
      await messagesRequest.promise;
    });

    await waitFor(() => {
      expect(markConversationRead).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      markReadRequest.resolve({
        conversation_id: 9,
        last_read_at: '2026-03-27T10:05:00Z',
        total_unread_count: 0,
      });
      await markReadRequest.promise;
    });

    await waitFor(() => {
      expect(mockSyncConversationReadState).toHaveBeenCalledWith({
        conversationId: 9,
        totalUnreadCount: 0,
      });
    });

    expect(listMessages).toHaveBeenCalledTimes(1);
    expect(markConversationRead).toHaveBeenCalledTimes(1);
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

  it('shows only time for timestamps from today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T12:00:00Z'));

    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Dnesna sprava',
          created_at: '2026-04-01T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Dnesna sprava')).toBeInTheDocument();
    expect(screen.getByTestId('message-timestamp-1').textContent).toMatch(/\d{2}:\d{2}/);
    expect(screen.getByTestId('message-timestamp-1').textContent).not.toContain('2026');
    expect(screen.getByTestId('message-timestamp-1').textContent).not.toContain('01.');
  });

  it('shows full date and time for older message timestamps', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Sprava s datumom',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Sprava s datumom')).toBeInTheDocument();
    expect(screen.getByTestId('message-timestamp-1').textContent).toContain('2026');
    expect(screen.getByTestId('message-timestamp-1').textContent).toContain('27.');
  });

  it('keeps the message bubble width independent from the timestamp width', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: '1',
          created_at: '2026-03-30T18:52:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('message-bubble-1').className).toContain('w-fit');
  });

  it('shows the other user avatar only on the last message in each consecutive block', async () => {
    useIsMobile.mockReturnValue(true);
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        has_requestable_offers: true,
        other_user: {
          id: 77,
          display_name: 'Tester',
          avatar_url: 'https://example.com/tester.png',
        },
      },
    ]);
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 5,
          text: 'Nova samostatna',
          created_at: '2026-03-27T10:04:00Z',
        }),
        message({
          id: 4,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja odpoved',
          created_at: '2026-03-27T10:03:00Z',
        }),
        message({
          id: 3,
          text: 'Treta v bloku',
          created_at: '2026-03-27T10:02:00Z',
        }),
        message({
          id: 2,
          text: 'Druha v bloku',
          created_at: '2026-03-27T10:01:00Z',
        }),
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja prva',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Treta v bloku')).toBeInTheDocument();
    expect(screen.queryByTestId('message-avatar-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('message-avatar-3')).toBeInTheDocument();
    expect(screen.getByTestId('message-avatar-5')).toBeInTheDocument();
    expect(screen.queryByTestId('message-avatar-4')).not.toBeInTheDocument();
  });

  it('shows seen only under the latest outgoing message read by the other user', async () => {
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
        has_requestable_offers: true,
        other_user: {
          id: 77,
          display_name: 'Tester',
          avatar_url: 'https://example.com/tester.png',
        },
      },
    ]);
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage(
        [
          message({
            id: 4,
            text: 'Peer sprava',
            created_at: '2026-03-27T10:03:00Z',
          }),
          message({
            id: 3,
            sender: { id: 1, display_name: 'Me' },
            text: 'Tretia moja',
            created_at: '2026-03-27T10:02:00Z',
          }),
          message({
            id: 2,
            sender: { id: 1, display_name: 'Me' },
            text: 'Druha moja',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Prva moja',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ],
        { peerLastReadAt: '2026-03-27T10:01:30Z' },
      ),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Druha moja')).toBeInTheDocument();
    expect(screen.getByTestId('message-seen-indicator-2')).toBeInTheDocument();
    expect(screen.queryByTestId('message-seen-indicator-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-seen-indicator-3')).not.toBeInTheDocument();
  });

  it('updates the seen indicator when a peer read event arrives for the open conversation', async () => {
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

    expect(await screen.findByText('Moja sprava')).toBeInTheDocument();
    expect(screen.queryByTestId('message-seen-indicator-1')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_READ_EVENT, {
          detail: {
            conversationId: 9,
            peerLastReadAt: '2026-03-27T10:00:30Z',
            readerId: 77,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('message-seen-indicator-1')).toBeInTheDocument();
    });
  });

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
    expect(bubble.tagName).toBe('BUTTON');
    expect(bubble).toHaveClass('select-none');
    expect(messageText).toHaveClass('select-none');

    const contextMenuEvent = createEvent.contextMenu(bubble);
    fireEvent(bubble, contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(true);

    const textContextMenuEvent = createEvent.contextMenu(messageText);
    fireEvent(messageText, textContextMenuEvent);
    expect(textContextMenuEvent.defaultPrevented).toBe(true);

    const dragStartEvent = createEvent.dragStart(bubble);
    fireEvent(bubble, dragStartEvent);
    expect(dragStartEvent.defaultPrevented).toBe(true);

    fireEvent.touchStart(bubble);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(await screen.findByTestId('message-actions-menu')).toBeInTheDocument();
    expect(screen.getByTestId('message-delete-action')).toBeInTheDocument();
  });

  it('updates the open conversation when a realtime delete event arrives', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 4,
          text: 'Nova sprava',
          created_at: '2026-03-27T10:03:00Z',
        }),
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
      expect(screen.queryByText('Moja sprava')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-bubble-3')).toHaveTextContent(/vymazan/i);
      expect(screen.getByText('Nova sprava')).toBeInTheDocument();
    });
  });

  it('refreshes the conversation and notifies the conversations rail when the tab becomes visible again', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
    setVisibilityState('hidden');

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Nova odpoved',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Moja sprava')).toBeInTheDocument();
    });

    expect(markConversationRead).not.toHaveBeenCalled();

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Nova odpoved')).toBeInTheDocument();
      expect(markConversationRead).toHaveBeenCalledWith(9);
      expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
  });

  it('refreshes immediately when a realtime event arrives for the open conversation', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);

    (listMessages as jest.Mock)
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        messagePage([
          message({
            id: 2,
            text: 'Realtime odpoved',
            created_at: '2026-03-27T10:01:00Z',
          }),
          message({
            id: 1,
            sender: { id: 1, display_name: 'Me' },
            text: 'Moja sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ]),
      );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Moja sprava')).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MESSAGING_REALTIME_MESSAGE_EVENT, {
          detail: {
            conversationId: 9,
            messageId: 2,
            senderId: 77,
            createdAt: '2026-03-27T10:01:00Z',
          },
        }),
      );
    });

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Realtime odpoved')).toBeInTheDocument();
      expect(markConversationRead).toHaveBeenCalledWith(9);
      expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
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
