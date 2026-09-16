'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_RETURN_PATH,
  OFFER_WATCH_SETTINGS_PATH,
  hasOfferWatchSettingsReturnHistory,
  isOfferWatchSettingsPath,
  readOfferWatchMobileHistory,
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

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
    : window.innerWidth < 1024;
}

function markerFor(
  origin: OfferWatchMobileHistory['origin'],
  view: OfferWatchMobileView,
): OfferWatchMobileHistory {
  return { version: 2, origin, view };
}

export default function OfferWatchSettingsMobileHost({
  onReturnToSettings,
  isSettingsOpen = false,
  onOpenChange,
  onOpenDesktop,
}: OfferWatchSettingsMobileHostProps) {
  const [marker, setMarker] = useState<OfferWatchMobileHistory | null>(null);
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

  useEffect(() => () => {
    if (markerRef.current) openChangeRef.current?.(false);
  }, []);

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

  const openFromSettings = useCallback(() => {
    if (!isMobileViewport() || markerRef.current) return;
    const nextMarker = markerFor('settings', { kind: 'list' });
    const returnState = withOfferWatchSettingsReturnHistory(window.history.state);

    // Nastavenia sú iba React overlay, nie samostatný history záznam. Označenie
    // pôvodného záznamu umožní ich obnoviť aj po remounte celej route.
    window.history.replaceState(returnState, '');
    window.history.pushState(
      withOfferWatchMobileHistory(
        withoutOfferWatchSettingsReturnHistory(returnState),
        nextMarker,
      ),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );
    markerRef.current = nextMarker;
    setMarker(nextMarker);
  }, []);

  useEffect(() => {
    window.addEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, openFromSettings);
    return () => window.removeEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, openFromSettings);
  }, [openFromSettings]);

  useEffect(() => {
    const restoreRoute = () => {
      if (!isMobileViewport()) {
        const hadOverlay = markerRef.current !== null;
        markerRef.current = null;
        setMarker(null);
        if (hadOverlay && isOfferWatchSettingsPath(window.location.pathname)) {
          window.history.replaceState(
            withoutOfferWatchMobileHistory(window.history.state),
            '',
            OFFER_WATCH_SETTINGS_PATH,
          );
          openDesktopRef.current?.();
        }
        return;
      }

      if (!isOfferWatchSettingsPath(window.location.pathname)) {
        if (hasOfferWatchSettingsReturnHistory(window.history.state)) {
          scheduleSettingsReturn();
        }
        return;
      }

      const savedMarker = readOfferWatchMobileHistory(window.history.state);
      if (savedMarker) {
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
    const handlePopState = () => {
      const previousMarker = markerRef.current;
      const nextMarker = isMobileViewport()
        && isOfferWatchSettingsPath(window.location.pathname)
        ? readOfferWatchMobileHistory(window.history.state)
        : null;
      markerRef.current = nextMarker;
      setMarker(nextMarker);
      navigationPendingRef.current = false;

      if (!nextMarker && previousMarker) {
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

  const pushView = useCallback((view: OfferWatchMobileView) => {
    const current = markerRef.current;
    if (!current) return;
    const nextMarker = markerFor(current.origin, view);
    window.history.pushState(
      withOfferWatchMobileHistory(window.history.state, nextMarker),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );
    markerRef.current = nextMarker;
    setMarker(nextMarker);
  }, []);

  const navigateBack = useCallback(() => {
    if (!markerRef.current || navigationPendingRef.current) return;
    navigationPendingRef.current = true;
    window.history.back();
  }, []);

  if (!marker || typeof document === 'undefined') return null;
  return createPortal(
    <OfferWatchSettingsMobile
      view={marker.view}
      onBack={navigateBack}
      onPushView={pushView}
    />,
    document.body,
  );
}
