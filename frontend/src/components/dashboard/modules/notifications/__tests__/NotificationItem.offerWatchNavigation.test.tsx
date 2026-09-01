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

function makeOfferWatchNotification(
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification {
  return {
    id: 1,
    type: 'offer_watch_match',
    title: '',
    body: '',
    data: { offer_id: 42, offer_is_seeking: false },
    actor: null,
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: '/dashboard/users/watch-owner?highlight=42',
    is_read: false,
    created_at: '2026-05-06T12:00:00.000Z',
    read_at: null,
    ...overrides,
  };
}

describe('NotificationItem offer-watch navigation edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates an already-read notification without marking it again', () => {
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();
    const onProfileNavigate = jest.fn();
    window.addEventListener('goToUserProfile', onProfileNavigate);

    try {
      render(
        <NotificationItem
          notification={makeOfferWatchNotification({
            is_read: true,
            read_at: '2026-05-06T12:01:00.000Z',
          })}
          onNavigate={onNavigate}
          onMarkRead={onMarkRead}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onProfileNavigate).toHaveBeenCalledTimes(1);
      expect(onMarkRead).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', onProfileNavigate);
    }
  });

  it('keeps the existing fallback for an incomplete target', () => {
    const onNavigate = jest.fn();
    const onProfileNavigate = jest.fn();
    window.addEventListener('goToUserProfile', onProfileNavigate);

    try {
      render(
        <NotificationItem
          notification={makeOfferWatchNotification({
            target_url: '/dashboard/users/watch-owner',
          })}
          onNavigate={onNavigate}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onProfileNavigate).not.toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/dashboard/users/watch-owner');
    } finally {
      window.removeEventListener('goToUserProfile', onProfileNavigate);
    }
  });

  it('explains an unavailable unread notification without navigating', () => {
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();
    const onProfileNavigate = jest.fn();
    window.addEventListener('goToUserProfile', onProfileNavigate);

    try {
      render(
        <NotificationItem
          notification={makeOfferWatchNotification({ target_url: null })}
          onNavigate={onNavigate}
          onMarkRead={onMarkRead}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(button);

      expect(toast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
      expect(onProfileNavigate).not.toHaveBeenCalled();
      expect(onMarkRead).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
      expect(onNavigate).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', onProfileNavigate);
    }
  });

  it('does not mark an unavailable already-read notification again', () => {
    const onMarkRead = jest.fn();

    render(
      <NotificationItem
        notification={makeOfferWatchNotification({
          target_url: null,
          is_read: true,
          read_at: '2026-05-06T12:01:00.000Z',
        })}
        onMarkRead={onMarkRead}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(toast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('explains an unavailable notification with the %s key', async (_name, key) => {
    const user = userEvent.setup();
    render(
      <NotificationItem
        notification={makeOfferWatchNotification({ target_url: null })}
      />,
    );

    screen.getByRole('button').focus();
    await user.keyboard(key);

    expect(toast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    'https://example.com/dashboard/users/watch-owner?highlight=42',
    '//example.com/dashboard/users/watch-owner?highlight=42',
  ])('never follows an external target and gives only neutral feedback: %s', (targetUrl) => {
    const onNavigate = jest.fn();
    render(
      <NotificationItem
        notification={makeOfferWatchNotification({ target_url: targetUrl })}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(toast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
