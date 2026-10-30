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
function mockScrollGeometry(element: HTMLElement, scrollHeight: number) {
  const geometry = { scrollTop: 0, scrollHeight };
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

/** Prehliadač pošle udalosť posunu aj po zmene `scrollTop` z kódu, jsdom nie; test ju preto pošle sám. */
function dispatchScroll() {
  fireEvent.scroll(screen.getByTestId('conversation-messages-scroll'));
}

/**
 * Otvorí konverzáciu s jednou správou a počká, kým skončí úvodné pripnutie na spodok (to samo sleduje načítanie fotiek).
 * `nextPage` určuje, či má konverzácia ešte staršie správy na načítanie.
 */
async function openSettledConversation({ scrollHeight = 640, nextPage = null }: { scrollHeight?: number; nextPage?: number | null } = {}) {
  const pendingInitialPage = deferred<MessageListPage>();
  (listMessages as jest.Mock).mockReturnValueOnce(pendingInitialPage.promise);

  render(<ConversationDetail conversationId={9} currentUserId={1} />);

  const scroll = mockScrollGeometry(screen.getByTestId('conversation-messages-scroll'), scrollHeight);

  act(() => {
    pendingInitialPage.resolve(
      messagePage(
        [
          message({
            id: 30,
            sender: { id: 1, display_name: 'Me' },
            text: 'Jedna sprava',
            created_at: '2026-03-27T10:00:00Z',
          }),
        ],
        { nextPage },
      ),
    );
  });
  expect(await screen.findByText('Jedna sprava')).toBeInTheDocument();
  await waitFor(() => {
    expect(scroll.geometry.scrollTop).toBe(scroll.maxScrollTop());
  });
  dispatchScroll();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  return { ...scroll, messagesStack: screen.getByTestId('conversation-messages-stack') };
}

/** Vyberie fotku a stlačí Odoslať; backend potom vráti novú správu s fotkou. */
async function sendPhoto(geometry: { scrollHeight: number; scrollTop: number }) {
  const attachment = new File(['image'], 'photo.png', { type: 'image/png' });
  (sendMessage as jest.Mock).mockResolvedValue(undefined);
  (listMessages as jest.Mock).mockImplementationOnce(async () => {
    geometry.scrollHeight = HEIGHT_WITH_ROW;
    return messagePage([
      message({
        id: 31,
        sender: { id: 1, display_name: 'Me' },
        text: '',
        image_url: 'https://example.com/chat-image.png',
        has_image: true,
        created_at: '2026-03-27T10:05:00Z',
      }),
      message({
        id: 30,
        sender: { id: 1, display_name: 'Me' },
        text: 'Jedna sprava',
        created_at: '2026-03-27T10:00:00Z',
      }),
    ]);
  });

  fireEvent.change(screen.getByTestId('conversation-image-picker-input'), { target: { files: [attachment] } });
  await screen.findByTestId('message-composer-image-preview');
  fireEvent.click(screen.getByRole('button', { name: /odosla/i }));

  expect(await screen.findByTestId('message-image-trigger-31')).toBeInTheDocument();
  // Posun na spodok po odoslaní beží v efekte hneď po zobrazení riadku; v prehliadači je to hotové skôr, než sa test pohne ďalej.
  await waitFor(() => {
    expect(geometry.scrollTop).toBe(HEIGHT_WITH_ROW - CLIENT_HEIGHT);
  });
}

describe('ConversationDetail scroll after sending a photo', () => {
  it('keeps the thread at the bottom while the sent photo loads and makes the layout taller', async () => {
    const resizeObserver = installControllableResizeObserver();

    try {
      const { geometry, maxScrollTop, messagesStack } = await openSettledConversation();

      await sendPhoto(geometry);
      // Riadok s novou správou je v rozložení, fotka ešte nemá výšku; okno je na spodku.
      act(() => resizeObserver.trigger(messagesStack));
      expect(geometry.scrollTop).toBe(HEIGHT_WITH_ROW - CLIENT_HEIGHT);
      dispatchScroll();

      // Fotka sa načítala a rozloženie narástlo o 352 px.
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
      expect(geometry.scrollTop).toBe(HEIGHT_WITH_ROW - CLIENT_HEIGHT);

      geometry.scrollTop = 40;
      dispatchScroll();
      geometry.scrollHeight = HEIGHT_WITH_PHOTO;
      act(() => resizeObserver.trigger(messagesStack));

      expect(geometry.scrollTop).toBe(40);
    } finally {
      resizeObserver.restore();
    }
  });
});

describe('ConversationDetail scroll when older messages are loaded', () => {
  it('keeps the reading position after older messages are prepended and the position is restored', async () => {
    const resizeObserver = installControllableResizeObserver();

    try {
      const { geometry, messagesStack } = await openSettledConversation({ scrollHeight: 2000, nextPage: 2 });
      (listMessages as jest.Mock).mockImplementationOnce(async () => {
        // Staršia stránka je v rozložení: obsah vyrástol o 2 000 px nad čitateľom.
        geometry.scrollHeight = 4000;
        return messagePage([
          message({
            id: 29,
            sender: { id: 1, display_name: 'Me' },
            text: 'Starsia sprava',
            created_at: '2026-03-27T09:00:00Z',
          }),
        ]);
      });

      // Čitateľ je pri začiatku konverzácie, takže sa načíta staršia stránka.
      geometry.scrollTop = 48;
      dispatchScroll();
      expect(await screen.findByText('Starsia sprava')).toBeInTheDocument();
      // Aplikácia vrátila čitateľa na to isté miesto (2 000 + 48); prehliadač až potom oznámi zmenu rozloženia.
      await waitFor(() => {
        expect(geometry.scrollTop).toBe(2048);
      });
      dispatchScroll();
      act(() => resizeObserver.trigger(messagesStack));

      expect(geometry.scrollTop).toBe(2048);
    } finally {
      resizeObserver.restore();
    }
  });
});
