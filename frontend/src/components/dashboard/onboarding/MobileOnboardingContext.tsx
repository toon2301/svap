'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsMobileState } from '@/hooks/useIsMobile';
import {
  clearMobileOnboardingPostponedForSession,
  isMobileOnboardingPostponedForSession,
  postponeMobileOnboardingForSession,
} from '@/lib/mobileOnboardingSession';
import { logClientError } from '@/utils/clientLogging';
import { updateMobileOnboardingState } from './mobileOnboardingApi';
import {
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  reconcileOnboardingState,
  type MobileOnboardingState,
  type MobileOnboardingStep,
} from './mobileOnboardingStorage';

export const ONBOARDING_TARGETS = {
  home: '[data-onboarding="home-content"]',
  profileIcon: '[data-onboarding="profile-icon"]',
  profileEditButton: '[data-onboarding="profile-edit-button"]',
  profileSkillsButton: '[data-onboarding="profile-skills-button"]',
  profileEditForm: '[data-onboarding="profile-edit-form"]',
} as const;

type MobileOnboardingContextValue = {
  isEligible: boolean;
  /** Spotlight + tooltip layer (hidden during profile edit). */
  isOverlayVisible: boolean;
  step: MobileOnboardingStep;
  goNext: () => void;
  skip: () => void;
  pause: () => void;
  close: () => void;
  complete: () => void;
  notifyProfileSaved: () => void;
  registerProfileIconClick: () => void;
};

const MobileOnboardingContext = createContext<MobileOnboardingContextValue | null>(null);

type MobileOnboardingProviderProps = {
  children: React.ReactNode;
  activeModule: string;
  isProfileEditMode: boolean;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  serverState?: MobileOnboardingState | null;
};

export function MobileOnboardingProvider({
  children,
  activeModule,
  isProfileEditMode,
  onOpenProfile,
  onOpenEditProfile,
  serverState,
}: MobileOnboardingProviderProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const [stored, setStored] = useState<MobileOnboardingState>(() =>
    getInitialMobileOnboardingState(serverState, activeModule, isProfileEditMode),
  );
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPausedUi, setIsPausedUi] = useState(() =>
    isMobileOnboardingPostponedForSession(),
  );
  const hasAutoStartedRef = useRef(false);
  const previousModuleRef = useRef(activeModule);
  const previousEditModeRef = useRef(isProfileEditMode);
  const activeModuleRef = useRef(activeModule);
  const isProfileEditModeRef = useRef(isProfileEditMode);
  const serverOnboardingStatus = serverState?.status ?? null;
  const serverOnboardingStep = serverState?.step ?? null;

  useEffect(() => {
    activeModuleRef.current = activeModule;
  }, [activeModule]);

  useEffect(() => {
    isProfileEditModeRef.current = isProfileEditMode;
  }, [isProfileEditMode]);

  useEffect(() => {
    const serverInitial =
      serverOnboardingStatus && serverOnboardingStep
        ? {
            version: 1 as const,
            status: serverOnboardingStatus,
            step: serverOnboardingStep,
          }
        : null;
    const initial = getInitialMobileOnboardingState(
      serverInitial,
      activeModuleRef.current,
      isProfileEditModeRef.current,
    );
    setStored(initial);
    if (isMobileOnboardingFinished(initial.status)) {
      clearMobileOnboardingPostponedForSession();
      setIsPausedUi(false);
    } else {
      setIsPausedUi(isMobileOnboardingPostponedForSession());
    }
    setIsStorageReady(true);
    hasAutoStartedRef.current = false;
  }, [serverOnboardingStatus, serverOnboardingStep]);

  const persistState = useCallback((next: MobileOnboardingState, previous: MobileOnboardingState) => {
    void updateMobileOnboardingState(next)
      .then((serverNext) => {
        setStored((current) => {
          const isSameRequestState =
            current.status === next.status && current.step === next.step;
          if (isSameRequestState || isMobileOnboardingFinished(serverNext.status)) {
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
        logClientError('Mobile onboarding state update failed', error);
      });
  }, []);

  // Keep saved step aligned with the current screen (avoids invisible tutorial on wrong step).
  useEffect(() => {
    if (!isStorageReady || isPausedUi || stored.status !== 'in_progress') return;

    const reconciled = reconcileOnboardingState(stored, activeModule, isProfileEditMode);
    if (reconciled.step !== stored.step) {
      setStored(reconciled);
      persistState(reconciled, stored);
    }
  }, [
    activeModule,
    isPausedUi,
    isProfileEditMode,
    isStorageReady,
    persistState,
    stored,
  ]);

  const isFinished = isMobileOnboardingFinished(stored.status);
  const isEligible = isStorageReady && isResolved && isMobile && !isFinished;

  const isStepSceneReady = useMemo(() => {
    if (stored.step === 'home') return activeModule === 'home';
    if (stored.step === 'profile_icon') return activeModule === 'home';
    if (stored.step === 'profile_edit' || stored.step === 'edit_form') {
      return activeModule === 'profile' && !isProfileEditMode;
    }
    return false;
  }, [activeModule, isProfileEditMode, stored.step]);

  const setState = useCallback(
    (next: MobileOnboardingState) => {
      const previous = stored;
      setStored(next);
      persistState(next, previous);
    },
    [persistState, stored],
  );

  const isOverlayVisible =
    isEligible &&
    !isPausedUi &&
    !isProfileEditMode &&
    stored.status === 'in_progress' &&
    isStepSceneReady;

  // Resume in_progress on mount (not paused until user explicitly paused)
  useEffect(() => {
    if (!isEligible) return;
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    if (stored.status !== 'in_progress') {
      setState({ ...stored, status: 'in_progress' });
    }
  }, [isEligible, setState, stored]);

  // Sync step only after real navigation (not on initial mount).
  useEffect(() => {
    if (!isEligible || isPausedUi) return;

    const previousModule = previousModuleRef.current;
    previousModuleRef.current = activeModule;
    if (previousModule === activeModule) return;

    if (stored.step === 'profile_icon' && activeModule === 'profile' && !isProfileEditMode) {
      setState({ ...stored, step: 'profile_edit' });
    }
  }, [activeModule, isEligible, isPausedUi, isProfileEditMode, setState, stored]);

  // Edit mode: hide all onboarding UI but keep progress; restore step when user cancels.
  useEffect(() => {
    if (!isEligible || isPausedUi) return;

    const wasEditing = previousEditModeRef.current;
    previousEditModeRef.current = isProfileEditMode;

    if (isProfileEditMode && !wasEditing && stored.step === 'profile_edit') {
      setState({ version: 1, status: 'in_progress', step: 'edit_form' });
      return;
    }

    if (
      !isProfileEditMode &&
      wasEditing &&
      stored.status === 'in_progress' &&
      stored.step === 'edit_form'
    ) {
      setState({ version: 1, status: 'in_progress', step: 'profile_edit' });
    }
  }, [isEligible, isPausedUi, isProfileEditMode, setState, stored.status, stored.step]);

  const complete = useCallback(() => {
    clearMobileOnboardingPostponedForSession();
    setIsPausedUi(false);
    setState({ version: 1, status: 'completed', step: 'edit_form' });
  }, [setState]);

  const skip = useCallback(() => {
    clearMobileOnboardingPostponedForSession();
    setIsPausedUi(false);
    setState({ version: 1, status: 'skipped', step: stored.step });
  }, [setState, stored.step]);

  const pause = useCallback(() => {
    // Hide only for this browser tab/session; do not persist completion to the server.
    postponeMobileOnboardingForSession();
    setIsPausedUi(true);
  }, []);

  // X closes the tutorial permanently in the same way as the skip action.
  const close = skip;

  const goNext = useCallback(() => {
    if (!isEligible) return;
    setIsPausedUi(false);

    if (stored.step === 'home') {
      setState({ version: 1, status: 'in_progress', step: 'profile_icon' });
      return;
    }

    if (stored.step === 'profile_icon') {
      onOpenProfile();
      setState({ version: 1, status: 'in_progress', step: 'profile_edit' });
      return;
    }

    if (stored.step === 'profile_edit') {
      onOpenEditProfile();
      setState({ version: 1, status: 'in_progress', step: 'edit_form' });
      return;
    }

    if (stored.step === 'edit_form') {
      complete();
    }
  }, [complete, isEligible, onOpenEditProfile, onOpenProfile, setState, stored.step]);

  const registerProfileIconClick = useCallback(() => {
    if (!isEligible || stored.step !== 'profile_icon') return;
    setIsPausedUi(false);
    setState({ version: 1, status: 'in_progress', step: 'profile_edit' });
  }, [isEligible, setState, stored.step]);

  const notifyProfileSaved = useCallback(() => {
    if (!isEligible) return;
    if (stored.step === 'edit_form') {
      complete();
    }
  }, [complete, isEligible, stored.step]);

  const value = useMemo<MobileOnboardingContextValue>(
    () => ({
      isEligible,
      isOverlayVisible,
      step: stored.step,
      goNext,
      skip,
      pause,
      close,
      complete,
      notifyProfileSaved,
      registerProfileIconClick,
    }),
    [
      close,
      complete,
      goNext,
      isEligible,
      isOverlayVisible,
      notifyProfileSaved,
      pause,
      registerProfileIconClick,
      skip,
      stored.step,
    ],
  );

  return (
    <MobileOnboardingContext.Provider value={value}>{children}</MobileOnboardingContext.Provider>
  );
}

export function useMobileOnboarding(): MobileOnboardingContextValue {
  const ctx = useContext(MobileOnboardingContext);
  if (!ctx) {
    throw new Error('useMobileOnboarding must be used within MobileOnboardingProvider');
  }
  return ctx;
}

export function useOptionalMobileOnboarding(): MobileOnboardingContextValue | null {
  return useContext(MobileOnboardingContext);
}
