'use client';

/**
 * Hlavička detailu konverzácie, keď je človek príjemcom žiadosti o správu (desktop).
 *
 * Údaje o druhej strane (meno, avatar, slug) hlavička berie z poľa `conversation` v odpovedi
 * endpointu správ. Backend ho pre prichádzajúcu neprijatú žiadosť predtým nevracal, takže
 * hlavička ukázala len „Používateľ" a nedala sa kliknúť. Tu sa overuje, že s vyplneným
 * poľom je hlavička plnohodnotná a že bez neho ostáva bezpečne neaktívna.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ConversationDetail,
  listMessages,
  messagePage,
  setupConversationDetailTestLifecycle,
} from './ConversationDetail.test-utils';

setupConversationDetailTestLifecycle();

const incomingRequest = {
  id: 9,
  has_requestable_offers: false,
  message_request_role: 'recipient' as const,
  request_status: 'pending',
  other_user: {
    id: 77,
    slug: 'sara',
    display_name: 'Sára Odosielateľ',
    avatar_url: 'https://cdn.example/sara.png',
  },
  last_message_preview: 'Ahoj',
  last_message_at: '2026-01-01T10:00:00Z',
  last_read_at: null,
  has_unread: true,
  unread_count: 1,
  updated_at: '2026-01-01T10:00:00Z',
};

describe('hlavička prichádzajúcej žiadosti o správu', () => {
  it('shows the name and the avatar of the sender and opens their profile', async () => {
    (listMessages as jest.Mock).mockResolvedValue(
      messagePage([], { conversation: incomingRequest as never }),
    );
    const profileEventSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileEventSpy as EventListener);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const trigger = await screen.findByTestId('conversation-header-trigger');
    await waitFor(() => expect(trigger).not.toBeDisabled());
    expect(trigger).toHaveTextContent('Sára Odosielateľ');
    expect(screen.getByRole('img', { name: 'Sára Odosielateľ' })).toHaveAttribute(
      'src',
      'https://cdn.example/sara.png',
    );

    fireEvent.click(trigger);
    window.removeEventListener('goToUserProfile', profileEventSpy as EventListener);

    expect(profileEventSpy).toHaveBeenCalledTimes(1);
    expect((profileEventSpy.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      identifier: 'sara',
    });
  });

  it('treats the person as the recipient of a request as soon as the conversation arrives', async () => {
    (listMessages as jest.Mock).mockResolvedValue(
      messagePage([], { conversation: incomingRequest as never }),
    );

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    await waitFor(() => expect(screen.getByTestId('conversation-header-trigger')).not.toBeDisabled());
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'placeholder',
      expect.stringMatching(/automaticky prijme/i),
    );
  });

  it('keeps the header inactive (and shows nobody else) while the other side is unknown', async () => {
    (listMessages as jest.Mock).mockResolvedValue(messagePage([], { conversation: null }));
    const profileEventSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileEventSpy as EventListener);

    render(<ConversationDetail conversationId={9} currentUserId={1} />);

    const trigger = await screen.findByTestId('conversation-header-trigger');
    await waitFor(() => expect(listMessages).toHaveBeenCalled());
    fireEvent.click(trigger);
    window.removeEventListener('goToUserProfile', profileEventSpy as EventListener);

    expect(trigger).toBeDisabled();
    expect(profileEventSpy).not.toHaveBeenCalled();
  });
});
