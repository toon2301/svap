import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

import { ensureFreshSessionForBackgroundWork, isSessionFreshEnough } from '@/lib/api';
import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';
import { updateMessagingPresence } from './messagingApi';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
  isSessionFreshEnough: jest.fn(() => true),
}));

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
  const mockedEnsureFreshSessionForBackgroundWork =
    ensureFreshSessionForBackgroundWork as jest.MockedFunction<
      typeof ensureFreshSessionForBackgroundWork
    >;
  const mockedIsSessionFreshEnough = isSessionFreshEnough as jest.MockedFunction<
    typeof isSessionFreshEnough
  >;
  let visibilityState: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    jest.useFakeTimers();
    mockedUpdateMessagingPresence.mockClear();
    mockedEnsureFreshSessionForBackgroundWork.mockResolvedValue('ready');
    mockedIsSessionFreshEnough.mockReturnValue(true);
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

  it('suppresses a duplicate forced visible sync when visibilitychange is immediately followed by focus', async () => {
    render(<PresenceHeartbeatHarness conversationId={41} />);

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(1);
    });

    act(() => {
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(2);
    });

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(mockedUpdateMessagingPresence).toHaveBeenCalledTimes(3);
    });
  });
});
