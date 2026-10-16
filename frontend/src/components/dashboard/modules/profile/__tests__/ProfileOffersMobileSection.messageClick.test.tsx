/**
 * Tlačidlo správy na karte ponuky cudzieho profilu (mobilná sekcia ponúk).
 *
 * Konverzáciu otvára ten istý pomocník ako ikona správy na profile, takže šípka späť
 * v nej vráti na profil (viď `messagesProfileOrigin`). Adresa a samotná navigácia ostávajú.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { api } from '@/lib/api';
import ProfileOffersMobileSection from '../ProfileOffersMobileSection';
import { invalidateOffersCache, makeOffersCacheKey, setOffersToCache } from '../profileOffersCache';
import type { Offer } from '../profileOffersTypes';
import {
  adoptMessagesProfileOrigin,
  carryMessagesProfileOrigin,
  resetMessagesProfileOrigin,
} from '../../messages/messagesProfileOrigin';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockAuth = { user: null, updateUser: jest.fn() };
const mockT = (key: string, fallback?: string) => fallback ?? key;

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT }),
}));

// Karta má vlastné testy; tu ide o to, čo sekcia spraví po ťuknutí na tlačidlo správy.
jest.mock('../ProfileOfferCardMobile', () => ({
  ProfileOfferCardMobile: ({
    offer,
    onMessageClick,
  }: {
    offer: { id: number };
    onMessageClick?: (offerId: number) => void;
  }) => (
    <button type="button" onClick={() => onMessageClick?.(offer.id)}>
      message-{offer.id}
    </button>
  ),
}));

function makeOffer(id: number): Offer {
  return {
    id,
    category: 'Vzdelávanie',
    subcategory: `sub-${id}`,
    description: `Ponuka ${id}`,
    images: [],
    price_currency: 'EUR',
    is_hidden: false,
    tags: [],
  };
}

const MESSAGES_URL = '/dashboard/messages?targetUserId=99';

beforeEach(() => {
  jest.clearAllMocks();
  resetMessagesProfileOrigin();
  invalidateOffersCache(99);
  setOffersToCache(makeOffersCacheKey(99), [makeOffer(64)]);
  // Ponuka je ešte dostupná – inak by sa konverzácia neotvorila.
  jest.spyOn(api, 'get').mockResolvedValue({ data: [{ id: 64 }] } as never);
  window.history.replaceState(null, '', '/dashboard/users/peter');
});

afterEach(() => {
  jest.restoreAllMocks();
  invalidateOffersCache(99);
  resetMessagesProfileOrigin();
});

describe('ProfileOffersMobileSection – tlačidlo správy na karte ponuky', () => {
  it('opens the draft conversation with the target user', async () => {
    render(<ProfileOffersMobileSection isOtherUserProfile ownerUserId={99} ownerProfileIdentifier="peter" />);

    fireEvent.click(await screen.findByText('message-64'));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(MESSAGES_URL));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it('remembers the profile as the origin, so the arrow in the conversation goes back to it', async () => {
    render(<ProfileOffersMobileSection isOtherUserProfile ownerUserId={99} ownerProfileIdentifier="peter" />);

    fireEvent.click(await screen.findByText('message-64'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());

    // Zobrazené Správy prevezmú pôvod do záznamu konverzácie.
    window.history.replaceState({ __NA: true }, '', MESSAGES_URL);
    adoptMessagesProfileOrigin();

    expect(carryMessagesProfileOrigin()).not.toBeNull();
  });

  it('does not open the conversation twice on a quick second tap', async () => {
    render(<ProfileOffersMobileSection isOtherUserProfile ownerUserId={99} ownerProfileIdentifier="peter" />);
    const button = await screen.findByText('message-64');

    fireEvent.click(button);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });
});
