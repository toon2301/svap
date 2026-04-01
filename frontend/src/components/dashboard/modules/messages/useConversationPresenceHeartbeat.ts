'use client';

import { useEffect, useRef } from 'react';

import { ensureFreshSessionForBackgroundWork, isSessionFreshEnough } from '@/lib/api';
import { updateMessagingPresence } from './messagingApi';

const HEARTBEAT_INTERVAL_MS = 25_000;
const DUPLICATE_SEND_SUPPRESSION_MS = 5_000;
const RESUME_FORCE_SUPPRESSION_MS = 1_250;

type PresenceState = {
  visible: boolean;
  activeConversationId: number | null;
  sentAt: number;
};

function shouldDisablePresenceHeartbeat(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

export function useConversationPresenceHeartbeat(conversationId: number): void {
  const lastSentRef = useRef<PresenceState | null>(null);
  const presenceUnavailableRef = useRef(false);
  const lastForcedVisibleSyncAtRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    let intervalId: number | null = null;

    const sendPresence = (
      visible: boolean,
      activeConversationId: number | null,
      { force = false }: { force?: boolean } = {},
    ) => {
      if (presenceUnavailableRef.current) {
        return;
      }

      const now = Date.now();
      const lastSent = lastSentRef.current;
      if (
        !force &&
        lastSent &&
        lastSent.visible === visible &&
        lastSent.activeConversationId === activeConversationId &&
        now - lastSent.sentAt < DUPLICATE_SEND_SUPPRESSION_MS
      ) {
        return;
      }

      if (
        visible &&
        force &&
        lastSent &&
        lastSent.visible === true &&
        lastSent.activeConversationId === activeConversationId &&
        now - lastForcedVisibleSyncAtRef.current < RESUME_FORCE_SUPPRESSION_MS
      ) {
        return;
      }

      const nextState = { visible, activeConversationId, sentAt: now };
      lastSentRef.current = nextState;
      if (visible && force) {
        lastForcedVisibleSyncAtRef.current = now;
      }

      void (async () => {
        if (visible) {
          const sessionState = await ensureFreshSessionForBackgroundWork({
            minValidityMs: HEARTBEAT_INTERVAL_MS + 5_000,
          });
          if (sessionState === 'invalid_session' || sessionState === 'transient_failure') {
            return;
          }
        } else if (!isSessionFreshEnough()) {
          return;
        }

        await updateMessagingPresence({
          visible,
          activeConversationId,
        });
      })().catch((error) => {
        if (shouldDisablePresenceHeartbeat(error)) {
          presenceUnavailableRef.current = true;
          stopHeartbeat();
        }
        // fail-open: push suppression must not break chat UX
      });
    };

    const stopHeartbeat = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      intervalId = window.setInterval(() => {
        if (document.visibilityState !== 'visible') {
          return;
        }
        sendPresence(true, conversationId);
      }, HEARTBEAT_INTERVAL_MS);
    };

    const syncPresenceWithVisibility = ({ force = false }: { force?: boolean } = {}) => {
      if (document.visibilityState === 'visible') {
        sendPresence(true, conversationId, { force });
        startHeartbeat();
        return;
      }

      stopHeartbeat();
      sendPresence(false, null, { force });
    };

    const handleVisibilityChange = () => {
      syncPresenceWithVisibility({ force: true });
    };

    const handleWindowFocus = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastForcedVisibleSyncAtRef.current < RESUME_FORCE_SUPPRESSION_MS) {
          return;
        }
        sendPresence(true, conversationId, { force: true });
      }
    };

    syncPresenceWithVisibility({ force: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      sendPresence(false, null, { force: true });
    };
  }, [conversationId]);
}
