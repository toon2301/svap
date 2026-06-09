'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobileState } from '@/hooks/useIsMobile';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearMobileOnboardingPostponedForSession,
  clearMobileOnboardingResumePhase2,
  isMobileOnboardingPostponedForSession,
  isMobileOnboardingResumePhase2,
  postponeMobileOnboardingForSession,
  setMobileOnboardingResumePhase2,
} from '@/lib/mobileOnboardingSession';
import { logClientError } from '@/utils/clientLogging';
import { updateMobileOnboardingState } from './mobileOnboardingApi';
import {
  clearMobileOnboardingCachedProgress,
  getInitialMobileOnboardingState,
  isMobileOnboardingFinished,
  normalizeMobileOnboardingState,
  readMobileOnboardingCachedProgress,
  reconcileOnboardingState,
  type MobileOnboardingState,
  type MobileOnboardingStep,
  writeMobileOnboardingCachedProgress,
} from './mobileOnboardingStorage';
import { isMobileOnboardingStepSceneReady } from './mobileOnboardingScene';
import {
  type ProfileEditHighlightTarget,
  resolveProfileEditGoNextAction,
  resolveProfileSkillsClickAction,
} from './profileEditTutorialLogic';

export const ONBOARDING_TARGETS = {
  home: '[data-onboarding="home-content"]',
  profileIcon: '[data-onboarding="profile-icon"]',
  profileEditButton: '[data-onboarding="profile-edit-button"]',
  profileSkillsButton: '[data-onboarding="profile-skills-button"]',
  profileEditForm: '[data-onboarding="profile-edit-form"]',
  searchInput: '[data-onboarding="search-input"]',
  searchFilter: '[data-onboarding="search-filter"]',
  searchNavIcon: '[data-onboarding="search-nav-icon"]',
  requestsTabs: '[data-onboarding="requests-tabs"]',
  requestsNavIcon: '[data-onboarding="requests-nav-icon"]',
  messagesTabs: '[data-onboarding="messages-tabs"]',
  messagesCreateGroup: '[data-onboarding="messages-create-group"]',
  messagesNavIcon: '[data-onboarding="messages-nav-icon"]',
} as const;

type MobileOnboardingContextValue = {
  isEligible: boolean;
  /** Spotlight + tooltip layer (hidden during profile edit). */
  isOverlayVisible: boolean;
  /** Phase 2 of profile_edit step — skills button locked after profile save. */
  isProfileEditPhase2: boolean;
  step: MobileOnboardingStep;
  goNext: (options?: MobileOnboardingGoNextOptions) => void;
  skip: () => void;
  pause: () => void;
  close: () => void;
  complete: () => void;
  notifyProfileSaved: () => void;
  registerProfileIconClick: () => void;
  /** Returns true when onboarding handled the click (caller should skip default navigation). */
  registerProfileEditClick: () => boolean;
  /** Returns false when onboarding consumed the click (caller should not navigate). */
  registerProfileSkillsClick: () => boolean;
  syncProfileHighlightTarget: (target: ProfileEditHighlightTarget) => void;
};

const MobileOnboardingContext = createContext<MobileOnboardingContextValue | null>(null);

type MobileOnboardingGoNextOptions = {
  profileHighlightTarget?: ProfileEditHighlightTarget;
};

type MobileOnboardingProviderProps = {
  children: React.ReactNode;
  activeModule: string;
  isProfileEditMode: boolean;
  isBlockedByUi?: boolean;
  onOpenHome: () => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSearch: () => void;
  onOpenRequests: () => void;
  onOpenMessages: () => void;
  onSkillCreatedHandlerSet?: (handler: (() => void) | null) => void;
  serverState?: MobileOnboardingState | null;
  userId?: number | null;
};

function canRestoreProfileEditPhase2(state: MobileOnboardingState): boolean {
  return state.status === 'in_progress' && (state.step === 'profile_edit' || state.step === 'edit_form');
}

function readValidPausedUi(state: MobileOnboardingState): boolean {
  if (isMobileOnboardingFinished(state.status) || state.status !== 'in_progress') {
    clearMobileOnboardingPostponedForSession();
    return false;
  }
  return isMobileOnboardingPostponedForSession();
}

function readValidProfileEditPhase2(state: MobileOnboardingState, cachedPhase2 = false): boolean {
  if (canRestoreProfileEditPhase2(state) && (cachedPhase2 || isMobileOnboardingResumePhase2())) {
    return true;
  }
  clearMobileOnboardingResumePhase2();
  return false;
}

export function MobileOnboardingProvider({
  children,
  activeModule,
  isProfileEditMode,
  isBlockedByUi = false,
  onOpenHome,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSearch,
  onOpenRequests,
  onOpenMessages,
  onSkillCreatedHandlerSet,
  serverState,
  userId,
}: MobileOnboardingProviderProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const { updateUser } = useAuth();
  const [stored, setStored] = useState<MobileOnboardingState>(() =>
    getInitialMobileOnboardingState(serverState, activeModule, isProfileEditMode),
  );
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPausedUi, setIsPausedUi] = useState(false);
  const [isProfileEditPhase2, setIsProfileEditPhase2] = useState(false);
  const hasAutoStartedRef = useRef(false);
  const previousModuleRef = useRef(activeModule);
  const previousEditModeRef = useRef(isProfileEditMode);
  const activeModuleRef = useRef(activeModule);
  const isProfileEditModeRef = useRef(isProfileEditMode);
  const profileHighlightTargetRef = useRef<ProfileEditHighlightTarget>('edit');
  const serverOnboardingStatus = serverState?.status ?? null;
  const serverOnboardingStep = serverState?.step ?? null;

  const cacheStateForUser = useCallback(
    (state: MobileOnboardingState, profileEditPhase2Override = isProfileEditPhase2) => {
      if (isMobileOnboardingFinished(state.status)) {
        clearMobileOnboardingCachedProgress(userId);
        return;
      }

      writeMobileOnboardingCachedProgress(
        userId,
        state.step,
        canRestoreProfileEditPhase2(state) && profileEditPhase2Override,
      );
    },
    [isProfileEditPhase2, userId],
  );

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
    const normalizedServerState = normalizeMobileOnboardingState(serverInitial);
    const cachedProgress = isMobileOnboardingFinished(normalizedServerState.status)
      ? null
      : readMobileOnboardingCachedProgress(userId);
    const initialCandidate =
      cachedProgress && normalizedServerState.status === 'in_progress'
        ? { ...normalizedServerState, step: cachedProgress.step }
        : normalizedServerState;
    const initial = getInitialMobileOnboardingState(
      initialCandidate,
      activeModuleRef.current,
      isProfileEditModeRef.current,
    );
    setStored(initial);
    if (isMobileOnboardingFinished(initial.status)) {
      clearMobileOnboardingCachedProgress(userId);
      clearMobileOnboardingPostponedForSession();
      clearMobileOnboardingResumePhase2();
      setIsPausedUi(false);
      setIsProfileEditPhase2(false);
    } else {
      setIsPausedUi(readValidPausedUi(initial));
      setIsProfileEditPhase2(readValidProfileEditPhase2(
        initial,
        cachedProgress?.profileEditPhase2 === true,
      ));
    }
    setIsStorageReady(true);
    hasAutoStartedRef.current = false;
  }, [serverOnboardingStatus, serverOnboardingStep, userId]);

  const persistState = useCallback((next: MobileOnboardingState, previous: MobileOnboardingState) => {
    void updateMobileOnboardingState(next)
      .then((serverNext) => {
        cacheStateForUser(serverNext);
        updateUser({ mobile_onboarding: serverNext });
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
          if (isFailedOptimisticState) {
            cacheStateForUser(previous);
          }
          return isFailedOptimisticState ? previous : current;
        });
        logClientError('Mobile onboarding state update failed', error);
      });
  }, [cacheStateForUser, updateUser]);

  const isFinished = isMobileOnboardingFinished(stored.status);
  const isEligible = isStorageReady && isResolved && isMobile && !isFinished;

  const isStepSceneReady = useMemo(() => {
    return isMobileOnboardingStepSceneReady(stored.step, activeModule, isProfileEditMode);
  }, [activeModule, isProfileEditMode, stored.step]);

  const setState = useCallback(
    (next: MobileOnboardingState) => {
      const previous = stored;
      setStored(next);
      cacheStateForUser(next);
      persistState(next, previous);
    },
    [cacheStateForUser, persistState, stored],
  );

  // Keep profile-only tutorial steps visible on the profile scene without
  // rewinding progress to the beginning when the user is elsewhere.
  useEffect(() => {
    if (!isStorageReady || isPausedUi || stored.status !== 'in_progress') return;

    const reconciled = reconcileOnboardingState(stored, activeModule, isProfileEditMode);
    if (reconciled.step !== stored.step) {
      setState(reconciled);
    }
  }, [activeModule, isPausedUi, isProfileEditMode, isStorageReady, setState, stored]);

  const isOverlayVisible =
    isEligible &&
    !isPausedUi &&
    !isProfileEditMode &&
    !isBlockedByUi &&
    stored.status === 'in_progress' &&
    // Scene gating only decides visibility; it must never auto-navigate the user.
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

  const finishOnboarding = useCallback(
    (completedStep: MobileOnboardingStep = 'dashboard_finish') => {
      clearMobileOnboardingPostponedForSession();
      clearMobileOnboardingResumePhase2();
      setIsPausedUi(false);
      setIsProfileEditPhase2(false);
      profileHighlightTargetRef.current = 'edit';
      setState({ version: 1, status: 'completed', step: completedStep });
    },
    [setState],
  );

  const complete = useCallback(() => {
    finishOnboarding(
      stored.step === 'search' ||
        stored.step === 'help_request' ||
        stored.step === 'requests' ||
        stored.step === 'messages' ||
        stored.step === 'dashboard_finish'
        ? stored.step
        : 'edit_form',
    );
  }, [finishOnboarding, stored.step]);

  const skip = useCallback(() => {
    clearMobileOnboardingPostponedForSession();
    clearMobileOnboardingResumePhase2();
    setIsPausedUi(false);
    setIsProfileEditPhase2(false);
    profileHighlightTargetRef.current = 'edit';
    setState({ version: 1, status: 'skipped', step: stored.step });
  }, [setState, stored.step]);

  const pause = useCallback(() => {
    // Hide only for this browser tab/session; do not persist completion to the server.
    postponeMobileOnboardingForSession();
    setIsPausedUi(true);
  }, []);

  // X closes the tutorial permanently in the same way as the skip action.
  const close = skip;

  const advanceProfileEditToPhase2 = useCallback(() => {
    setMobileOnboardingResumePhase2();
    setIsProfileEditPhase2(true);
    profileHighlightTargetRef.current = 'skills';
    cacheStateForUser(stored, true);
  }, [cacheStateForUser, stored]);

  const syncProfileHighlightTarget = useCallback((target: ProfileEditHighlightTarget) => {
    profileHighlightTargetRef.current = target;
  }, []);

  const advanceToSearchStep = useCallback(() => {
    clearMobileOnboardingResumePhase2();
    setIsProfileEditPhase2(false);
    profileHighlightTargetRef.current = 'edit';
    setState({ version: 1, status: 'in_progress', step: 'search' });
    onOpenSearch();
  }, [onOpenSearch, setState]);

  const advanceToRequestsStep = useCallback(() => {
    setState({ version: 1, status: 'in_progress', step: 'requests' });
    onOpenRequests();
  }, [onOpenRequests, setState]);

  const advanceToMessagesStep = useCallback(() => {
    setState({ version: 1, status: 'in_progress', step: 'messages' });
    onOpenMessages();
  }, [onOpenMessages, setState]);

  const advanceToDashboardFinishStep = useCallback(() => {
    setState({ version: 1, status: 'in_progress', step: 'dashboard_finish' });
    onOpenHome();
  }, [onOpenHome, setState]);

  const goNext = useCallback((options?: MobileOnboardingGoNextOptions) => {
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
      const highlightedTarget =
        options?.profileHighlightTarget ?? profileHighlightTargetRef.current;
      const profileEditAction = resolveProfileEditGoNextAction(
        stored.step,
        isProfileEditPhase2,
        highlightedTarget,
      );
      if (profileEditAction === 'advance_to_search') {
        advanceToSearchStep();
        return;
      }
      if (profileEditAction === 'advance_to_phase_2') {
        advanceProfileEditToPhase2();
      }
      return;
    }

    if (stored.step === 'edit_form') {
      finishOnboarding('edit_form');
      return;
    }

    if (stored.step === 'search') {
      setState({ version: 1, status: 'in_progress', step: 'help_request' });
      return;
    }

    if (stored.step === 'help_request') {
      advanceToRequestsStep();
      return;
    }

    if (stored.step === 'requests') {
      advanceToMessagesStep();
      return;
    }

    if (stored.step === 'messages') {
      advanceToDashboardFinishStep();
      return;
    }

    if (stored.step === 'dashboard_finish') {
      finishOnboarding('dashboard_finish');
    }
  }, [
    advanceProfileEditToPhase2,
    advanceToDashboardFinishStep,
    advanceToMessagesStep,
    advanceToSearchStep,
    advanceToRequestsStep,
    finishOnboarding,
    isEligible,
    isProfileEditPhase2,
    onOpenProfile,
    setState,
    stored.step,
  ]);

  const registerProfileIconClick = useCallback(() => {
    if (!isEligible || stored.step !== 'profile_icon') return;
    setIsPausedUi(false);
    setState({ version: 1, status: 'in_progress', step: 'profile_edit' });
  }, [isEligible, setState, stored.step]);

  const notifyProfileSaved = useCallback(() => {
    if (!isEligible || isPausedUi) return;
    if (stored.step === 'edit_form') {
      advanceProfileEditToPhase2();
    }
  }, [advanceProfileEditToPhase2, isEligible, isPausedUi, stored.step]);

  const notifySkillCreated = useCallback(() => {
    if (!isEligible || isPausedUi) return;
    if (stored.step !== 'profile_edit' || !isProfileEditPhase2) return;
    advanceToSearchStep();
  }, [advanceToSearchStep, isEligible, isPausedUi, isProfileEditPhase2, stored.step]);

  useEffect(() => {
    onSkillCreatedHandlerSet?.(notifySkillCreated);
    return () => {
      onSkillCreatedHandlerSet?.(null);
    };
  }, [notifySkillCreated, onSkillCreatedHandlerSet]);

  const registerProfileEditClick = useCallback((): boolean => {
    if (!isEligible || isPausedUi) return false;
    if (stored.step !== 'profile_edit') return false;

    setIsPausedUi(false);
    onOpenEditProfile();
    setState({ version: 1, status: 'in_progress', step: 'edit_form' });
    return true;
  }, [isEligible, isPausedUi, onOpenEditProfile, setState, stored.step]);

  const registerProfileSkillsClick = useCallback((): boolean => {
    const skillsAction = resolveProfileSkillsClickAction(
      stored.step,
      isProfileEditPhase2,
      isEligible && !isPausedUi,
      profileHighlightTargetRef.current,
    );

    if (skillsAction === 'default_navigate') return true;
    if (skillsAction === 'mark_phase_2_and_navigate') {
      advanceProfileEditToPhase2();
      return true;
    }

    advanceProfileEditToPhase2();
    return false;
  }, [
    advanceProfileEditToPhase2,
    isEligible,
    isPausedUi,
    isProfileEditPhase2,
    stored.step,
  ]);

  useEffect(() => {
    if (!isEligible || isPausedUi || isProfileEditMode) return;
    if (!canRestoreProfileEditPhase2(stored)) {
      setIsProfileEditPhase2(false);
      clearMobileOnboardingResumePhase2();
      return;
    }
    if (readValidProfileEditPhase2(stored, isProfileEditPhase2)) {
      setIsProfileEditPhase2(true);
    } else {
      setIsProfileEditPhase2(false);
    }
  }, [isEligible, isPausedUi, isProfileEditMode, isProfileEditPhase2, stored]);

  const value = useMemo<MobileOnboardingContextValue>(
    () => ({
      isEligible,
      isOverlayVisible,
      isProfileEditPhase2,
      step: stored.step,
      goNext,
      skip,
      pause,
      close,
      complete,
      notifyProfileSaved,
      registerProfileIconClick,
      registerProfileEditClick,
      registerProfileSkillsClick,
      syncProfileHighlightTarget,
    }),
    [
      close,
      complete,
      goNext,
      isEligible,
      isOverlayVisible,
      isProfileEditPhase2,
      notifyProfileSaved,
      pause,
      registerProfileEditClick,
      registerProfileIconClick,
      registerProfileSkillsClick,
      skip,
      stored.step,
      syncProfileHighlightTarget,
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
