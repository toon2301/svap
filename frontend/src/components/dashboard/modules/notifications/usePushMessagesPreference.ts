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

/** Stav prehliadača, z ktorého sa odvodzuje pasívne varovanie. */
type PassiveWarningInput = {
  /** Uložená voľba Správ („Zapnuté“ = `true`). */
  pushEnabled: boolean;
  supportState: ReturnType<typeof detectBrowserPushSupport>;
  permission: PushPermissionState;
  subscriptionStatus: PushSubscriptionStatus;
};

/**
 * Pasívne varovanie pod voľbou Správy (nález 308): uložená voľba je „Zapnuté“, no prehliadač push nepodporuje, má ho
 * zablokovaný, alebo tento prehliadač nie je zaregistrovaný. Počíta sa čisto zo stavu počas vykresľovania, nie v efekte,
 * takže varovanie je už v tom istom vykreslení ako riadky voľby a neprichádza o snímok neskôr (inak by posunulo obsah
 * pod ním). Pri vypnutej voľbe a v ostatných stavoch (napr. povolenie ešte nebolo vyžiadané) vráti `null`.
 */
export function getPassiveBrowserWarning({
  pushEnabled,
  supportState,
  permission,
  subscriptionStatus,
}: PassiveWarningInput): string | null {
  if (!pushEnabled) {
    return null;
  }

  if (!supportState.supported) {
    return buildUnsupportedMessage(supportState.reason);
  }

  if (permission === 'denied') {
    return buildPermissionMessage(permission);
  }

  if (permission === 'granted' && subscriptionStatus === 'missing') {
    return 'Push notifikacie su zapnute, ale tento prehliadac este nie je zaregistrovany.';
  }

  return null;
}

/**
 * Voľba push upozornení na správy. Načíta uloženú voľbu, zisťuje stav prehliadača (podpora, povolenie, existujúci
 * odber) a zapína alebo vypína push vrátane registrácie a zrušenia odberu tohto prehliadača. `loading` pokrýva aj
 * kontrolu prehliadača a ukladanie, `initialLoading` len úvodné načítanie uloženej voľby (nález 286): kontrola
 * prehliadača ho nedrží, aby voľba nezostala navždy v kostre, ak sa service worker neozve. `error` skladá tri zdroje
 * v tomto poradí: chyba uloženia či načítania voľby, chyba po akcii (zapnutie, vypnutie, automatická registrácia; je to
 * stav a trvá do ďalšej akcie) a pasívne varovanie odvodené počas vykresľovania (`getPassiveBrowserWarning`).
 */
export function usePushMessagesPreference() {
  const {
    preferences,
    loading: loadingPreferences,
    savingKey,
    error: preferenceError,
    updatePreference,
  } = useNotificationPreferences();
  const [permission, setPermission] = useState<PushPermissionState>(() => getBrowserPushPermissionState());
  const [supportState, setSupportState] = useState(() => detectBrowserPushSupport());
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<PushSubscriptionStatus>('checking');
  const [busyAction, setBusyAction] = useState<'enabling' | 'disabling' | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
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
        setActionError(null);
      } catch (error) {
        console.error('Failed to sync browser push subscription:', error);
        setActionError(
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

  async function enablePushMessages() {
    const nextSupportState = detectBrowserPushSupport();
    setSupportState(nextSupportState);
    setActionError(null);

    if (!nextSupportState.supported) {
      setPermission('unsupported');
      setSubscriptionStatus('missing');
      setActionError(buildUnsupportedMessage(nextSupportState.reason));
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
        setActionError(buildPermissionMessage(nextPermission));
        return;
      }

      const subscription = await ensureBrowserPushSubscription();
      await registerBrowserPushSubscription(subscription);
      setSubscriptionStatus('subscribed');

      const saved = await updatePreference('pushNotifications', true);
      if (!saved) {
        return;
      }

      setActionError(null);
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      setSubscriptionStatus('missing');
      setActionError(
        'Nepodarilo sa aktivovat push notifikacie pre tento prehliadac.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function disablePushMessages() {
    setActionError(null);
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
      setActionError(UNREGISTER_WARNING);
    }

    setBusyAction(null);
  }

  const passiveWarning = getPassiveBrowserWarning({
    pushEnabled: preferences.pushNotifications,
    supportState,
    permission,
    subscriptionStatus,
  });

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
    // Len úvodné načítanie uloženej voľby (nález 286). Kontrola prehliadača sem schválne nepatrí: keby sa service worker
    // nikdy neozval, voľba by zostala navždy len ako kostra.
    initialLoading: loadingPreferences,
    error: preferenceError || actionError || passiveWarning,
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
