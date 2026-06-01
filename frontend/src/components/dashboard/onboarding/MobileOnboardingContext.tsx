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
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  reconcileOnboardingState,
  type MobileOnboardingState,
  type MobileOnboardingStep,
  writeMobileOnboardingState,
} from './mobileOnboardingStorage';

export const ONBOARDING_TARGETS = {
  home: '[data-onboarding="home-content"]',
  profileIcon: '[data-onboarding="profile-icon"]',
  profileEditButton: '[data-onboarding="profile-edit-button"]',
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
};

function persist(state: MobileOnboardingState) {
  writeMobileOnboardingState(state);
}

export function MobileOnboardingProvider({
  children,
  activeModule,
  isProfileEditMode,
  onOpenProfile,
  onOpenEditProfile,
}: MobileOnboardingProviderProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const [stored, setStored] = useState<MobileOnboardingState>(() => ({
    version: 1,
    status: 'in_progress',
    step: 'home',
  }));
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPausedUi, setIsPausedUi] = useState(false);
  const hasAutoStartedRef = useRef(false);
  const previousModuleRef = useRef(activeModule);
  const hasHydratedStorageRef = useRef(false);
  const previousEditModeRef = useRef(isProfileEditMode);

  useEffect(() => {
    if (hasHydratedStorageRef.current) return;
    hasHydratedStorageRef.current = true;

    const initial = getInitialMobileOnboardingState(activeModule, isProfileEditMode);
    setStored(initial);
    writeMobileOnboardingState(initial);
    setIsStorageReady(true);
  }, [activeModule, isProfileEditMode]);

  // Keep saved step aligned with the current screen (avoids invisible tutorial on wrong step).
  useEffect(() => {
    if (!isStorageReady || stored.status !== 'in_progress') return;

    const reconciled = reconcileOnboardingState(stored, activeModule, isProfileEditMode);
    if (reconciled.step !== stored.step) {
      setStored(reconciled);
      persist(reconciled);
    }
  }, [activeModule, isProfileEditMode, isStorageReady, stored.status, stored.step]);

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

  const setState = useCallback((next: MobileOnboardingState) => {
    setStored(next);
    persist(next);
  }, []);

  const isOverlayVisible =
    isEligible &&
    !isPausedUi &&
    !isProfileEditMode &&
    stored.status === 'in_progress' &&
    isStepSceneReady;

  // Resume in_progress on mount (not paused until user explicitly paused)
  useEffect(() => {
    if (!isEligible) return;
    if (stored.status === 'paused') return;
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
    setIsPausedUi(false);
    setState({ version: 1, status: 'completed', step: 'edit_form' });
  }, [setState]);

  const skip = useCallback(() => {
    setIsPausedUi(false);
    setState({ version: 1, status: 'skipped', step: stored.step });
  }, [setState, stored.step]);

  const pause = useCallback(() => {
    // Hide for current session only — do not persist "paused" (it blocked the tutorial on reload).
    setIsPausedUi(true);
  }, []);

  // "Neskôr" / close — resume when user returns to Domov (any in-progress step).
  useEffect(() => {
    if (!isPausedUi) return;
    if (activeModule === 'home') {
      setIsPausedUi(false);
    }
  }, [activeModule, isPausedUi]);

  const close = pause;

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
