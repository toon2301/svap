'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';

import {
  mapApiPayloadToState,
  mapStatePatchToApiPatch,
  DEFAULT_PREFERENCES,
  PREFERENCE_API_KEYS,
  type NotificationPreferenceKey,
  type NotificationPreferencesApiPayload,
  type NotificationPreferencesState,
} from './notificationPreferenceKeys';

export type { NotificationPreferenceKey, NotificationPreferencesState };

/** Nastavenia jednej zmeny voľby. */
export interface UpdatePreferenceOptions {
  /**
   * Prevezme chybu uloženia (aj pri vypnutom internete), napr. na toast, namiesto poľa `error` hooku. Bez nej sa
   * chyba ukáže cez `error` (riadok pod voľbou Správy).
   */
  onError?: (message: string) => void;
}

/** Požiadavka na uloženie jednej voľby, ktorá práve beží (jedna na voľbu; neskoršia zmena ju nahradí). */
interface SaveRequest {
  id: number;
  value: boolean;
  promise: Promise<boolean>;
}

/** Výsledok `useNotificationPreferences`: spoločný stav, ktorý zdieľajú Správy, hlavný vypínač a kategórie. */
export type NotificationPreferencesController = ReturnType<typeof useNotificationPreferences>;

/**
 * Prehliadač hlási, že nemá internet (`navigator.onLine === false`). Na iOS nie je spoľahlivý (hlási `true` aj bez
 * spojenia), preto je to len doplnok: pri zlyhaní požiadavky sa hodnota aj tak vráti.
 */
export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Voľby upozornení zo servera (sedem hodnôt) s optimistickým ukladaním po jednej voľbe (nálezy 321 a 319).
 *
 * Zmena jednej voľby pošle `PATCH` len s jej kľúčom (server odmietne každý neznámy kľúč), hodnotu v rozhraní prepne hneď
 * a po zlyhaní vráti len túto voľbu na poslednú potvrdenú hodnotu, nie celý predchádzajúci stav, takže neprepíše inú,
 * medzitým uloženú zmenu. Z odpovede servera sa použije len uložená voľba. Pri vypnutom internete sa nič neodošle,
 * hodnota sa nezmení a hneď sa ukáže preložená chyba. Rovnaká zmena, ktorá už beží, sa neposiela znova (stlačenie aj
 * kliknutie na ten istý riadok), a zmena na hodnotu, ktorú voľba už má, nespraví nič. Pri dvoch zmenách tej istej voľby
 * rozhoduje neskoršia a výsledok staršej sa ignoruje. Časový limit požiadavky ostáva globálny (`lib/api.ts`).
 *
 * `loading` platí len pre úvodné načítanie, `loadFailed` pre jeho zlyhanie (hodnoty sú vtedy predvolené, nie zo servera),
 * `isSaving(key)` pre rozpracovanú zmenu danej voľby. `error` nesie chybu načítania alebo uloženia, ktorá nešla cez
 * `onError`.
 */
export function useNotificationPreferences() {
  const { t } = useLanguage();
  const [confirmed, setConfirmed] = useState<NotificationPreferencesState>(DEFAULT_PREFERENCES);
  const [pending, setPending] = useState<Partial<NotificationPreferencesState>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const requestsRef = useRef<Partial<Record<NotificationPreferenceKey, SaveRequest>>>({});
  const requestCounterRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    /** Načíta uložené voľby; pri zlyhaní zapne `loadFailed`. */
    async function loadPreferences() {
      try {
        const response = await api.get<NotificationPreferencesApiPayload>(
          endpoints.push.preferences,
        );
        if (!cancelled) {
          setConfirmed(mapApiPayloadToState(response.data));
        }
      } catch (loadError) {
        console.error('Failed to load notification preferences:', loadError);
        if (!cancelled) {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Zobrazené hodnoty: posledné potvrdené, prekryté rozpracovanými zmenami. */
  const preferences = useMemo(() => ({ ...confirmed, ...pending }), [confirmed, pending]);

  /** Ukladá sa zmena tejto voľby (požiadavka ešte neskončila). */
  function isSaving(key: NotificationPreferenceKey): boolean {
    return pending[key] !== undefined;
  }

  /**
   * Zmení jednu voľbu (pozri hlavičku hooku). Vráti `true`, ak je voľba po volaní uložená (alebo už mala danú hodnotu),
   * `false`, ak sa nič neuložilo (chyba, vypnutý internet, voľby ešte nie sú načítané, zmenu nahradila neskoršia).
   */
  async function updatePreference(
    key: NotificationPreferenceKey,
    value: boolean,
    options: UpdatePreferenceOptions = {},
  ): Promise<boolean> {
    if (loading || loadFailed) {
      return false;
    }

    const running = requestsRef.current[key];
    if (running?.value === value) {
      return running.promise;
    }
    if (!running && preferences[key] === value) {
      return true;
    }

    /** Ukáže chybu cez `onError` volajúceho, inak cez `error` hooku; vráti `false` ako výsledok zmeny. */
    const reportFailure = (message: string): false => {
      if (options.onError) {
        options.onError(message);
      } else {
        setSaveError(message);
      }
      return false;
    };

    if (isBrowserOffline()) {
      return reportFailure(
        t('notifications.preferencesOffline', 'Bez pripojenia na internet sa nastavenie nedá zmeniť.'),
      );
    }

    const id = requestCounterRef.current + 1;
    requestCounterRef.current = id;
    setPending((current) => ({ ...current, [key]: value }));
    if (!options.onError) {
      setSaveError(null);
    }

    /** Táto požiadavka je stále najnovšia pre danú voľbu (neskoršia zmena ju nenahradila). */
    const isLatest = () => requestsRef.current[key]?.id === id;
    /** Ukončí požiadavku: odstráni ju z bežiacich a rozpracovanú hodnotu zo zobrazených. */
    const finish = () => {
      delete requestsRef.current[key];
      setPending((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    };

    const promise = (async (): Promise<boolean> => {
      try {
        const response = await api.patch<NotificationPreferencesApiPayload>(
          endpoints.push.preferences,
          mapStatePatchToApiPatch(key, value),
        );
        if (isLatest()) {
          const saved = response.data?.[PREFERENCE_API_KEYS[key]];
          setConfirmed((current) => ({
            ...current,
            [key]: typeof saved === 'boolean' ? saved : value,
          }));
          finish();
        }
        return true;
      } catch (patchError) {
        console.error('Failed to update notification preferences:', patchError);
        if (isLatest()) {
          // Zobrazená hodnota sa vráti na poslednú potvrdenú; ostatné voľby sa nemenia.
          finish();
          reportFailure(
            getApiErrorMessage(
              patchError,
              t('notifications.preferencesSaveFailed', 'Nastavenia upozornení sa nepodarilo uložiť.'),
            ),
          );
        }
        return false;
      }
    })();
    requestsRef.current[key] = { id, value, promise };
    return promise;
  }

  const error =
    saveError ??
    (loadFailed
      ? t('notifications.preferencesLoadFailed', 'Nastavenia upozornení sa nepodarilo načítať.')
      : null);

  return {
    preferences,
    loading,
    loadFailed,
    error,
    isSaving,
    updatePreference,
  };
}
