import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
    type: 'feed_post_liked',
    title: 'Páči sa mi tvoj príspevok',
    body: '',
    is_read: false,
    created_at: new Date().toISOString(),
    data: { post_id: 5 },
    actor: {
      id: 9,
      display_name: 'A$&B',
      slug: 'ab',
      avatar_url: null,
      is_deleted: false,
    },
    target_url: '/dashboard/feed/5',
    ...overrides,
  } as DashboardNotification;
}

describe('NotificationItem – meno aktéra v tele notifikácie', () => {
  it('inserts a name containing $ literally', () => {
    // `$&`, `$1` a spol. majú v replacement STRINGU špeciálny význam – meno by
    // sa tak mohlo rozmnožiť alebo zmrzačiť. Musí sa vložiť doslovne.
    render(<NotificationItem notification={makeNotification()} />);

    expect(screen.getByText(/A\$&B/)).toBeInTheDocument();
    expect(screen.queryByText(/\{name\}/)).not.toBeInTheDocument();
  });

  it('keeps $-names literal for every feed notification type', () => {
    const types = [
      'feed_post_commented',
      'feed_post_tagged',
      'feed_post_shared',
    ] as const;

    types.forEach((type) => {
      const { unmount } = render(
        <NotificationItem notification={makeNotification({ type })} />,
      );
      expect(screen.getByText(/A\$&B/)).toBeInTheDocument();
      unmount();
    });
  });
});
