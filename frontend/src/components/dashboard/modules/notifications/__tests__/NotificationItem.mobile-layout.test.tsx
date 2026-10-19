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
 * Výška riadku upozornenia na mobile.
 *
 * Riadok konverzácie v Správach má 72 px (`py-3.5` + avatar `h-11`), preto riadok upozornenia
 * dostáva rovnakú minimálnu výšku (`min-h-[4.5rem]`) a rovnako veľký avatar. Mobil je základ
 * (bez prefixu), desktop vracia pôvodné hodnoty cez `lg:`. V jsdom sa výška nemeria, preto sa
 * stráži samotné triedy; skutočná výška je overená v prehliadači.
 */
function makeNotification(overrides: Partial<DashboardNotification> = {}): DashboardNotification {
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
    is_read: true,
    created_at: '2026-05-06T12:00:00.000Z',
    read_at: '2026-05-06T12:05:00.000Z',
    ...overrides,
  };
}

function rowClasses(): string[] {
  return screen.getByRole('button').className.split(/\s+/);
}

function avatarClasses(): string[] {
  const avatar = screen.getByRole('button').querySelector('.rounded-full.overflow-hidden');
  expect(avatar).not.toBeNull();
  return (avatar as HTMLElement).className.split(/\s+/);
}

describe('NotificationItem mobile row height', () => {
  it.each([
    ['read', true],
    ['unread', false],
  ])('keeps the %s row at least as tall as a conversation row on mobile', (_label, isRead) => {
    render(<NotificationItem notification={makeNotification({ is_read: isRead })} />);

    expect(rowClasses()).toContain('min-h-[4.5rem]');
  });

  it('gives the row back its natural height on desktop', () => {
    render(<NotificationItem notification={makeNotification()} />);

    expect(rowClasses()).toContain('lg:min-h-0');
  });

  it('keeps the original paddings: mobile base and unchanged desktop values', () => {
    render(<NotificationItem notification={makeNotification()} />);

    const classes = rowClasses();
    expect(classes).toEqual(expect.arrayContaining(['px-2', 'py-1.5', 'lg:px-3', 'lg:py-2.5']));
  });

  it('uses the same 44 px avatar as the conversation row on mobile and 40 px on desktop (initials)', () => {
    render(<NotificationItem notification={makeNotification()} />);

    expect(avatarClasses()).toEqual(expect.arrayContaining(['h-11', 'w-11', 'lg:h-10', 'lg:w-10']));
    expect(avatarClasses()).not.toContain('h-10');
  });

  it('sizes the avatar the same way when the actor has a picture', () => {
    render(
      <NotificationItem
        notification={makeNotification({
          type: 'feed_post_liked',
          actor: { id: 7, display_name: 'Jana Nová', avatar_url: '/media/avatars/7.png' },
        })}
      />,
    );

    expect(avatarClasses()).toEqual(expect.arrayContaining(['h-11', 'w-11', 'lg:h-10', 'lg:w-10']));
  });

  it('does not rely on max-lg variants (they are not generated in this project)', () => {
    render(<NotificationItem notification={makeNotification({ is_read: false })} />);

    expect(rowClasses().some((name) => name.startsWith('max-lg:'))).toBe(false);
    expect(avatarClasses().some((name) => name.startsWith('max-lg:'))).toBe(false);
  });

  it('keeps the colour of read and unread rows', () => {
    const { rerender } = render(<NotificationItem notification={makeNotification()} />);
    expect(rowClasses()).toContain('bg-white');

    rerender(<NotificationItem notification={makeNotification({ is_read: false })} />);
    expect(rowClasses()).toContain('bg-purple-50');
  });
});
