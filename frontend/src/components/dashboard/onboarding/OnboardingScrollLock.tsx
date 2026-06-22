'use client';

import { useEffect } from 'react';
import { useOptionalDesktopOnboarding } from './DesktopOnboardingContext';
import { useOptionalMobileOnboarding } from './MobileOnboardingContext';

const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';
const ONBOARDING_OVERLAY_SELECTOR = '[data-onboarding-overlay]';
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
  'Spacebar',
]);

/** Returns whether an event originated inside the tutorial panel itself. */
function isInsideOnboardingOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(ONBOARDING_OVERLAY_SELECTOR) !== null;
}

/** Keeps keyboard interaction working for controls while background scrolling is locked. */
function usesScrollKeysForInteraction(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return (
    target.closest(
      'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="link"], [role="menuitem"], [role="tab"]',
    ) !== null
  );
}

/** Prevents user-driven dashboard scrolling while preserving the current scroll position. */
export function useOnboardingScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const dashboardMain = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    const previousOverflowY = dashboardMain?.style.overflowY ?? '';

    if (dashboardMain) {
      dashboardMain.style.overflowY = 'hidden';
    }

    const preventPointerScroll = (event: WheelEvent | TouchEvent) => {
      if (!isInsideOnboardingOverlay(event.target)) {
        event.preventDefault();
      }
    };

    const preventKeyboardScroll = (event: KeyboardEvent) => {
      if (
        !SCROLL_KEYS.has(event.key) ||
        event.defaultPrevented ||
        isInsideOnboardingOverlay(event.target) ||
        usesScrollKeysForInteraction(event.target)
      ) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener('wheel', preventPointerScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener('touchmove', preventPointerScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener('keydown', preventKeyboardScroll, true);

    return () => {
      if (dashboardMain) {
        dashboardMain.style.overflowY = previousOverflowY;
      }
      document.removeEventListener('wheel', preventPointerScroll, true);
      document.removeEventListener('touchmove', preventPointerScroll, true);
      document.removeEventListener('keydown', preventKeyboardScroll, true);
    };
  }, [isLocked]);
}

/** Activates one shared scroll lock for the currently visible mobile or desktop tutorial. */
export default function OnboardingScrollLock() {
  const desktopOnboarding = useOptionalDesktopOnboarding();
  const mobileOnboarding = useOptionalMobileOnboarding();

  useOnboardingScrollLock(
    Boolean(desktopOnboarding?.isOverlayVisible || mobileOnboarding?.isOverlayVisible),
  );

  return null;
}
