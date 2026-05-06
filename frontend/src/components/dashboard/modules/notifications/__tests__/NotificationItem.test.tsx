import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback: string) => fallback,
  }),
}));

function makeNotification(
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification {
  return {
    id: 1,
    type: 'review_created',
    title: 'Nova recenzia',
    body: 'Pouzivatel napisal recenziu.',
    data: {},
    actor: null,
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: '/dashboard/offers/12/reviews',
    is_read: false,
    created_at: '2026-05-06T12:00:00.000Z',
    read_at: null,
    ...overrides,
  };
}

describe('NotificationItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks an unread notification read before delegating navigation', () => {
    const notification = makeNotification();
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onMarkRead).toHaveBeenCalledWith(notification);
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/offers/12/reviews');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not mark an already read notification again', () => {
    const notification = makeNotification({
      is_read: true,
      read_at: '2026-05-06T12:01:00.000Z',
    });
    const onMarkRead = jest.fn();

    render(<NotificationItem notification={notification} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/dashboard/offers/12/reviews');
  });

  it('renders review reply notifications and navigates to offer reviews', () => {
    const notification = makeNotification({
      type: 'review_reply_created',
      title: '',
      body: '',
      actor: {
        id: 2,
        display_name: 'Owner User',
        slug: 'owner-user',
        user_type: 'company',
        avatar_url: null,
      },
    });
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText('Odpoveď na recenziu')).toBeInTheDocument();
    expect(screen.getByText('Owner User odpovedal na tvoju recenziu.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(onMarkRead).toHaveBeenCalledWith(notification);
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/offers/12/reviews');
  });
});
