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
    target_url: '/dashboard/offers/12/reviews?review_id=99',
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
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/offers/12/reviews?review_id=99');
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
    expect(mockPush).toHaveBeenCalledWith('/dashboard/offers/12/reviews?review_id=99');
  });

  it('renders review reply notifications and navigates to offer reviews', () => {
    const notification = makeNotification({
      type: 'review_reply_created',
      title: '',
      body: '',
      target_url: '/dashboard/offers/12/reviews?review_id=99&modal=owner_response',
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

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Owner User odpovedal na tvoju recenziu.',
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onMarkRead).toHaveBeenCalledWith(notification);
    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/offers/12/reviews?review_id=99&modal=owner_response',
    );
  });

  it('renders review like notifications and navigates to offer reviews', () => {
    const notification = makeNotification({
      type: 'review_liked',
      title: '',
      body: '',
      actor: {
        id: 3,
        display_name: 'Like User',
        slug: 'like-user',
        user_type: 'individual',
        avatar_url: null,
      },
    });

    render(<NotificationItem notification={notification} />);

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Like User označil tvoju recenziu ako páči sa mi.',
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/offers/12/reviews?review_id=99');
  });

  it('renders offer like notifications and navigates to highlighted own profile offer back side', () => {
    const notification = makeNotification({
      type: 'offer_liked',
      title: '',
      body: '',
      target_url: '/dashboard/profile?highlight=12&side=back',
      actor: {
        id: 6,
        display_name: 'Offer Fan',
        slug: 'offer-fan',
        user_type: 'individual',
        avatar_url: null,
      },
    });

    render(<NotificationItem notification={notification} />);

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Offer Fan označil tvoju ponuku ako páči sa mi.',
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/profile?highlight=12&side=back');
  });

  it('uses help-offer copy for accepted and rejected request decisions', () => {
    const actor = {
      id: 7,
      display_name: 'Owner User',
      slug: 'owner-user',
      user_type: 'individual',
      avatar_url: null,
    };

    const { rerender } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'skill_request_accepted',
          title: 'Žiadosť prijatá',
          body: 'Owner User prijal tvoju žiadosť.',
          data: { request_kind: 'help_offer' },
          actor,
        })}
      />,
    );

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Owner User prijal tvoju ponuku pomoci.',
    );

    rerender(
      <NotificationItem
        notification={makeNotification({
          type: 'skill_request_rejected',
          title: 'Žiadosť odmietnutá',
          body: 'Owner User odmietol tvoju žiadosť.',
          data: { request_kind: 'help_offer' },
          actor,
        })}
      />,
    );

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Owner User odmietol tvoju ponuku pomoci.',
    );
  });

  it('renders actor avatar image when provided', () => {
    const notification = makeNotification({
      actor: {
        id: 4,
        display_name: 'Photo User',
        slug: 'photo-user',
        user_type: 'individual',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    });

    render(<NotificationItem notification={notification} />);

    const image = screen.getByRole('img', { name: 'Photo User' });
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(image).toHaveAttribute('referrerPolicy', 'no-referrer');
  });

  it('falls back to actor initials when avatar image fails', () => {
    const notification = makeNotification({
      actor: {
        id: 5,
        display_name: 'Fallback User',
        slug: 'fallback-user',
        user_type: 'individual',
        avatar_url: 'https://example.com/missing.jpg',
      },
    });

    render(<NotificationItem notification={notification} />);

    fireEvent.error(screen.getByRole('img', { name: 'Fallback User' }));

    expect(screen.getByText('FU')).toBeInTheDocument();
  });

  it('uses a safe fallback when notification actor is missing', () => {
    render(<NotificationItem notification={makeNotification({ actor: null })} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
