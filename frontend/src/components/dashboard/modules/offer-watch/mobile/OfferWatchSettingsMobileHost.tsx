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
}: OfferWatchSettingsMobileHostProps) {
  const [marker, setMarker] = useState<OfferWatchMobileHistory | null>(null);
  const markerRef = useRef<OfferWatchMobileHistory | null>(null);

  useEffect(() => {
    markerRef.current = marker;
  }, [marker]);

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
        markerRef.current = null;
        setMarker(null);
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
    const handlePopState = () => {
      const previousMarker = markerRef.current;
      const nextMarker = isMobileViewport()
        && isOfferWatchSettingsPath(window.location.pathname)
        ? readOfferWatchMobileHistory(window.history.state)
        : null;
      markerRef.current = nextMarker;
      setMarker(nextMarker);
      if (!nextMarker && previousMarker?.origin === 'settings') {
        returnToSettings();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
