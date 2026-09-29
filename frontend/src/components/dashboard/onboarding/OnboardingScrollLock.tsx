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

/**
 * Hides the overflow of the dashboard `<main>` and keeps it hidden on whichever
 * `<main>` is mounted. `DashboardLayout` swaps in a fresh element on every module
 * change (see `useDashboardMainKey`), and a tutorial step change moves the module in
 * the same batch, so the lock stays active across the swap without its effect
 * re-running. Returns a function that restores the original inline overflow.
 */
function lockDashboardMain(): () => void {
  let lockedMain: HTMLElement | null = null;
  let previousOverflowY = '';

  const release = () => {
    if (lockedMain) {
      lockedMain.style.overflowY = previousOverflowY;
    }
    lockedMain = null;
  };

  const lockCurrentMain = () => {
    if (lockedMain?.isConnected) return;

    release();
    const currentMain = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    if (!currentMain) return;

    lockedMain = currentMain;
    previousOverflowY = currentMain.style.overflowY;
    currentMain.style.overflowY = 'hidden';
  };

  lockCurrentMain();

  const mainReplacementObserver = new MutationObserver(lockCurrentMain);
  mainReplacementObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mainReplacementObserver.disconnect();
    release();
  };
}

/** Prevents user-driven dashboard scrolling while preserving the current scroll position. */
export function useOnboardingScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const unlockMain = lockDashboardMain();

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
      unlockMain();
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
