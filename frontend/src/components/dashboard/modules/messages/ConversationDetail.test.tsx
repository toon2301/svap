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
import { MESSAGING_CONVERSATIONS_REFRESH_EVENT } from './messagesEvents';

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

describe('ConversationDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    (listMessages as jest.Mock).mockResolvedValue([]);
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

    const sendButton = screen.getByRole('button');
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

  it('refreshes the conversation and notifies the conversations rail when the tab becomes visible again', async () => {
    const conversationsRefreshSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
    setVisibilityState('hidden');

    (listMessages as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 1,
          conversation: 9,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava',
          created_at: '2026-03-27T10:00:00Z',
          edited_at: null,
          is_deleted: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          conversation: 9,
          sender: { id: 77, display_name: 'Tester' },
          text: 'Nova odpoved',
          created_at: '2026-03-27T10:01:00Z',
          edited_at: null,
          is_deleted: false,
        },
        {
          id: 1,
          conversation: 9,
          sender: { id: 1, display_name: 'Me' },
          text: 'Moja sprava',
          created_at: '2026-03-27T10:00:00Z',
          edited_at: null,
          is_deleted: false,
        },
      ]);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Ty:Moja sprava')).toBeInTheDocument();
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
});
