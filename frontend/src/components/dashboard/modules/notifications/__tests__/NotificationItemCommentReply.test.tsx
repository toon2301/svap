/**
 * Notifikácia „odpoveď na komentár" vo VŠETKÝCH jazykoch.
 *
 * Preklady sa berú zo skutočných jazykových súborov, nie z fallbacku
 * v komponente – keby komponent siahol po kľúči, ktorý v dátach nie je (alebo
 * po ňom nesiahol vôbec a nechal text z backendu), test to odhalí.
 *
 * Práve to bola príčina: FE vetva pre tento typ chýbala, takže sa zobrazoval
 * text uložený backendom, ktorý je vždy po slovensky bez ohľadu na jazyk.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';
import skMessages from '../../../../../../messages/sk.json';
import enMessages from '../../../../../../messages/en.json';
import csMessages from '../../../../../../messages/cs.json';
import plMessages from '../../../../../../messages/pl.json';
import deMessages from '../../../../../../messages/de.json';
import huMessages from '../../../../../../messages/hu.json';

const MESSAGES: Record<string, unknown> = {
  sk: skMessages,
  en: enMessages,
  cs: csMessages,
  pl: plMessages,
  de: deMessages,
  hu: huMessages,
};

/** Aktívny jazyk pre daný test – mock `useLanguage` z neho prekladá. */
let activeLocale = 'sk';

function resolve(locale: string, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      MESSAGES[locale],
    );
  // Chýbajúci kľúč sa NESMIE ticho nahradiť fallbackom – inak by test
  // nerozlíšil „preložené" od „náhodou rovnaký text".
  return typeof value === 'string' ? value : `MISSING:${key}`;
}

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: activeLocale,
    t: (key: string) => resolve(activeLocale, key),
  }),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (url: string) => mockPush(url) }),
}));

function makeReplyNotification(): DashboardNotification {
  return {
    id: 1,
    type: 'feed_post_comment_replied',
    // Backend ukladá vetu v čase vzniku – vždy po slovensky. Práve tá sa
    // predtým zobrazovala všetkým bez ohľadu na jazyk.
    title: 'Odpoveď na komentár',
    body: 'Jana odpovedal na tvoj komentár.',
    data: { post_id: 7, comment_id: 42 },
    actor: {
      id: 12,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: '/dashboard/feed/7?comment=42',
    is_read: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as DashboardNotification;
}

beforeEach(() => {
  mockPush.mockReset();
  activeLocale = 'sk';
});

describe.each(['sk', 'en', 'cs', 'pl', 'de', 'hu'])('jazyk %s', (locale) => {
  it('shows the localized reply text', () => {
    activeLocale = locale;
    render(<NotificationItem notification={makeReplyNotification()} />);

    const expectedBody = resolve(
      locale,
      'notifications.feedPostCommentRepliedBody',
    ).replace('{name}', 'Jana');
    const expectedTitle = resolve(
      locale,
      'notifications.feedPostCommentRepliedTitle',
    );

    // Kľúče musia v jazykových dátach existovať…
    expect(expectedBody).not.toContain('MISSING:');
    expect(expectedTitle).not.toContain('MISSING:');
    // …a komponent musí použiť práve ich.
    expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
      expectedBody,
    );
    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
  });
});

it('keeps the Slovak wording with proper diacritics', () => {
  activeLocale = 'sk';
  render(<NotificationItem notification={makeReplyNotification()} />);

  expect(screen.getByRole('button').querySelector('p')).toHaveTextContent(
    'Jana odpovedal na tvoj komentár.',
  );
  expect(screen.getByText('Odpoveď na komentár')).toBeInTheDocument();
});

it('does not fall back to the text stored by the backend', () => {
  // Nemecký divák nesmie dostať slovenskú vetu z `notification.body`.
  activeLocale = 'de';
  render(<NotificationItem notification={makeReplyNotification()} />);

  expect(
    screen.queryByText('Jana odpovedal na tvoj komentár.'),
  ).not.toBeInTheDocument();
});

it('opens the replied-to comment', async () => {
  activeLocale = 'sk';
  render(<NotificationItem notification={makeReplyNotification()} />);

  screen.getByRole('button').click();

  expect(mockPush).toHaveBeenCalledWith('/dashboard/feed/7?comment=42');
});
