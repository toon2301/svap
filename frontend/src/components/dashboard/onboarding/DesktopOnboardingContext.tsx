'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobileState } from '@/hooks/useIsMobile';
import { logClientError } from '@/utils/clientLogging';
import { updateDesktopOnboardingState } from './desktopOnboardingApi';
import {
  clearDesktopOnboardingPostponedForSession,
  isDesktopOnboardingPostponedForSession,
  postponeDesktopOnboardingForSession,
} from './desktopOnboardingSession';
import { isDesktopOnboardingStepSceneReady } from './desktopOnboardingScene';
import {
  getInitialDesktopOnboardingState,
  isDesktopOnboardingFinished,
  normalizeDesktopOnboardingState,
  type DesktopOnboardingState,
  type DesktopOnboardingStep,
} from './desktopOnboardingStorage';

export const DESKTOP_ONBOARDING_TARGETS = {
  leftNavigation: '[data-desktop-onboarding="left-navigation"]',
  profileIcon: '[data-desktop-onboarding="profile-icon"]',
} as const;

type DesktopOnboardingContextValue = {
  isEligible: boolean;
  isOverlayVisible: boolean;
  step: DesktopOnboardingStep;
  goNext: () => void;
  skip: () => void;
  pause: () => void;
  close: () => void;
};

const DesktopOnboardingContext = createContext<DesktopOnboardingContextValue | null>(null);

type DesktopOnboardingProviderProps = {
  children: React.ReactNode;
  activeModule: string;
  isBlockedByUi?: boolean;
  onOpenHome: () => void;
  serverState?: DesktopOnboardingState | null;
};

function readValidPausedUi(state: DesktopOnboardingState): boolean {
  if (isDesktopOnboardingFinished(state.status) || state.status !== 'in_progress') {
    clearDesktopOnboardingPostponedForSession();
    return false;
  }
  return isDesktopOnboardingPostponedForSession();
}

export function DesktopOnboardingProvider({
  children,
  activeModule,
  isBlockedByUi = false,
  onOpenHome,
  serverState,
}: DesktopOnboardingProviderProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const { updateUser } = useAuth();
  const [stored, setStored] = useState<DesktopOnboardingState>(() =>
    getInitialDesktopOnboardingState(serverState),
  );
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPausedUi, setIsPausedUi] = useState(false);
  const hasOpenedHomeRef = useRef(false);
  const serverOnboardingStatus = serverState?.status ?? null;
  const serverOnboardingStep = serverState?.step ?? null;

  useEffect(() => {
    if (!serverOnboardingStatus || !serverOnboardingStep) {
      setIsStorageReady(false);
      setIsPausedUi(false);
      clearDesktopOnboardingPostponedForSession();
      hasOpenedHomeRef.current = false;
      return;
    }

    const serverInitial = {
      version: 1 as const,
      status: serverOnboardingStatus,
      step: serverOnboardingStep,
    };
    const initial = getInitialDesktopOnboardingState(
      normalizeDesktopOnboardingState(serverInitial),
    );
    setStored(initial);
    if (isDesktopOnboardingFinished(initial.status)) {
      clearDesktopOnboardingPostponedForSession();
      setIsPausedUi(false);
    } else {
      setIsPausedUi(readValidPausedUi(initial));
    }
    setIsStorageReady(true);
    hasOpenedHomeRef.current = false;
  }, [serverOnboardingStatus, serverOnboardingStep]);

  const persistState = useCallback((next: DesktopOnboardingState, previous: DesktopOnboardingState) => {
    void updateDesktopOnboardingState(next)
      .then((serverNext) => {
        updateUser({ desktop_onboarding: serverNext });
        setStored((current) => {
          const isSameRequestState =
            current.status === next.status && current.step === next.step;
          if (isSameRequestState || isDesktopOnboardingFinished(serverNext.status)) {
            return serverNext;
          }
          return current;
        });
      })
      .catch((error) => {
        setStored((current) => {
          const isFailedOptimisticState =
            current.status === next.status && current.step === next.step;
          return isFailedOptimisticState ? previous : current;
        });
        logClientError('Desktop onboarding state update failed', error);
      });
  }, [updateUser]);

  const isFinished = isDesktopOnboardingFinished(stored.status);
  const isEligible = isStorageReady && isResolved && !isMobile && !isFinished;
  const isStepSceneReady = useMemo(
    () => isDesktopOnboardingStepSceneReady(stored.step, activeModule),
    [activeModule, stored.step],
  );

  const setState = useCallback(
    (next: DesktopOnboardingState) => {
      const previous = stored;
      setStored(next);
      persistState(next, previous);
    },
    [persistState, stored],
  );

  useEffect(() => {
    if (!isEligible || isPausedUi || isBlockedByUi || stored.status !== 'in_progress') return;
    if (stored.step !== 'navigation' || activeModule === 'home') return;
    if (hasOpenedHomeRef.current) return;
    hasOpenedHomeRef.current = true;
    onOpenHome();
  }, [activeModule, isBlockedByUi, isEligible, isPausedUi, onOpenHome, stored.status, stored.step]);

  const isOverlayVisible =
    isEligible &&
    !isPausedUi &&
    !isBlockedByUi &&
    stored.status === 'in_progress' &&
    isStepSceneReady;

  const finishOnboarding = useCallback(() => {
    clearDesktopOnboardingPostponedForSession();
    setIsPausedUi(false);
    setState({ version: 1, status: 'completed', step: 'profile_icon' });
  }, [setState]);

  const goNext = useCallback(() => {
    if (!isEligible) return;
    setIsPausedUi(false);

    if (stored.step === 'navigation') {
      setState({ version: 1, status: 'in_progress', step: 'profile_icon' });
      return;
    }

    if (stored.step === 'profile_icon') {
      finishOnboarding();
    }
  }, [finishOnboarding, isEligible, setState, stored.step]);

  const skip = useCallback(() => {
    clearDesktopOnboardingPostponedForSession();
    setIsPausedUi(false);
    setState({ version: 1, status: 'skipped', step: stored.step });
  }, [setState, stored.step]);

  const pause = useCallback(() => {
    postponeDesktopOnboardingForSession();
    setIsPausedUi(true);
  }, []);

  const close = skip;

  const value = useMemo<DesktopOnboardingContextValue>(
    () => ({
      isEligible,
      isOverlayVisible,
      step: stored.step,
      goNext,
      skip,
      pause,
      close,
    }),
    [close, goNext, isEligible, isOverlayVisible, pause, skip, stored.step],
  );

  return (
    <DesktopOnboardingContext.Provider value={value}>
      {children}
    </DesktopOnboardingContext.Provider>
  );
}

export function useDesktopOnboarding(): DesktopOnboardingContextValue {
  const ctx = useContext(DesktopOnboardingContext);
  if (!ctx) {
    throw new Error('useDesktopOnboarding must be used within DesktopOnboardingProvider');
  }
  return ctx;
}
