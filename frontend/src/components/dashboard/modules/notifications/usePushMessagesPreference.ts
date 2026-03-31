'use client';

import { useEffect, useRef, useState } from 'react';

import {
  detectBrowserPushSupport,
  ensureBrowserPushSubscription,
  getBrowserPushPermissionState,
  getCurrentBrowserPushSubscription,
  registerBrowserPushSubscription,
  type PushPermissionState,
  unsubscribeCurrentBrowserFromPush,
} from './pushBrowser';
import { useNotificationPreferences } from './useNotificationPreferences';

type PushSubscriptionStatus = 'checking' | 'subscribed' | 'missing';
const UNREGISTER_WARNING =
  'Push upozornenia boli vypnute, ale odhlasenie tohto prehliadaca sa nepodarilo dokoncit.';

function buildUnsupportedMessage(reason: 'insecure_context' | 'missing_api' | null): string {
  if (reason === 'insecure_context') {
    return 'Push notifikacie su dostupne iba v zabezpecenom prehliadaci.';
  }

  return 'Tento prehliadac nepodporuje push notifikacie.';
}

function buildPermissionMessage(permission: PushPermissionState): string {
  if (permission === 'denied') {
    return 'Push notifikacie su v tomto prehliadaci zablokovane. Povol ich v nastaveniach prehliadaca.';
  }

  return 'Push notifikacie neboli povolene.';
}

export function usePushMessagesPreference() {
  const {
    preferences,
    loading: loadingPreferences,
    savingKey,
    error: preferenceError,
    updatePreference,
  } = useNotificationPreferences();
  const [permission, setPermission] = useState<PushPermissionState>('unsupported');
  const [supportState, setSupportState] = useState(() => detectBrowserPushSupport());
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<PushSubscriptionStatus>('checking');
  const [busyAction, setBusyAction] = useState<'enabling' | 'disabling' | null>(
    null,
  );
  const [browserError, setBrowserError] = useState<string | null>(null);
  const autoSyncAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshBrowserState() {
      const nextSupportState = detectBrowserPushSupport();
      if (cancelled) {
        return;
      }

      setSupportState(nextSupportState);

      if (!nextSupportState.supported) {
        setPermission('unsupported');
        setSubscriptionStatus('missing');
        return;
      }

      const nextPermission = getBrowserPushPermissionState();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        setSubscriptionStatus('missing');
        return;
      }

      try {
        const subscription = await getCurrentBrowserPushSubscription();
        if (!cancelled) {
          setSubscriptionStatus(subscription ? 'subscribed' : 'missing');
        }
      } catch {
        if (!cancelled) {
          setSubscriptionStatus('missing');
        }
      }
    }

    void refreshBrowserState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    autoSyncAttemptedRef.current = false;
  }, [preferences.pushNotifications]);

  useEffect(() => {
    if (loadingPreferences || busyAction !== null) {
      return;
    }

    if (preferenceError) {
      return;
    }

    if (!preferences.pushNotifications) {
      return;
    }

    if (!supportState.supported || permission !== 'granted') {
      return;
    }

    if (subscriptionStatus !== 'missing' || autoSyncAttemptedRef.current) {
      return;
    }

    autoSyncAttemptedRef.current = true;

    void (async () => {
      try {
        const subscription = await ensureBrowserPushSubscription();
        await registerBrowserPushSubscription(subscription);
        setSubscriptionStatus('subscribed');
        setBrowserError(null);
      } catch (error) {
        console.error('Failed to sync browser push subscription:', error);
        setBrowserError(
          'Nepodarilo sa dokoncit registraciu push notifikacii v tomto prehliadaci.',
        );
      }
    })();
  }, [
    busyAction,
    loadingPreferences,
    permission,
    preferenceError,
    preferences.pushNotifications,
    subscriptionStatus,
    supportState.supported,
  ]);

  useEffect(() => {
    if (preferenceError) {
      return;
    }

    if (!preferences.pushNotifications) {
      setBrowserError((current) =>
        current === UNREGISTER_WARNING ? current : null,
      );
      return;
    }

    if (!supportState.supported) {
      setBrowserError(buildUnsupportedMessage(supportState.reason));
      return;
    }

    if (permission === 'denied') {
      setBrowserError(buildPermissionMessage(permission));
      return;
    }

    if (permission === 'granted' && subscriptionStatus === 'missing') {
      setBrowserError(
        'Push notifikacie su zapnute, ale tento prehliadac este nie je zaregistrovany.',
      );
      return;
    }

    setBrowserError(null);
  }, [
    permission,
    preferenceError,
    preferences.pushNotifications,
    subscriptionStatus,
    supportState.reason,
    supportState.supported,
  ]);

  async function enablePushMessages() {
    const nextSupportState = detectBrowserPushSupport();
    setSupportState(nextSupportState);
    setBrowserError(null);

    if (!nextSupportState.supported) {
      setPermission('unsupported');
      setSubscriptionStatus('missing');
      setBrowserError(buildUnsupportedMessage(nextSupportState.reason));
      return;
    }

    setBusyAction('enabling');
    try {
      let nextPermission = getBrowserPushPermissionState();
      setPermission(nextPermission);

      if (nextPermission === 'default') {
        nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
      }

      if (nextPermission !== 'granted') {
        setSubscriptionStatus('missing');
        setBrowserError(buildPermissionMessage(nextPermission));
        return;
      }

      const subscription = await ensureBrowserPushSubscription();
      await registerBrowserPushSubscription(subscription);
      setSubscriptionStatus('subscribed');

      const saved = await updatePreference('pushNotifications', true);
      if (!saved) {
        return;
      }

      setBrowserError(null);
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      setSubscriptionStatus('missing');
      setBrowserError(
        'Nepodarilo sa aktivovat push notifikacie pre tento prehliadac.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function disablePushMessages() {
    setBrowserError(null);
    setBusyAction('disabling');

    const saved = await updatePreference('pushNotifications', false);
    if (!saved) {
      setBusyAction(null);
      return;
    }

    try {
      await unsubscribeCurrentBrowserFromPush();
      setSubscriptionStatus('missing');
    } catch (error) {
      console.error('Failed to unregister browser push subscription:', error);
      setBrowserError(UNREGISTER_WARNING);
    }

    setBusyAction(null);
  }

  return {
    value: preferences.pushNotifications,
    disabled:
      loadingPreferences ||
      savingKey === 'pushNotifications' ||
      busyAction !== null,
    loading:
      loadingPreferences ||
      subscriptionStatus === 'checking' ||
      busyAction !== null,
    error: preferenceError || browserError,
    permission,
    supported: supportState.supported,
    onChange: (enabled: boolean) => {
      if (enabled) {
        void enablePushMessages();
        return;
      }

      void disablePushMessages();
    },
  };
}
