import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

  it('keeps an unavailable notification disabled', () => {
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
      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(onProfileNavigate).not.toHaveBeenCalled();
      expect(onMarkRead).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', onProfileNavigate);
    }
  });
});
