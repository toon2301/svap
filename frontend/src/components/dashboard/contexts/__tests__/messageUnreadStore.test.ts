import {
  acknowledgeMessageUnreadCount,
  bindMessageUnreadCountStoreToUser,
  getMessageUnreadCountStore,
  publishMessageUnreadCount,
  subscribeToMessageUnreadCount,
  syncMessageUnreadCountFromConversations,
} from '../messageUnreadStore';
import type { ConversationListItem } from '@/components/dashboard/modules/messages/types';

function resetStore() {
  delete (globalThis as { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
}

function conversationWithUnread(unreadCount: number): ConversationListItem {
  return {
    id: 9,
    unread_count: unreadCount,
    has_unread: unreadCount > 0,
  } as ConversationListItem;
}

describe('messageUnreadStore', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  it('syncs total unread count from conversations without snapshot', () => {
    syncMessageUnreadCountFromConversations([
      conversationWithUnread(2),
      conversationWithUnread(3),
    ]);

    expect(getMessageUnreadCountStore().unreadCount).toBe(5);
  });

  it('ignores a stale list snapshot that started before a newer authoritative update', () => {
    const snapshotAt = Date.now();
    publishMessageUnreadCount(0);
    syncMessageUnreadCountFromConversations([conversationWithUnread(2)], {
      snapshotAt: snapshotAt - 1,
    });

    expect(getMessageUnreadCountStore().unreadCount).toBe(0);
  });

  it('applies a list snapshot fetched after the last authoritative update', () => {
    publishMessageUnreadCount(0);
    syncMessageUnreadCountFromConversations([conversationWithUnread(4)], {
      snapshotAt: getMessageUnreadCountStore().lastSuccessfulRefreshAt + 1,
    });

    expect(getMessageUnreadCountStore().unreadCount).toBe(4);
  });

  it('notifies listeners only for applied updates, not for ignored stale syncs', () => {
    const received: number[] = [];
    const unsubscribe = subscribeToMessageUnreadCount((count) => received.push(count));

    const staleSnapshotAt = Date.now() - 1;
    publishMessageUnreadCount(0);
    syncMessageUnreadCountFromConversations([conversationWithUnread(7)], {
      snapshotAt: staleSnapshotAt,
    });

    unsubscribe();
    expect(received).toEqual([0]);
  });

  describe('seen-baseline (nav badge)', () => {
    it('hides the nav badge on acknowledge and keeps it hidden while unread stays the same', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(3);

      // Vstup do Správ = acknowledge → badge zhasne...
      acknowledgeMessageUnreadCount();
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);

      // ...a nevráti sa pri ďalšom refreshi s rovnakým počtom (odchod/návrat).
      publishMessageUnreadCount(3, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);
    });

    it('shows the badge again for a new realtime message after acknowledge', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      acknowledgeMessageUnreadCount();
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);

      publishMessageUnreadCount(4, { source: 'realtime' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(1);
    });

    it('keeps the badge hidden after reading (count decreases) once acknowledged', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      acknowledgeMessageUnreadCount();

      publishMessageUnreadCount(1, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);
    });

    it('persists the acknowledged baseline across a hard refresh (localStorage)', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      acknowledgeMessageUnreadCount();
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);

      // Simuluj tvrdý refresh: nová in-memory inštancia store + rebind na usera.
      delete (globalThis as { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
      bindMessageUnreadCountStoreToUser(7);
      // Prvý server refresh vráti stále 3 neprečítané → badge musí ostať skrytý.
      publishMessageUnreadCount(3, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);

      // Nová správa po refreshi → badge sa vráti.
      publishMessageUnreadCount(4, { source: 'realtime' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(1);
    });

    it('shows genuinely new unread that arrived while away (server returns more than baseline)', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      acknowledgeMessageUnreadCount();

      // Reload; medzitým pribudli 2 nové (server vráti 5) → badge ukáže rozdiel.
      delete (globalThis as { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(5, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(2);
    });

    it('scopes the baseline per user', () => {
      bindMessageUnreadCountStoreToUser(7);
      publishMessageUnreadCount(3, { source: 'refresh' });
      acknowledgeMessageUnreadCount();
      expect(getMessageUnreadCountStore().unreadCount).toBe(0);

      // Iný používateľ nezdedí baseline user-a 7.
      bindMessageUnreadCountStoreToUser(99);
      publishMessageUnreadCount(3, { source: 'refresh' });
      expect(getMessageUnreadCountStore().unreadCount).toBe(3);
    });
  });
});
