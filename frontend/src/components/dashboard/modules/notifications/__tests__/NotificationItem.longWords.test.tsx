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

/**
 * Dlhé slovo bez medzier (meno, odkaz) nesmie rozšíriť riadok za šírku obrazovky: scrollovateľný
 * kontajner by sa inak dal posúvať do strany a pri šikmom ťahu prsta by zoznam „skákal“.
 * V jsdom sa rozloženie nemeria, preto sa stráži trieda, ktorá slovo zalamuje; skutočné správanie
 * je overené v prehliadači.
 */
function makeNotification(overrides: Partial<DashboardNotification> = {}): DashboardNotification {
  return {
    id: 1,
    type: 'feed_post_liked',
    title: 'Nový like',
    body: '',
    data: {},
    actor: { id: 7, display_name: 'A'.repeat(70), avatar_url: null },
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: '/dashboard/feed',
    is_read: true,
    created_at: '2026-05-06T12:00:00.000Z',
    read_at: '2026-05-06T12:05:00.000Z',
    ...overrides,
  };
}

describe('NotificationItem long words', () => {
  it('lets the text of the notification break inside a very long word', () => {
    render(<NotificationItem notification={makeNotification()} />);

    const text = screen.getByText(/A{70}/).closest('p');
    expect(text).not.toBeNull();
    expect(text).toHaveClass('break-words');
  });

  it('breaks long words in unread notifications too', () => {
    render(<NotificationItem notification={makeNotification({ is_read: false })} />);

    expect(screen.getByText(/A{70}/).closest('p')).toHaveClass('break-words');
  });

  it('keeps the text size and colour of the paragraph', () => {
    render(<NotificationItem notification={makeNotification()} />);

    const text = screen.getByText(/A{70}/).closest('p');
    expect(text).toHaveClass('text-sm', 'text-gray-600');
  });
});
