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

describe('ConversationDetail message rendering', () => {
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
    const bubble = screen.getByTestId('message-bubble-1');

    expect(bubble.className).toContain('w-fit');
    expect(bubble.className).not.toContain('w-max');
  });

  it('keeps incoming message text width from being reduced by the avatar slot', async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Incoming message with enough text to use the available bubble width',
          created_at: '2026-03-30T18:52:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText(/Incoming message/)).toBeInTheDocument();
    const bubble = screen.getByTestId('message-bubble-1');
    const incomingGroup = bubble.parentElement?.parentElement?.parentElement?.parentElement;

    expect(incomingGroup?.className).toContain('w-full max-w-[calc(80%+2.5rem)]');
    expect(bubble.parentElement?.parentElement?.className).toBe('min-w-0 flex-1');
    expect(bubble.parentElement?.className).toBe('relative w-fit max-w-full -mr-2 pr-2');
    expect(bubble.className).toContain('w-max');
  });

  it('gives incoming mobile messages a definite group width before shrink-wrapping the bubble', async () => {
    useIsMobile.mockReturnValue(true);
    (listMessages as jest.Mock).mockResolvedValueOnce(
      messagePage([
        message({
          id: 1,
          text: 'Cau',
          created_at: '2026-03-30T18:52:00Z',
        }),
      ]),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    expect(await screen.findByText('Cau')).toBeInTheDocument();
    const bubble = screen.getByTestId('message-bubble-1');
    const incomingGroup = bubble.parentElement?.parentElement?.parentElement?.parentElement;

    expect(incomingGroup?.className).toContain('w-full max-w-full');
    expect(bubble.parentElement?.className).toBe('relative w-fit max-w-full -mr-2 pr-2');
    expect(bubble.className).toContain('w-max');
    expect(bubble.parentElement?.parentElement?.className).toBe('min-w-0 flex-1');
    expect(bubble.parentElement?.parentElement?.className).not.toContain('calc(100%-1.75rem)');
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
});
