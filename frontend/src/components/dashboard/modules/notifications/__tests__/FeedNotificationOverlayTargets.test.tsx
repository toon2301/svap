/**
 * Feedové notifikácie → okno detailu, nie navigácia.
 *
 * Overuje sa spojenie oboch koncov: položka notifikácie odovzdá `target_url`
 * dashboardu (namiesto vlastného `router.push`) a dashboard z nej rozpozná
 * príspevok, ktorý má otvoriť v okne. Testuje sa VŠETKÝCH šesť feedových
 * typov, lebo prepnutie na okno platí pre všetky naraz.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationItem from '../NotificationItem';
import type { DashboardNotification } from '../types';
import { parseFeedPostTargetUrl } from '../../feed/feedPostRouting';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (url: string) => mockPush(url) }),
}));

function makeNotification(
  type: string,
  targetUrl: string,
): DashboardNotification {
  return {
    id: 1,
    type,
    title: 'Notifikácia',
    body: 'Jana niečo urobila.',
    data: { post_id: 7 },
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
    target_url: targetUrl,
    is_read: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as DashboardNotification;
}

beforeEach(() => {
  mockPush.mockReset();
});

describe.each([
  ['feed_post_liked', '/dashboard/feed/7', 7, null],
  ['feed_post_commented', '/dashboard/feed/7?comment=42', 7, 42],
  ['feed_post_comment_replied', '/dashboard/feed/7?comment=99', 7, 99],
  ['feed_post_comment_liked', '/dashboard/feed/7?comment=5', 7, 5],
  ['feed_post_tagged', '/dashboard/feed/7', 7, null],
  ['feed_post_shared', '/dashboard/feed/7', 7, null],
])('%s', (type, targetUrl, postId, commentId) => {
  it('hands the post over to the dashboard instead of navigating', () => {
    const onNavigate = jest.fn();
    render(
      <NotificationItem
        notification={makeNotification(type, targetUrl)}
        onNavigate={onNavigate}
      />,
    );

    screen.getByRole('button').click();

    expect(onNavigate).toHaveBeenCalledWith(targetUrl);
    // Navigácia by odmountovala to, nad čím má okno ležať.
    expect(mockPush).not.toHaveBeenCalled();
    // A dashboard z tej adresy naozaj vie, čo otvoriť.
    expect(parseFeedPostTargetUrl(targetUrl)).toEqual({
      postId,
      highlightCommentId: commentId,
    });
  });
});

it('still navigates for notifications outside the feed', () => {
  render(
    <NotificationItem
      notification={makeNotification('message_received', '/dashboard/messages/3')}
    />,
  );

  screen.getByRole('button').click();

  expect(mockPush).toHaveBeenCalledWith('/dashboard/messages/3');
  expect(parseFeedPostTargetUrl('/dashboard/messages/3')).toBeNull();
});
