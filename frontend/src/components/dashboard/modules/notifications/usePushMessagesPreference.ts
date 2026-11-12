'use client';

import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import {
  detectBrowserPushSupport,
  ensureBrowserPushSubscription,
  getBrowserPushPermissionState,
  getCurrentBrowserPushSubscription,
  registerBrowserPushSubscription,
  type PushPermissionState,
  unsubscribeCurrentBrowserFromPush,
} from './pushBrowser';
import {
  isBrowserOffline,
  useNotificationPreferences,
  type NotificationPreferencesController,
} from './useNotificationPreferences';

type PushSubscriptionStatus = 'checking' | 'subscribed' | 'missing';

/** Preklad textu podľa kľúča (rovnaký tvar ako `t` z `useLanguage`). */
type Translate = (key: string, fallback?: string) => string;

/** Text, že tento prehliadač push nepodporuje (nezabezpečený kontext alebo chýbajúce API). */
function buildUnsupportedMessage(
  reason: 'insecure_context' | 'missing_api' | null,
  t: Translate,
): string {
  if (reason === 'insecure_context') {
    return t(
      'notifications.pushUnsupportedInsecure',
      'Push notifikácie sú dostupné iba v zabezpečenom prehliadači.',
    );
  }

  return t('notifications.pushUnsupportedBrowser', 'Tento prehliadač nepodporuje push notifikácie.');
}

/** Text, že povolenie push nie je udelené (zablokované v prehliadači alebo nepovolené). */
function buildPermissionMessage(permission: PushPermissionState, t: Translate): string {
  if (permission === 'denied') {
    return t(
      'notifications.pushPermissionDenied',
      'Push notifikácie sú v tomto prehliadači zablokované. Povoľ ich v nastaveniach prehliadača.',
    );
  }

  return t('notifications.pushPermissionNotGranted', 'Push notifikácie neboli povolené.');
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
 * pod ním). Pri vypnutej voľbe a v ostatných stavoch (napr. povolenie ešte nebolo vyžiadané) vráti `null`. Texty sa
 * prekladajú cez `t` (nález 319).
 */
export function getPassiveBrowserWarning(
  { pushEnabled, supportState, permission, subscriptionStatus }: PassiveWarningInput,
  t: Translate,
): string | null {
  if (!pushEnabled) {
    return null;
  }

  if (!supportState.supported) {
    return buildUnsupportedMessage(supportState.reason, t);
  }

  if (permission === 'denied') {
    return buildPermissionMessage(permission, t);
  }

  if (permission === 'granted' && subscriptionStatus === 'missing') {
    return t(
      'notifications.pushNotRegistered',
      'Push notifikácie sú zapnuté, ale tento prehliadač ešte nie je zaregistrovaný.',
    );
  }

  return null;
}

/**
 * Voľba push upozornení na správy s vlastným načítaním uložených volieb. Pre obrazovku, ktorá potrebuje aj ostatné
 * voľby upozornení zo súboru jedného načítania, slúži `usePushMessagesPreferenceWith`.
 */
export function usePushMessagesPreference() {
  return usePushMessagesPreferenceWith(useNotificationPreferences());
}

/**
 * Voľba push upozornení na správy nad zdieľaným stavom volieb (`controller` z `useNotificationPreferences`). Zisťuje
 * stav prehliadača (podpora, povolenie, existujúci odber) a zapína alebo vypína push vrátane registrácie a zrušenia
 * odberu tohto prehliadača. `loading` pokrýva aj kontrolu prehliadača a ukladanie, `initialLoading` len úvodné
 * načítanie uloženej voľby (nález 286): kontrola prehliadača ho nedrží, aby voľba nezostala navždy v kostre, ak sa
 * service worker neozve. `error` skladá tri zdroje v tomto poradí: chyba uloženia či načítania voľby, chyba po akcii
 * (zapnutie, vypnutie, automatická registrácia; je to stav a trvá do ďalšej akcie) a pasívne varovanie odvodené počas
 * vykresľovania (`getPassiveBrowserWarning`). `disabled` platí aj po zlyhaní načítania voľby. Všetky texty sú preložené
 * (nález 319).
 */
export function usePushMessagesPreferenceWith(controller: NotificationPreferencesController) {
  const { t } = useLanguage();
  const {
    preferences,
    loading: loadingPreferences,
    loadFailed,
    isSaving,
    error: preferenceError,
    updatePreference,
  } = controller;
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

  /**
   * Automatická registrácia odberu: keď je uložená voľba zapnutá, povolenie udelené a tento prehliadač ešte nemá odber,
   * zaregistruje ho (raz po každej zmene voľby). Zlyhanie sa ukáže ako chyba po akcii.
   */
  useEffect(/** Automatická registrácia odberu. */ () => {
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

    /** Zaregistruje odber tohto prehliadača a zapíše výsledok: úspech zruší chybu po akcii, zlyhanie ju nastaví. */
    void (/** Registrácia odberu. */ async () => {
      try {
        const subscription = await ensureBrowserPushSubscription();
        await registerBrowserPushSubscription(subscription);
        setSubscriptionStatus('subscribed');
        setActionError(null);
      } catch (error) {
        console.error('Failed to sync browser push subscription:', error);
        setActionError(
          t(
            'notifications.pushSyncFailed',
            'Nepodarilo sa dokončiť registráciu push notifikácií v tomto prehliadači.',
          ),
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
    t,
  ]);

  /**
   * Zapnutie Správ: overí podporu prehliadača, pri vypnutom internete hneď ukáže chybu (bez vyžiadania povolenia),
   * vyžiada povolenie, vytvorí a zaregistruje odber a až potom uloží voľbu, takže sa voľba neprepne, kým nie je všetko
   * hotové. Každé zlyhanie ukáže chybu po akcii.
   */
  async function enablePushMessages() {
    const nextSupportState = detectBrowserPushSupport();
    setSupportState(nextSupportState);
    setActionError(null);

    if (!nextSupportState.supported) {
      setPermission('unsupported');
      setSubscriptionStatus('missing');
      setActionError(buildUnsupportedMessage(nextSupportState.reason, t));
      return;
    }

    if (isBrowserOffline()) {
      setActionError(
        t('notifications.preferencesOffline', 'Bez pripojenia na internet sa nastavenie nedá zmeniť.'),
      );
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
        setActionError(buildPermissionMessage(nextPermission, t));
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
        t(
          'notifications.pushEnableFailed',
          'Nepodarilo sa aktivovať push notifikácie pre tento prehliadač.',
        ),
      );
    } finally {
      setBusyAction(null);
    }
  }

  /**
   * Vypnutie Správ: najprv uloží voľbu, potom odhlási odber tohto prehliadača. Ak sa odhlásenie nepodarí, voľba ostane
   * vypnutá a ukáže sa varovanie.
   */
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
      setActionError(
        t(
          'notifications.pushUnregisterFailed',
          'Push upozornenia boli vypnuté, ale odhlásenie tohto prehliadača sa nepodarilo dokončiť.',
        ),
      );
    }

    setBusyAction(null);
  }

  const passiveWarning = getPassiveBrowserWarning(
    {
      pushEnabled: preferences.pushNotifications,
      supportState,
      permission,
      subscriptionStatus,
    },
    t,
  );

  return {
    value: preferences.pushNotifications,
    // Po zlyhaní načítania je voľba zakázaná: zobrazená hodnota je len predvolená, nie stav servera.
    disabled:
      loadingPreferences ||
      loadFailed ||
      isSaving('pushNotifications') ||
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
