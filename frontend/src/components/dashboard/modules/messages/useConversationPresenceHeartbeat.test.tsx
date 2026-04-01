import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';
import { updateMessagingPresence } from './messagingApi';

jest.mock('./messagingApi', () => ({
  __esModule: true,
  updateMessagingPresence: jest.fn(() => Promise.resolve()),
}));

function PresenceHeartbeatHarness({ conversationId }: { conversationId: number }) {
  useConversationPresenceHeartbeat(conversationId);
  return null;
}

describe('useConversationPresenceHeartbeat', () => {
  const mockedUpdateMessagingPresence = updateMessagingPresence as jest.MockedFunction<
    typeof updateMessagingPresence
  >;
  let visibilityState: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    jest.useFakeTimers();
    mockedUpdateMessagingPresence.mockClear();
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sends an immediate visible heartbeat and repeats it on the interval', async () => {
    render(<PresenceHeartbeatHarness conversationId={9} />);

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledWith({
        visible: true,
        activeConversationId: 9,
      });
    });

    act(() => {
      jest.advanceTimersByTime(25_000);
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(2);
    });
  });

  it('sends hidden presence when the document becomes hidden and restores visible heartbeat later', async () => {
    render(<PresenceHeartbeatHarness conversationId={14} />);

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledWith({
        visible: true,
        activeConversationId: 14,
      });
    });

    act(() => {
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledWith({
        visible: false,
        activeConversationId: null,
      });
    });

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenLastCalledWith({
        visible: true,
        activeConversationId: 14,
      });
    });
  });

  it('sends a hidden presence update on unmount', async () => {
    const view = render(<PresenceHeartbeatHarness conversationId={22} />);

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledWith({
        visible: true,
        activeConversationId: 22,
      });
    });

    view.unmount();

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenLastCalledWith({
        visible: false,
        activeConversationId: null,
      });
    });
  });

  it('stops retrying heartbeat updates when the presence endpoint is unavailable', async () => {
    mockedUpdateMessagingPresence.mockRejectedValueOnce({
      response: { status: 404 },
    });

    render(<PresenceHeartbeatHarness conversationId={31} />);

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(1);
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledWith({
        visible: true,
        activeConversationId: 31,
      });
    });

    act(() => {
      jest.advanceTimersByTime(25_000);
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(1);
    });
  });
});
