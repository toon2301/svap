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

/** Fronta zápisov jednej voľby: požiadavky idú po jednej a čakajúce zmeny sa zlučujú do najnovšej. */
interface WriteQueue {
  /** Poradové číslo najnovšej zmeny; staršie čakajúce zmeny sa preskočia. */
  latestId: number;
  /** Hodnota najnovšej zmeny, teda to, čo sa má nakoniec uložiť. */
  desired: boolean;
  /** Dokončí sa, keď sa vybavia zápisy tejto voľby až po najnovšiu zmenu (výsledok: je uložená). */
  tail: Promise<boolean>;
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
 * hodnota sa nezmení a hneď sa ukáže preložená chyba. Rovnaká zmena, ktorá už beží alebo čaká, sa neposiela znova
 * (stlačenie aj kliknutie na ten istý riadok), a zmena na hodnotu, ktorú voľba už má, nespraví nič.
 *
 * Zápisy tej istej voľby idú po jednej (PR 258): kým beží `PATCH`, ďalšia zmena tej istej voľby čaká a odošle sa až po
 * ňom, takže návrat po chybe vychádza z hodnoty, ktorú server skutočne potvrdil, aj keď predchádzajúci zápis uspel.
 * Čakajúce zmeny sa zlučujú: odošle sa len najnovšia, a to len ak sa líši od potvrdenej hodnoty. Chyba sa ohlási len pri
 * poslednej zmene (ak sa medzitým zmenilo, čo používateľ chce, o zlyhaní staršieho zápisu sa nehlási nič). Zápisy
 * rôznych volieb sa nezdržiavajú. Časový limit požiadavky ostáva globálny (`lib/api.ts`).
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
  // Zrkadlo `confirmed` pre asynchrónne čítanie: fronta zápisov potrebuje poslednú potvrdenú hodnotu aj v čase, keď
  // je uzáver vykreslenia už zastaraný. Zapisuje sa len v obsluhách a asynchrónnych návratoch, nie počas vykresľovania.
  const confirmedRef = useRef<NotificationPreferencesState>(DEFAULT_PREFERENCES);
  const writesRef = useRef<Partial<Record<NotificationPreferenceKey, WriteQueue>>>({});
  const writeCounterRef = useRef(0);

  /** Zapíše potvrdené hodnoty zo servera do stavu aj do zrkadla, z ktorého číta fronta zápisov. */
  function setConfirmedState(next: NotificationPreferencesState) {
    confirmedRef.current = next;
    setConfirmed(next);
  }

  useEffect(() => {
    let cancelled = false;

    /** Načíta uložené voľby; pri zlyhaní zapne `loadFailed`. */
    async function loadPreferences() {
      try {
        const response = await api.get<NotificationPreferencesApiPayload>(
          endpoints.push.preferences,
        );
        if (!cancelled) {
          const loaded = mapApiPayloadToState(response.data);
          confirmedRef.current = loaded;
          setConfirmed(loaded);
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

    const queue = writesRef.current[key];
    // Porovnáva sa s hodnotou, ktorá sa nakoniec uloží (najnovšia zmena vo fronte), inak s potvrdenou zo servera.
    if ((queue ? queue.desired : confirmedRef.current[key]) === value) {
      return queue ? queue.tail : true;
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

    const id = writeCounterRef.current + 1;
    writeCounterRef.current = id;
    setPending((current) => ({ ...current, [key]: value }));
    if (!options.onError) {
      setSaveError(null);
    }

    /** Táto zmena je stále najnovšia pre danú voľbu (neskoršia ju nenahradila). */
    const isLatest = () => writesRef.current[key]?.latestId === id;
    /** Ukončí zápisy voľby: fronta sa vyprázdni a zobrazí sa potvrdená hodnota. */
    const finish = () => {
      delete writesRef.current[key];
      setPending((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    };

    /** Vybaví túto zmenu, keď príde na rad (po predchádzajúcich zápisoch tej istej voľby). */
    const write = async (): Promise<boolean> => {
      if (!isLatest()) {
        // Nahradila ju novšia zmena: odošle sa len tá.
        return false;
      }
      if (confirmedRef.current[key] === value) {
        // Server túto hodnotu už má (napr. po zlyhaní staršieho zápisu používateľ vrátil pôvodnú), nie je čo posielať.
        finish();
        return true;
      }
      try {
        const response = await api.patch<NotificationPreferencesApiPayload>(
          endpoints.push.preferences,
          mapStatePatchToApiPatch(key, value),
        );
        const saved = response.data?.[PREFERENCE_API_KEYS[key]];
        setConfirmedState({
          ...confirmedRef.current,
          [key]: typeof saved === 'boolean' ? saved : value,
        });
        if (isLatest()) {
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
    };

    // Fronta sa zaeviduje skôr, než sa zápis spustí (`isLatest` ju hľadá); prvý zápis ide hneď, ďalšie po predchádzajúcom.
    const entry: WriteQueue = { latestId: id, desired: value, tail: Promise.resolve(true) };
    writesRef.current[key] = entry;
    entry.tail = (queue ? queue.tail.then(write) : write()).catch(() => false);
    return entry.tail;
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
