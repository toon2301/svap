import {
  getMessageUnreadCountStore,
  publishMessageUnreadCount,
} from '@/components/dashboard/contexts/messageUnreadStore';
import { refreshMessageUnreadCountFromServer } from './conversationsUnreadSummary';
import { getUnreadMessagesSummary } from './messagingApi';

jest.mock('./messagingApi', () => ({
  __esModule: true,
  getUnreadMessagesSummary: jest.fn(),
}));

function resetStore() {
  delete (globalThis as { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
}

describe('refreshMessageUnreadCountFromServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it('publishes the total from the server summary', async () => {
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 7 });

    await refreshMessageUnreadCountFromServer(Date.now());

    expect(getMessageUnreadCountStore().unreadCount).toBe(7);
    expect(getMessageUnreadCountStore().rawUnreadCount).toBe(7);
  });

  it('drops the summary when a fresher update arrived after the refresh started', async () => {
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 7 });
    const snapshotAt = Date.now() - 50;
    publishMessageUnreadCount(0);

    await refreshMessageUnreadCountFromServer(snapshotAt);

    expect(getMessageUnreadCountStore().unreadCount).toBe(0);
  });

  it('publishes when the last update is older than the refresh', async () => {
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 3 });
    publishMessageUnreadCount(9);
    const snapshotAt = getMessageUnreadCountStore().lastSuccessfulRefreshAt;

    await refreshMessageUnreadCountFromServer(snapshotAt);

    expect(getMessageUnreadCountStore().unreadCount).toBe(3);
  });

  it('keeps the current badge and does not throw when the summary fails', async () => {
    (getUnreadMessagesSummary as jest.Mock).mockRejectedValue(new Error('network'));
    publishMessageUnreadCount(4);

    await expect(refreshMessageUnreadCountFromServer(Date.now() + 1000)).resolves.toBeUndefined();

    expect(getMessageUnreadCountStore().unreadCount).toBe(4);
  });
});
