/**
 * Upozornenie „páči sa mi ponuka“ na ponuku, ktorá už neexistuje.
 *
 * Backend pre zmazanú ponuku vráti `target_url = null`. Klik na také upozornenie
 * dovtedy neurobil nič (tlačidlo bolo vypnuté) alebo, pri staršej adrese, otvoril
 * profil bez jedinej zvýraznenej karty. Rovnako ako pri upozornení na sledovanie
 * ponuky teraz vysvetlí stav hláškou a označí upozornenie ako prečítané.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback: string) => fallback,
  }),
}));

const UNAVAILABLE = 'Tento obsah už nie je dostupný.';

function makeOfferLikedNotification(
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification {
  return {
    id: 7,
    type: 'offer_liked',
    title: '',
    body: '',
    data: { offer_id: 42 },
    actor: {
      id: 12,
      display_name: 'Offer Fan',
      slug: 'offer-fan',
      user_type: 'individual',
      avatar_url: null,
    },
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: '/dashboard/profile?highlight=42',
    is_read: false,
    created_at: '2026-05-06T12:00:00.000Z',
    read_at: null,
    ...overrides,
  };
}

describe('NotificationItem – „páči sa mi ponuka“ na zmazanú ponuku', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vysvetlí nedostupnú ponuku hláškou, neotvorí profil a označí upozornenie ako prečítané', () => {
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferLikedNotification({ target_url: null })}
        onNavigate={onNavigate}
        onMarkRead={onMarkRead}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).toHaveAccessibleName(/Tento obsah už nie je dostupný\./);

    fireEvent.click(button);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(UNAVAILABLE);
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(onMarkRead).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('už prečítané upozornenie na zmazanú ponuku neoznačuje znova, hlášku ukáže', () => {
    const onMarkRead = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferLikedNotification({
          target_url: null,
          is_read: true,
          read_at: '2026-05-06T12:01:00.000Z',
        })}
        onMarkRead={onMarkRead}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(toast).toHaveBeenCalledWith(UNAVAILABLE);
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('hlášku ukáže aj klávesom %s', async (_name, key) => {
    const user = userEvent.setup();
    render(
      <NotificationItem
        notification={makeOfferLikedNotification({ target_url: null })}
      />,
    );

    screen.getByRole('button').focus();
    await user.keyboard(key);

    expect(toast).toHaveBeenCalledWith(UNAVAILABLE);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    'https://example.com/dashboard/profile?highlight=42',
    '//example.com/dashboard/profile?highlight=42',
  ])('cudziu adresu nikdy nenasleduje a dá len neutrálnu hlášku: %s', (targetUrl) => {
    const onNavigate = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferLikedNotification({ target_url: targetUrl })}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(toast).toHaveBeenCalledWith(UNAVAILABLE);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('upozornenie na existujúcu ponuku vedie ďalej na profil bez hlášky', () => {
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferLikedNotification()}
        onNavigate={onNavigate}
        onMarkRead={onMarkRead}
      />,
    );

    expect(screen.getByRole('button')).not.toHaveAccessibleName(
      /Tento obsah už nie je dostupný\./,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/profile?highlight=42');
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('upozornenie na existujúcu ponuku bez onNavigate ide cez router', () => {
    render(<NotificationItem notification={makeOfferLikedNotification()} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/profile?highlight=42');
    expect(toast).not.toHaveBeenCalled();
  });

  it('iný typ upozornenia bez cieľa ostáva nečinný: bez hlášky a s vypnutým tlačidlom', () => {
    const onMarkRead = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferLikedNotification({
          type: 'portfolio_liked',
          target_url: null,
        })}
        onMarkRead={onMarkRead}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).not.toHaveAccessibleName(/Tento obsah už nie je dostupný\./);

    fireEvent.click(button);

    expect(toast).not.toHaveBeenCalled();
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
