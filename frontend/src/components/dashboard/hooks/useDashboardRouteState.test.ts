import { parseDashboardRouteState } from './useDashboardRouteState';

describe('parseDashboardRouteState', () => {
  it('parses messages conversation and target user ids from the URL', () => {
    const state = parseDashboardRouteState(
      '/dashboard/messages',
      new URLSearchParams('conversationId=12&targetUserId=48'),
    );

    expect(state.initialRoute).toBe('messages');
    expect(state.selectedConversationId).toBe(12);
    expect(state.targetUserIdForMessages).toBe(48);
  });

  it('parses user edit route into own profile sidebar state', () => {
    const state = parseDashboardRouteState('/dashboard/users/test-user/edit');

    expect(state.initialRoute).toBe('profile');
    expect(state.initialProfileSlug).toBe('test-user');
    expect(state.initialViewedUserId).toBeNull();
    expect(state.initialRightItem).toBe('edit-profile');
  });

  it('parses user profile sub-tabs and highlight query', () => {
    const state = parseDashboardRouteState(
      '/dashboard/users/42/posts',
      new URLSearchParams('highlight=77'),
    );

    expect(state.initialRoute).toBe('user-profile');
    expect(state.initialViewedUserId).toBe(42);
    expect(state.initialProfileSlug).toBe('42');
    expect(state.initialProfileTab).toBe('posts');
    expect(state.initialHighlightedSkillId).toBe(77);
  });

  it('parses offer reviews route', () => {
    const state = parseDashboardRouteState('/dashboard/offers/91/reviews');

    expect(state.initialRoute).toBe('offer-reviews');
    expect(state.initialOfferId).toBe(91);
  });
});
