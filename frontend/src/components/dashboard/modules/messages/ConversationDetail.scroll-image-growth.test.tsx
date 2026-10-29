'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ConversationDetail,
  deferred,
  installControllableResizeObserver,
  listMessages,
  message,
  messagePage,
  sendMessage,
  setupConversationDetailTestLifecycle,
} from './ConversationDetail.test-utils';
import type { MessageListPage } from './types';

setupConversationDetailTestLifecycle();

const CLIENT_HEIGHT = 400;
/** Po zobrazení riadku s novou správou (bez fotky) a po načítaní fotky (352 px). */
const HEIGHT_WITH_ROW = 700;
const HEIGHT_WITH_PHOTO = 1052;

/** Rozmery okna správ ako v prehliadači: `scrollTop` sa nikdy nedostane nad spodok. */
function mockScrollGeometry(element: HTMLElement) {
  const geometry = { scrollTop: 0, scrollHeight: 640 };
  const maxScrollTop = () => Math.max(0, geometry.scrollHeight - CLIENT_HEIGHT);
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => geometry.scrollTop,
    set: (value: number) => {
      geometry.scrollTop = Math.min(Math.max(0, value), maxScrollTop());
    },
  });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => geometry.scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => CLIENT_HEIGHT });
  return { geometry, maxScrollTop };
}

/** Otvorí konverzáciu s jednou správou a počká, kým skončí úvodné pripnutie na spodok (to samo sleduje načítanie fotiek). */
async function openSettledConversation() {
  const pendingInitialPage = deferred<MessageListPage>();
  (listMessages as jest.Mock).mockReturnValueOnce(pendingInitialPage.promise);

  render(<ConversationDetail conversationId={9} currentUserId={1} />);

  const messagesScroll = screen.getByTestId('conversation-messages-scroll');
  const scroll = mockScrollGeometry(messagesScroll);

  act(() => {
    pendingInitialPage.resolve(
      messagePage([
        message({
          id: 1,
          sender: { id: 1, display_name: 'Me' },
          text: 'Jedna sprava',
          created_at: '2026-03-27T10:00:00Z',
        }),
      ]),
    );
  });
  expect(await screen.findByText('Jedna sprava')).toBeInTheDocument();
  await waitFor(() => {
    expect(scroll.geometry.scrollTop).toBe(scroll.maxScrollTop());
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  return { ...scroll, messagesStack: screen.getByTestId('conversation-messages-stack') };
}

/** Vyberie fotku a stlačí Odoslať; backend potom vráti novú správu s fotkou. */
async function sendPhoto(geometry: { scrollHeight: number }) {
  const attachment = new File(['image'], 'photo.png', { type: 'image/png' });
  (sendMessage as jest.Mock).mockResolvedValue(undefined);
  (listMessages as jest.Mock).mockImplementationOnce(async () => {
    geometry.scrollHeight = HEIGHT_WITH_ROW;
    return messagePage([
      message({
        id: 2,
        sender: { id: 1, display_name: 'Me' },
        text: '',
        image_url: 'https://example.com/chat-image.png',
        has_image: true,
        created_at: '2026-03-27T10:05:00Z',
      }),
      message({
        id: 1,
        sender: { id: 1, display_name: 'Me' },
        text: 'Jedna sprava',
        created_at: '2026-03-27T10:00:00Z',
      }),
    ]);
  });

  fireEvent.change(screen.getByTestId('conversation-image-picker-input'), { target: { files: [attachment] } });
  await screen.findByTestId('message-composer-image-preview');
  fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

  expect(await screen.findByTestId('message-image-trigger-2')).toBeInTheDocument();
}

describe('ConversationDetail scroll after sending a photo', () => {
  it('keeps the thread at the bottom while the sent photo loads and makes the layout taller', async () => {
    const resizeObserver = installControllableResizeObserver();

    try {
      const { geometry, maxScrollTop, messagesStack } = await openSettledConversation();

      await sendPhoto(geometry);
      // Riadok s novou správou je v rozložení, fotka ešte nemá výšku.
      act(() => resizeObserver.trigger(messagesStack));
      await waitFor(() => {
        expect(geometry.scrollTop).toBe(HEIGHT_WITH_ROW - CLIENT_HEIGHT);
      });

      // Fotka sa načítala a rozložení narástlo o 352 px.
      geometry.scrollHeight = HEIGHT_WITH_PHOTO;
      act(() => resizeObserver.trigger(messagesStack));

      expect(geometry.scrollTop).toBe(maxScrollTop());
      expect(geometry.scrollTop).toBe(HEIGHT_WITH_PHOTO - CLIENT_HEIGHT);
    } finally {
      resizeObserver.restore();
    }
  });

  it('does not pull the user back down when they scrolled up before the photo loaded', async () => {
    const resizeObserver = installControllableResizeObserver();

    try {
      const { geometry, messagesStack } = await openSettledConversation();

      await sendPhoto(geometry);
      act(() => resizeObserver.trigger(messagesStack));
      await waitFor(() => {
        expect(geometry.scrollTop).toBe(HEIGHT_WITH_ROW - CLIENT_HEIGHT);
      });

      geometry.scrollTop = 40;
      geometry.scrollHeight = HEIGHT_WITH_PHOTO;
      act(() => resizeObserver.trigger(messagesStack));

      expect(geometry.scrollTop).toBe(40);
    } finally {
      resizeObserver.restore();
    }
  });
});
