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

describe('ConversationDetail URL helpers', () => {
  it('rewrites authenticated message image URLs to the same-origin api path in proxied mode', () => {
    process.env.NEXT_PUBLIC_API_URL = '/api';
    delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

    expect(
      resolveMessagingImageUrl(
        'https://backend.example/api/auth/messaging/conversations/9/messages/1/image/',
      ),
    ).toBe('/api/auth/messaging/conversations/9/messages/1/image/');
  });

  it('keeps authenticated message image URLs absolute when the frontend talks to the backend directly', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api';
    delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

    expect(
      resolveMessagingImageUrl(
        'https://backend.example/api/auth/messaging/conversations/9/messages/1/image/',
      ),
    ).toBe('https://backend.example/api/auth/messaging/conversations/9/messages/1/image/');
  });
});
