'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { ConversationDetail } from './ConversationDetail';
import {
  getMessagingErrorMessage,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from './messagingApi';
import {
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
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

jest.mock('./CreateRequestCta', () => ({
  __esModule: true,
  CreateRequestCta: () => null,
}));

jest.mock('./CreateRequestModal', () => ({
  __esModule: true,
  CreateRequestModal: () => null,
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  listConversations: jest.fn(),
  listMessages: jest.fn(),
  markConversationRead: jest.fn(),
  sendMessage: jest.fn(),
  getMessagingErrorMessage: jest.fn(),
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
    ...overrides,
  };
}

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

describe('ConversationDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(false);
    setVisibilityState('visible');
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
    (listConversations as jest.Mock).mockResolvedValue([
      {
        id: 9,
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

  it('keeps the mobile composer anchored until the user actually focuses the input', async () => {
    useIsMobile.mockReturnValue(true);
    const viewport = mockVisualViewport();

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(9, 100);
    });

    const composer = await screen.findByTestId('conversation-composer');
    const messagesScroll = screen.getByTestId('conversation-messages-scroll');
    const input = screen.getByRole('textbox');

    Object.defineProperty(composer, 'offsetHeight', {
      configurable: true,
      get: () => 50,
    });

    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(composer).toHaveStyle({ bottom: '14px' });
      expect(messagesScroll).toHaveStyle({ paddingBottom: '58px' });
    });

    viewport.setMetrics({ height: 650 });
    act(() => {
      viewport.dispatch('resize');
    });

    await waitFor(() => {
      expect(composer).toHaveStyle({ bottom: '14px' });
      expect(messagesScroll).toHaveStyle({ paddingBottom: '58px' });
    });

    fireEvent.focus(input);

    await waitFor(() => {
      expect(composer).toHaveStyle({ bottom: '264px' });
      expect(messagesScroll).toHaveStyle({ paddingBottom: '308px' });
    });

    fireEvent.blur(input);

    await waitFor(() => {
      expect(composer).toHaveStyle({ bottom: '14px' });
      expect(messagesScroll).toHaveStyle({ paddingBottom: '58px' });
    });
  });

  it('shows full date and time in message timestamps', async () => {
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
