'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_SETTINGS_PATH,
  isOfferWatchSettingsPath,
  readOfferWatchMobileHistory,
  withOfferWatchMobileHistory,
  withoutOfferWatchMobileHistory,
  type OfferWatchMobileHistory,
  type OfferWatchMobileView,
} from './offerWatchMobileNavigation';

type OfferWatchSettingsMobileHostProps = {
  onReturnToSettings: () => void;
  /**
   * Otvor sledované ponuky v DESKTOPOVOM rozložení.
   *
   * Volá sa jedine pri prechode cez hranicu 1024 px s otvoreným mobilným
   * panelom: panel zhasne, ale adresa ostáva na sledovaných ponukách, takže
   * desktopový stav treba dotiahnuť za ňou.
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
  return { version: 1, origin, view };
}

export default function OfferWatchSettingsMobileHost({
  onReturnToSettings,
  onOpenDesktop,
}: OfferWatchSettingsMobileHostProps) {
  const [marker, setMarker] = useState<OfferWatchMobileHistory | null>(null);
  const markerRef = useRef<OfferWatchMobileHistory | null>(null);
  // Sleduje sa cez ref: listener na zmenu šírky sa registruje raz pri mounte,
  // takže by inak natrvalo držal prvú verziu callbacku.
  const openDesktopRef = useRef(onOpenDesktop);

  useEffect(() => {
    markerRef.current = marker;
  }, [marker]);

  useEffect(() => {
    openDesktopRef.current = onOpenDesktop;
  }, [onOpenDesktop]);

  const returnToSettings = useCallback(() => {
    onReturnToSettings();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>(
          '[data-mobile-settings-item="offer-watches"]',
        )?.focus();
      });
    });
  }, [onReturnToSettings]);

  const openFromSettings = useCallback(() => {
    if (!isMobileViewport() || markerRef.current) return;
    const nextMarker = markerFor('settings', { kind: 'list' });
    window.history.pushState(
      withOfferWatchMobileHistory(window.history.state, nextMarker),
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
    const restoreDirectRoute = () => {
      if (!isMobileViewport()) {
        const hadOverlay = markerRef.current !== null;
        markerRef.current = null;
        setMarker(null);
        // Panel zhasol, ale adresa ostala na sledovaných ponukách. Desktopové
        // rozloženie ich vykresľuje podľa stavu (`activeRightItem`), nie podľa
        // cesty, takže bez tohto by po zväčšení okna ostal na obrazovke modul,
        // ktorý bol POD mobilným panelom.
        //
        // Len pri skutočnom PRECHODE s otvoreným panelom: pri mounte rovno na
        // desktope si počiatočný stav sekcie rieši samotná stránka route-u.
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
      if (!isOfferWatchSettingsPath(window.location.pathname)) return;
      const savedMarker = readOfferWatchMobileHistory(window.history.state);
      if (savedMarker) {
        markerRef.current = savedMarker;
        setMarker(savedMarker);
        return;
      }
      const directMarker = markerFor('direct', { kind: 'list' });
      window.history.replaceState(
        withOfferWatchMobileHistory(window.history.state, directMarker),
        '',
        OFFER_WATCH_SETTINGS_PATH,
      );
      markerRef.current = directMarker;
      setMarker(directMarker);
    };

    restoreDirectRoute();
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    mediaQuery.addEventListener('change', restoreDirectRoute);
    return () => mediaQuery.removeEventListener('change', restoreDirectRoute);
  }, []);

  useEffect(() => {
    let returnTimer: ReturnType<typeof setTimeout> | null = null;
    const handlePopState = () => {
      const previousMarker = markerRef.current;
      const nextMarker = isMobileViewport()
        && isOfferWatchSettingsPath(window.location.pathname)
        ? readOfferWatchMobileHistory(window.history.state)
        : null;
      markerRef.current = nextMarker;
      setMarker(nextMarker);
      if (!nextMarker && previousMarker?.origin === 'settings') {
        // Na tom istom `popstate` visí aj nadradený `syncModuleFromPath`, ktorý
        // pri rozpoznanej ceste (`/dashboard`, `/dashboard/profile`, …) končí
        // zatvorením mobilného menu. Listener dieťaťa sa registruje SKÔR, takže
        // synchrónne otvorenie by rodič vzápätí zase zavrel a naplánovaný fokus
        // by nemal na čom pristáť. Odloženie o tick posunie otvorenie za všetky
        // ostatné popstate handlery.
        returnTimer = setTimeout(returnToSettings, 0);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (returnTimer !== null) clearTimeout(returnTimer);
    };
  }, [returnToSettings]);

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
    const current = markerRef.current;
    if (!current) return;
    if (current.view.kind !== 'list' || current.origin === 'settings') {
      window.history.back();
      return;
    }
    window.history.replaceState(
      withoutOfferWatchMobileHistory(window.history.state),
      '',
      '/dashboard/settings',
    );
    markerRef.current = null;
    setMarker(null);
    returnToSettings();
  }, [returnToSettings]);

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
