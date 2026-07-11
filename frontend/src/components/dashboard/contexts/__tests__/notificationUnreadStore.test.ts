import {
  acknowledgeNotificationUnreadCount,
  bindNotificationUnreadCountStoreToUser,
  getNotificationUnreadCountStore,
  publishNotificationUnreadCount,
} from '../notificationUnreadStore';

function resetStore() {
  delete (globalThis as { __SWAPLY_NOTIF_UNREAD_STORE__?: unknown }).__SWAPLY_NOTIF_UNREAD_STORE__;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
}

describe('notificationUnreadStore seen-baseline persistence', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  it('hides the badge on acknowledge and keeps it hidden across a hard refresh', () => {
    bindNotificationUnreadCountStoreToUser(7);
    publishNotificationUnreadCount(4, { source: 'refresh' });
    expect(getNotificationUnreadCountStore().unreadCount).toBe(4);

    // Otvorenie panela = acknowledge → badge zhasne (klientsky).
    acknowledgeNotificationUnreadCount();
    expect(getNotificationUnreadCountStore().unreadCount).toBe(0);

    // Tvrdý refresh: nová in-memory inštancia + rebind; server stále hlási 4
    // neprečítané (otvorenie panela ich neoznačilo prečítané na serveri).
    delete (globalThis as { __SWAPLY_NOTIF_UNREAD_STORE__?: unknown }).__SWAPLY_NOTIF_UNREAD_STORE__;
    bindNotificationUnreadCountStoreToUser(7);
    publishNotificationUnreadCount(4, { source: 'refresh' });

    // Badge sa už NEvráti (predtým sa vracal, lebo acknowledge žil len v pamäti).
    expect(getNotificationUnreadCountStore().unreadCount).toBe(0);
  });

  it('shows the badge again for a new realtime notification after acknowledge', () => {
    bindNotificationUnreadCountStoreToUser(7);
    publishNotificationUnreadCount(4, { source: 'refresh' });
    acknowledgeNotificationUnreadCount();

    publishNotificationUnreadCount(5, { source: 'realtime' });
    expect(getNotificationUnreadCountStore().unreadCount).toBe(1);
  });

  it('shows new notifications that arrived while away after a refresh', () => {
    bindNotificationUnreadCountStoreToUser(7);
    publishNotificationUnreadCount(4, { source: 'refresh' });
    acknowledgeNotificationUnreadCount();

    delete (globalThis as { __SWAPLY_NOTIF_UNREAD_STORE__?: unknown }).__SWAPLY_NOTIF_UNREAD_STORE__;
    bindNotificationUnreadCountStoreToUser(7);
    publishNotificationUnreadCount(6, { source: 'refresh' });
    expect(getNotificationUnreadCountStore().unreadCount).toBe(2);
  });
});
