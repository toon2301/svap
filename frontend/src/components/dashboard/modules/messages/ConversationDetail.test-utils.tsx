'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { ConversationDetail } from './ConversationDetail';
import { blockUser } from '../userBlocksApi';
import { resolveMessagingImageUrl } from './resolveMessagingImageUrl';
import {
  deleteMessage,
  forwardMessage,
  getMessagingErrorCode,
  getMessagingErrorMessage,
  getMessagingErrorStatus,
  hideConversation,
  listConversations,
  listGroupMemberCandidates,
  listMessages,
  markConversationRead,
  sendMessage,
  updateConversationPinnedMessage,
} from './messagingApi';
import {
  MESSAGING_CONVERSATION_UNAVAILABLE_EVENT,
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
  clearPassiveMessagingRefreshSuppression,
} from './messagesEvents';
import type { MessageItem, MessageListPage } from './types';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

export const mockSetActiveConversationId = jest.fn();
export const mockSyncConversationReadState = jest.fn();
export const mockMessagesNotificationsState = {
  isRealtimeConnected: false,
};

jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  useMessagesNotifications: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    isRealtimeConnected: mockMessagesNotificationsState.isRealtimeConnected,
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

jest.mock('../profile/ReportUserModal', () => ({
  __esModule: true,
  ReportUserModal: ({ open, userId }: { open: boolean; userId: number }) =>
    open ? <div data-testid="report-user-modal" data-user-id={userId} /> : null,
}));

jest.mock('../userBlocksApi', () => ({
  __esModule: true,
  blockUser: jest.fn(),
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  deleteMessage: jest.fn(),
  forwardMessage: jest.fn(),
  getMessagingErrorCode: jest.fn((error) => {
    const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
    return typeof code === 'string' ? code : null;
  }),
  getMessagingErrorStatus: jest.fn((error) => {
    const status = (error as { response?: { status?: unknown } })?.response?.status;
    return typeof status === 'number' ? status : null;
  }),
  hideConversation: jest.fn(),
  listConversations: jest.fn(),
  listGroupMemberCandidates: jest.fn(),
  listMessages: jest.fn(),
  markConversationRead: jest.fn(),
  sendMessage: jest.fn(),
  updateConversationPinnedMessage: jest.fn(),
  updateMessagingPresence: jest.fn().mockResolvedValue(undefined),
  getMessagingErrorMessage: jest.fn(),
}));

export const pushMock = jest.fn();
export const clipboardWriteTextMock = jest.fn();
export const execCommandMock = jest.fn();
export const createObjectURLMock = jest.fn();
export const revokeObjectURLMock = jest.fn();
const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalNextPublicBackendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

export function mockVisualViewport({ innerHeight = 900, height = 900, offsetTop = 0 } = {}) {
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

export function installControllableResizeObserver() {
  const originalResizeObserver = global.ResizeObserver;
  const observers: Array<{
    callback: ResizeObserverCallback;
    observed: Set<Element>;
  }> = [];

  class ControllableResizeObserver {
    private readonly callback: ResizeObserverCallback;

    private readonly observed = new Set<Element>();

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.push({ callback, observed: this.observed });
    }

    observe = (element: Element) => {
      this.observed.add(element);
    };

    unobserve = (element: Element) => {
      this.observed.delete(element);
    };

    disconnect = () => {
      this.observed.clear();
    };
  }

  Object.defineProperty(global, 'ResizeObserver', {
    configurable: true,
    value: ControllableResizeObserver,
  });

  return {
    trigger(target: Element) {
      observers.forEach((observer) => {
        if (!observer.observed.has(target)) return;
        observer.callback([{ target } as ResizeObserverEntry], {} as ResizeObserver);
      });
    },
    restore() {
      Object.defineProperty(global, 'ResizeObserver', {
        configurable: true,
        value: originalResizeObserver,
      });
    },
  };
}

export function message(overrides: Partial<MessageItem> = {}): MessageItem {
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

export function messagePage(
  results: MessageItem[],
  overrides: Partial<MessageListPage> = {},
): MessageListPage {
  return {
    results,
    nextPage: null,
    previousPage: null,
    peerLastReadAt: null,
    pinnedMessage: null,
    conversation: null,
    ...overrides,
  };
}

export const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};


export {
  ConversationDetail,
  blockUser,
  resolveMessagingImageUrl,
  deleteMessage,
  forwardMessage,
  getMessagingErrorCode,
  getMessagingErrorMessage,
  getMessagingErrorStatus,
  hideConversation,
  listConversations,
  listGroupMemberCandidates,
  listMessages,
  markConversationRead,
  sendMessage,
  toast,
  updateConversationPinnedMessage,
  MESSAGING_CONVERSATION_UNAVAILABLE_EVENT,
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
};

export function setupConversationDetailTestDefaults() {
    jest.resetAllMocks();
    clearPassiveMessagingRefreshSuppression();
    mockMessagesNotificationsState.isRealtimeConnected = false;
    if (originalNextPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
    }
    if (originalNextPublicBackendOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_ORIGIN = originalNextPublicBackendOrigin;
    }
    useIsMobile.mockReturnValue(false);
    setVisibilityState('visible');
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommandMock,
    });
    clipboardWriteTextMock.mockResolvedValue(undefined);
    execCommandMock.mockReturnValue(true);
    createObjectURLMock.mockReturnValue('blob:message-preview');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURLMock,
    });
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
    (listMessages as jest.Mock).mockResolvedValue(
      messagePage([], {
        conversation: {
          id: 9,
          has_requestable_offers: true,
          other_user: {
            id: 77,
            slug: 'tester-slug',
            display_name: 'Tester',
          },
          last_message_preview: null,
          last_message_at: null,
          last_read_at: null,
          has_unread: false,
          unread_count: 0,
          updated_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    (listGroupMemberCandidates as jest.Mock).mockResolvedValue([]);
    (blockUser as jest.Mock).mockResolvedValue({
      user_id: 77,
      is_blocked: true,
      created: true,
    });
    (markConversationRead as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      last_read_at: null,
    });
    (updateConversationPinnedMessage as jest.Mock).mockResolvedValue({
      conversation_id: 9,
      pinned_message: null,
    });
    (getMessagingErrorMessage as jest.Mock).mockReturnValue('Friendly messaging error');
    (getMessagingErrorCode as jest.Mock).mockImplementation((error) => {
      const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
      return typeof code === 'string' ? code : null;
    });
    (getMessagingErrorStatus as jest.Mock).mockImplementation((error) => {
      const status = (error as { response?: { status?: unknown } })?.response?.status;
      return typeof status === 'number' ? status : null;
    });
    (forwardMessage as jest.Mock).mockResolvedValue({
      sent: [],
      failed: [],
    });
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
}

export function resetConversationDetailTimers() {
  jest.useRealTimers();
}

export function restoreConversationDetailTestEnvironment() {
    if (originalNextPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
    }
    if (originalNextPublicBackendOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_ORIGIN = originalNextPublicBackendOrigin;
    }
}

export function setupConversationDetailTestLifecycle() {
  beforeEach(setupConversationDetailTestDefaults);
  afterEach(resetConversationDetailTimers);
  afterAll(restoreConversationDetailTestEnvironment);
}
