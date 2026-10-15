'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { currentBrowserUrl } from '@/utils/currentBrowserUrl';
import {
  getDesktopSettingsStepsToOrigin,
  withDesktopSettingsHistory,
  withDesktopSettingsOriginHistory,
  withDesktopSettingsStep,
} from '../../../hooks/desktopSettingsNavigation';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';
import { isOfferWatchMobileViewport as isMobileViewport } from './offerWatchMobileViewport';
import { readRestorableOfferWatchMobileHistory } from './offerWatchMobileHistoryRestore';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_RETURN_PATH,
  OFFER_WATCH_SETTINGS_PATH,
  hasOfferWatchSettingsReturnHistory,
  isOfferWatchSettingsPath,
  readOfferWatchMobileHistory,
  readOfferWatchMobileRequestOrigin,
  withOfferWatchMobileHistory,
  withOfferWatchSettingsReturnHistory,
  withoutOfferWatchMobileHistory,
  withoutOfferWatchSettingsReturnHistory,
  type OfferWatchMobileHistory,
  type OfferWatchMobileView,
} from './offerWatchMobileNavigation';

type OfferWatchSettingsMobileHostProps = {
  onReturnToSettings: () => void;
  isSettingsOpen?: boolean;
  /** Informuje nadradený layout, či mobilné okno prekrýva jeho navigáciu. */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Otvor sledované ponuky v desktopovom rozložení po prekročení hranice
   * 1024 px s otvoreným mobilným panelom.
   */
  onOpenDesktop?: () => void;
};

const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';

/** Keep a view's entry origin in the versioned browser history marker. */
function markerFor(
  origin: OfferWatchMobileHistory['origin'],
  view: OfferWatchMobileView,
): OfferWatchMobileHistory {
  return { version: 2, origin, view };
}

/** Host mobile management in a portal and restore its correct origin through browser history. */
export default function OfferWatchSettingsMobileHost({
  onReturnToSettings,
  isSettingsOpen = false,
  onOpenChange,
  onOpenDesktop,
}: OfferWatchSettingsMobileHostProps) {
  const [marker, setMarker] = useState<OfferWatchMobileHistory | null>(null);
  // Vsúvanie platí len pre otvorenie ťuknutím; obnova po načítaní, kroku vpred alebo zmene okna sa neanimuje.
  const [slideIn, setSlideIn] = useState(false);
  const markerRef = useRef<OfferWatchMobileHistory | null>(null);
  const returnToSettingsRef = useRef(onReturnToSettings);
  const openDesktopRef = useRef(onOpenDesktop);
  const openChangeRef = useRef(onOpenChange);
  const navigationPendingRef = useRef(false);
  const settingsReturnRequestedRef = useRef(false);
  const settingsReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    markerRef.current = marker;
  }, [marker]);

  useEffect(() => {
    returnToSettingsRef.current = onReturnToSettings;
  }, [onReturnToSettings]);

  useEffect(() => {
    openDesktopRef.current = onOpenDesktop;
  }, [onOpenDesktop]);

  useEffect(() => {
    openChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const isOpen = marker !== null;

  useEffect(() => {
    openChangeRef.current?.(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSlideIn(false);
  }, [isOpen]);

  useEffect(() => () => {
    if (markerRef.current) openChangeRef.current?.(false);
  }, []);

  /** Restore the Settings overlay and focus after its navigation has settled. */
  const returnToSettings = useCallback(() => {
    returnToSettingsRef.current();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>(
          '[data-mobile-settings-item="offer-watches"]',
        )?.focus();
      });
    });
  }, []);

  /** Defer Settings restoration until the parent popstate listeners have finished. */
  const scheduleSettingsReturn = useCallback(() => {
    if (settingsReturnRequestedRef.current) return;
    settingsReturnRequestedRef.current = true;
    settingsReturnTimerRef.current = setTimeout(() => {
      settingsReturnTimerRef.current = null;
      if (!isMobileViewport()) {
        settingsReturnRequestedRef.current = false;
        return;
      }
      returnToSettings();
    }, 0);
  }, [returnToSettings]);

  useEffect(() => () => {
    if (settingsReturnTimerRef.current !== null) {
      clearTimeout(settingsReturnTimerRef.current);
    }
  }, []);

  // Návratový marker sa odstráni až po tom, čo rodič skutočne vykreslí
  // Nastavenia. Ak sa Dashboard počas zmeny URL remountne, marker ostane v
  // histórii a nová inštancia dokončí návrat namiesto straty callbacku.
  useEffect(() => {
    if (!isSettingsOpen || !settingsReturnRequestedRef.current) return;
    if (
      !isOfferWatchSettingsPath(window.location.pathname)
      && hasOfferWatchSettingsReturnHistory(window.history.state)
    ) {
      window.history.replaceState(
        withoutOfferWatchSettingsReturnHistory(window.history.state),
        '',
      );
    }
    settingsReturnRequestedRef.current = false;
  }, [isSettingsOpen]);

  /** Separate results origins from Settings, cancelling obsolete Settings restoration work. */
  const openFromRequest = useCallback((event: Event) => {
    if (!isMobileViewport() || markerRef.current) return;
    const origin = readOfferWatchMobileRequestOrigin(event);
    if (origin === 'results') {
      if (settingsReturnTimerRef.current !== null) {
        clearTimeout(settingsReturnTimerRef.current);
        settingsReturnTimerRef.current = null;
      }
      settingsReturnRequestedRef.current = false;
    }
    const nextMarker = markerFor(origin, { kind: 'list' });
    const sourceState = origin === 'results'
      ? withoutOfferWatchSettingsReturnHistory(window.history.state)
      : withOfferWatchSettingsReturnHistory(window.history.state);
    const returnTarget = { moduleId: 'watches', url: currentBrowserUrl('/dashboard/watches') };
    const returnState = origin === 'results'
      ? withDesktopSettingsOriginHistory(sourceState, returnTarget)
      : sourceState;
    const managementState = origin === 'results'
      ? withDesktopSettingsHistory(returnState, returnTarget, 0)
      : returnState;

    // Nastavenia sú iba React overlay, nie samostatný history záznam. Označenie
    // pôvodného záznamu umožní ich obnoviť aj po remounte celej route.
    window.history.replaceState(returnState, '');
    window.history.pushState(
      withOfferWatchMobileHistory(
        withoutOfferWatchSettingsReturnHistory(managementState),
        nextMarker,
      ),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );
    markerRef.current = nextMarker;
    setSlideIn(true);
    setMarker(nextMarker);
  }, []);

  useEffect(() => {
    window.addEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, openFromRequest);
    return () => window.removeEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, openFromRequest);
  }, [openFromRequest]);

  useEffect(() => {
    /** Restore saved mobile views on mount/resize, keeping direct-link and desktop fallbacks. */
    const restoreRoute = () => {
      if (!isMobileViewport()) {
        const previousMarker = markerRef.current;
        const hadOverlay = previousMarker !== null;
        markerRef.current = null;
        setMarker(null);
        if (hadOverlay && isOfferWatchSettingsPath(window.location.pathname)) {
          window.history.replaceState(
            withoutOfferWatchMobileHistory(window.history.state),
            '',
            OFFER_WATCH_SETTINGS_PATH,
          );
          if (previousMarker.origin === 'results') {
            // Reuse this entry and the parent's route sync, not a click that pushes another entry.
            window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
          } else {
            openDesktopRef.current?.();
          }
        }
        return;
      }

      if (!isOfferWatchSettingsPath(window.location.pathname)) {
        if (hasOfferWatchSettingsReturnHistory(window.history.state)) {
          scheduleSettingsReturn();
        }
        return;
      }

      const savedMarker = readRestorableOfferWatchMobileHistory(window.history.state);
      if (savedMarker) {
        if (!readOfferWatchMobileHistory(window.history.state)) {
          window.history.replaceState(withOfferWatchMobileHistory(window.history.state, savedMarker), '');
        }
        markerRef.current = savedMarker;
        setMarker(savedMarker);
        return;
      }

      // Priamy odkaz nemá pod sebou záznam Nastavení. Aktuálny záznam sa preto
      // bezpečne zmení na návratový bod a obrazovka zoznamu dostane nový záznam.
      const directMarker = markerFor('direct', { kind: 'list' });
      const settingsState = withOfferWatchSettingsReturnHistory(
        withoutOfferWatchMobileHistory(window.history.state),
      );
      window.history.replaceState(settingsState, '', OFFER_WATCH_RETURN_PATH);
      window.history.pushState(
        withOfferWatchMobileHistory(
          withoutOfferWatchSettingsReturnHistory(settingsState),
          directMarker,
        ),
        '',
        OFFER_WATCH_SETTINGS_PATH,
      );
      markerRef.current = directMarker;
      setMarker(directMarker);
    };

    restoreRoute();
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    mediaQuery.addEventListener('change', restoreRoute);
    return () => mediaQuery.removeEventListener('change', restoreRoute);
  }, [scheduleSettingsReturn]);

  useEffect(() => {
    /** Replay nested steps; reopen Settings only when management was entered from Settings. */
    const handlePopState = () => {
      const previousMarker = markerRef.current;
      const nextMarker = isMobileViewport()
        && isOfferWatchSettingsPath(window.location.pathname)
        ? readRestorableOfferWatchMobileHistory(window.history.state)
        : null;
      if (nextMarker && !readOfferWatchMobileHistory(window.history.state)) {
        window.history.replaceState(withOfferWatchMobileHistory(window.history.state, nextMarker), '');
      }
      markerRef.current = nextMarker;
      setMarker(nextMarker);
      navigationPendingRef.current = false;

      if (!nextMarker && previousMarker && previousMarker.origin !== 'results') {
        if (!hasOfferWatchSettingsReturnHistory(window.history.state)) {
          window.history.replaceState(
            withOfferWatchSettingsReturnHistory(window.history.state),
            '',
          );
        }
        scheduleSettingsReturn();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scheduleSettingsReturn]);

  /** Add a nested form/picker step while preserving the manager's original entry point. */
  const pushView = useCallback((view: OfferWatchMobileView) => {
    const current = markerRef.current;
    if (!current) return;
    const nextMarker = markerFor(current.origin, view);
    const historyState = current.origin === 'results'
      ? withDesktopSettingsStep(window.history.state)
      : window.history.state;
    window.history.pushState(
      withOfferWatchMobileHistory(historyState, nextMarker),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );
    markerRef.current = nextMarker;
    setMarker(nextMarker);
  }, []);

  /** Leave a restored results list's desktop session, or traverse one normal mobile step. */
  const navigateBack = useCallback(() => {
    const current = markerRef.current;
    if (!current || navigationPendingRef.current) return;
    navigationPendingRef.current = true;
    const steps = current.origin === 'results' && current.view.kind === 'list'
      ? getDesktopSettingsStepsToOrigin(window.history.state)
      : 1;
    if (steps > 1) window.history.go(-steps);
    else window.history.back();
  }, []);

  if (typeof document === 'undefined') return null;
  // Portál je pripojený aj bez značky: `AnimatePresence` v ňom dokončí výstup obrazovky po kroku späť.
  return createPortal(
    <AnimatePresence>
      {marker && (
        <OfferWatchSettingsMobile
          key='offer-watch-mobile'
          view={marker.view}
          slideIn={slideIn}
          onBack={navigateBack}
          onPushView={pushView}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
