import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';
import skMessages from '../../../../../../messages/sk.json';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

/**
 * Kľúče, ktoré testy overujú menovite, sa prekladajú zo SKUTOČNÝCH slovenských
 * dát – nie z fallbacku v komponente. Keby komponent siahol po kľúči, ktorý
 * v jazykových súboroch neexistuje, fallback by chybu zakryl; takto sa
 * z takého kľúča stane `MISSING:...` a asercia padne.
 */
const SK_NAMESPACES_UNDER_TEST = [
  'notifications.offerWatchMatch',
  'notifications.feedPostCommentReplied',
];

function resolveSlovak(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      skMessages,
    );
  return typeof value === 'string' ? value : `MISSING:${key}`;
}

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (key: string, fallback: string) =>
      // Celá menovka, nie zoznam kľúčov: preklep v názve kľúča tak neprepadne
      // na fallback, ale skončí ako `MISSING:...`.
      SK_NAMESPACES_UNDER_TEST.some((prefix) => key.startsWith(prefix))
        ? resolveSlovak(key)
        : fallback,
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

  it('keeps an unavailable non-offer-watch notification disabled', () => {
    render(<NotificationItem notification={makeNotification({ target_url: null })} />);

    expect(screen.getByRole('button')).toBeDisabled();
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

  it.each([
    [
      false,
      'Watch Owner pridal novú ponuku, ktorá zodpovedá tvojmu sledovaniu.',
    ],
    [
      true,
      'Watch Owner pridal nový dopyt, ktorý zodpovedá tvojmu sledovaniu.',
    ],
  ])(
    'renders a localized offer-watch match when offer_is_seeking=%s',
    (offerIsSeeking, expectedBody) => {
      const callOrder: string[] = [];
      const onNavigate = jest.fn();
      const onMarkRead = jest.fn(() => {
        callOrder.push('read');
      });
      const onProfileNavigate = jest.fn(() => {
        callOrder.push('navigate');
      });
      const notification = makeNotification({
        type: 'offer_watch_match',
        title: 'Backend fallback title',
        body: 'Backend fallback body',
        data: {
          offer_id: 42,
          offer_is_seeking: offerIsSeeking,
        },
        target_url: '/dashboard/users/watch-owner?highlight=42',
        actor: {
          id: 12,
          display_name: 'Watch Owner',
          slug: 'watch-owner',
          user_type: 'individual',
          avatar_url: null,
        },
      });

      window.addEventListener('goToUserProfile', onProfileNavigate);
      render(
        <NotificationItem
          notification={notification}
          onNavigate={onNavigate}
          onMarkRead={onMarkRead}
        />,
      );

      expect(screen.getByText('Nová zhoda sledovania')).toBeInTheDocument();
      expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
        expectedBody,
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onProfileNavigate).toHaveBeenCalledTimes(1);
      expect((onProfileNavigate.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
        identifier: 'watch-owner',
        highlightId: 42,
      });
      expect(callOrder).toEqual(['navigate', 'read']);
      expect(onMarkRead).toHaveBeenCalledWith(notification);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      window.removeEventListener('goToUserProfile', onProfileNavigate);
    },
  );

  it('renders portfolio like notifications and navigates to portfolio detail', () => {
    const notification = makeNotification({
      type: 'portfolio_liked',
      title: '',
      body: '',
      target_url: '/dashboard/users/5/portfolio/44',
      actor: {
        id: 8,
        display_name: 'Portfolio Fan',
        slug: 'portfolio-fan',
        user_type: 'individual',
        avatar_url: null,
      },
    });

    render(<NotificationItem notification={notification} />);

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Portfolio Fan oznacil tvoje portfolio ako paci sa mi.',
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/5/portfolio/44');
  });
  it('renders profile like notifications and navigates to actor profile', () => {
    const notification = makeNotification({
      type: 'profile_liked',
      title: '',
      body: '',
      target_url: '/dashboard/users/profile-fan',
      actor: {
        id: 9,
        display_name: 'Profile Fan',
        slug: 'profile-fan',
        user_type: 'individual',
        avatar_url: null,
      },
    });

    render(<NotificationItem notification={notification} />);

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Profile Fan oznacil tvoj profil ako paci sa mi.',
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/profile-fan');
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

  it('zobrazí "Zmazaný používateľ" pre anonymizovaného aktéra (is_deleted), nie surové meno', () => {
    const notification = makeNotification({
      type: 'review_created',
      title: '',
      body: '',
      actor: {
        id: 10,
        display_name: '', // BE vracia prázdne meno pre zmazaný účet
        slug: null,
        user_type: 'individual',
        avatar_url: null,
        is_deleted: true,
      },
    });

    render(<NotificationItem notification={notification} />);

    const text = screen.getByRole('button').querySelector('p');
    expect(text).toHaveTextContent('Zmazaný používateľ napísal recenziu na tvoju kartu.');
    // Technický placeholder sa nikdy nezobrazí.
    expect(text?.textContent ?? '').not.toContain('deleted-user-');
  });

  it('zobrazí skutočné meno bežného (nezmazaného) aktéra bez zmeny', () => {
    const notification = makeNotification({
      type: 'review_created',
      title: '',
      body: '',
      actor: {
        id: 11,
        display_name: 'Real User',
        slug: 'real-user',
        user_type: 'individual',
        avatar_url: null,
        is_deleted: false,
      },
    });

    render(<NotificationItem notification={notification} />);

    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      'Real User napísal recenziu na tvoju kartu.',
    );
  });
});
