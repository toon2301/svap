'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobileState } from '@/hooks/useIsMobile';
import { logClientError } from '@/utils/clientLogging';
import { updateDesktopOnboardingState } from './desktopOnboardingApi';
import {
  clearDesktopOnboardingAwaitingSkillCreation,
  clearDesktopOnboardingPostponedForSession,
  clearDesktopOnboardingResumePhase2,
  isDesktopOnboardingAwaitingSkillCreation,
  isDesktopOnboardingPostponedForSession,
  isDesktopOnboardingResumePhase2,
  postponeDesktopOnboardingForSession,
  setDesktopOnboardingAwaitingSkillCreation,
  setDesktopOnboardingResumePhase2,
} from './desktopOnboardingSession';
import {
  isDesktopOnboardingBlockedByUi,
  isDesktopOnboardingStepSceneReady,
} from './desktopOnboardingScene';
import {
  getInitialDesktopOnboardingState,
  isDesktopOnboardingFinished,
  isDesktopOnboardingServerStateBehind,
  normalizeDesktopOnboardingState,
  type DesktopOnboardingState,
  type DesktopOnboardingStep,
} from './desktopOnboardingStorage';
import {
  canGoBackDesktopOnboarding,
  resolveDesktopOnboardingBackTarget,
  type DesktopOnboardingBackModule,
} from './onboardingBackNavigation';
import {
  type ProfileEditHighlightTarget,
  resolveProfileEditGoNextAction,
  resolveProfileSkillsClickAction,
} from './profileEditTutorialLogic';

type DesktopOnboardingGoNextOptions = {
  profileHighlightTarget?: ProfileEditHighlightTarget;
};

type DesktopOnboardingContextValue = {
  isEligible: boolean;
  isOverlayVisible: boolean;
  isProfileEditPhase2: boolean;
  step: DesktopOnboardingStep;
  goNext: (options?: DesktopOnboardingGoNextOptions) => void;
  goBack: () => void;
  canGoBack: boolean;
  skip: () => void;
  pause: () => void;
  close: () => void;
  notifyProfileSaved: () => void;
  registerProfileEditClick: () => boolean;
  registerProfileSkillsClick: () => boolean;
  syncProfileHighlightTarget: (target: ProfileEditHighlightTarget) => void;
};

const DesktopOnboardingContext = createContext<DesktopOnboardingContextValue | null>(null);

type DesktopOnboardingProviderProps = {
  children: React.ReactNode;
  activeModule: string;
  isSearchOpen?: boolean;
  isProfileEditMode?: boolean;
  isRightSidebarOpen?: boolean;
  isNotificationsPanelOpen?: boolean;
  isMobileMenuOpen?: boolean;
  onOpenHome: () => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSearch: () => void;
  onCloseSearch?: () => void;
  onOpenRequests: () => void;
  onOpenMessages: () => void;
  onSkillCreatedHandlerSet?: (handler: (() => void) | null) => void;
  serverState?: DesktopOnboardingState | null;
};

function readValidPausedUi(state: DesktopOnboardingState): boolean {
  if (isDesktopOnboardingFinished(state.status) || state.status !== 'in_progress') {
    clearDesktopOnboardingPostponedForSession();
    return false;
  }
  return isDesktopOnboardingPostponedForSession();
}

function canRestoreProfileEditPhase2(state: DesktopOnboardingState): boolean {
  return state.status === 'in_progress' && state.step === 'profile_edit';
}

function readValidProfileEditPhase2(
  state: DesktopOnboardingState,
  currentValue: boolean,
): boolean {
  if (!canRestoreProfileEditPhase2(state)) {
    clearDesktopOnboardingResumePhase2();
    return false;
  }
  return currentValue || isDesktopOnboardingResumePhase2();
}

function isSameDesktopOnboardingState(
  left: DesktopOnboardingState | null,
  right: DesktopOnboardingState,
): boolean {
  return left?.status === right.status && left.step === right.step;
}

type DesktopOnboardingPersistRequest = {
  next: DesktopOnboardingState;
  previous: DesktopOnboardingState;
};

export function DesktopOnboardingProvider({
  children,
  activeModule,
  isSearchOpen = false,
  isProfileEditMode = false,
  isRightSidebarOpen = false,
  isNotificationsPanelOpen = false,
  isMobileMenuOpen = false,
  onOpenHome,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSearch,
  onCloseSearch,
  onOpenRequests,
  onOpenMessages,
  onSkillCreatedHandlerSet,
  serverState,
}: DesktopOnboardingProviderProps) {
  const { isMobile, isResolved } = useIsMobileState();
  const { updateUser } = useAuth();
  const [stored, setStored] = useState<DesktopOnboardingState>(() =>
    getInitialDesktopOnboardingState(serverState),
  );
  const storedRef = useRef(stored);
  const pendingStateRef = useRef<DesktopOnboardingState | null>(null);
  const persistInFlightRef = useRef(false);
  const queuedPersistRef = useRef<DesktopOnboardingPersistRequest | null>(null);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPausedUi, setIsPausedUi] = useState(false);
  const [isProfileEditPhase2, setIsProfileEditPhase2] = useState(false);
  const hasOpenedHomeRef = useRef(false);
  const hasOpenedSearchRef = useRef(false);
  const suppressSearchAutoOpenRef = useRef(false);
  const previousModuleRef = useRef(activeModule);
  const previousEditModeRef = useRef(isProfileEditMode);
  const profileHighlightTargetRef = useRef<ProfileEditHighlightTarget>('edit');
  const serverOnboardingStatus = serverState?.status ?? null;
  const serverOnboardingStep = serverState?.step ?? null;

  useEffect(() => {
    if (!serverOnboardingStatus || !serverOnboardingStep) {
      setIsStorageReady(false);
      setIsPausedUi(false);
      setIsProfileEditPhase2(false);
      clearDesktopOnboardingPostponedForSession();
      clearDesktopOnboardingResumePhase2();
      clearDesktopOnboardingAwaitingSkillCreation();
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
    const hasPendingServerMismatch =
      pendingStateRef.current != null &&
      !isDesktopOnboardingFinished(initial.status) &&
      !isSameDesktopOnboardingState(pendingStateRef.current, initial);
    const shouldKeepLocalState =
      hasPendingServerMismatch ||
      isDesktopOnboardingServerStateBehind(storedRef.current, initial);
    const nextStored = shouldKeepLocalState ? storedRef.current : initial;
    const shouldResumePhase2 = readValidProfileEditPhase2(nextStored, isProfileEditPhase2);

    storedRef.current = nextStored;
    setStored(nextStored);
    if (isDesktopOnboardingFinished(nextStored.status)) {
      clearDesktopOnboardingPostponedForSession();
      clearDesktopOnboardingResumePhase2();
      clearDesktopOnboardingAwaitingSkillCreation();
      setIsPausedUi(false);
      setIsProfileEditPhase2(false);
      profileHighlightTargetRef.current = 'edit';
    } else {
      setIsPausedUi(readValidPausedUi(nextStored));
      setIsProfileEditPhase2(shouldResumePhase2);
      profileHighlightTargetRef.current = shouldResumePhase2 ? 'skills' : 'edit';
    }
    setIsStorageReady(true);
    hasOpenedHomeRef.current = false;
    hasOpenedSearchRef.current = false;
    suppressSearchAutoOpenRef.current = false;
  }, [isProfileEditPhase2, serverOnboardingStatus, serverOnboardingStep]);

  const runPersistQueue = useCallback(() => {
    if (persistInFlightRef.current || !queuedPersistRef.current) return;

    const request = queuedPersistRef.current;
    queuedPersistRef.current = null;
    persistInFlightRef.current = true;

    void updateDesktopOnboardingState(request.next)
      .then((serverNext) => {
        const hasQueuedState = queuedPersistRef.current != null;
        const currentBeforeApply = storedRef.current;
        const isCurrentRequestState = isSameDesktopOnboardingState(
          currentBeforeApply,
          request.next,
        );
        const shouldApplyServerState =
          isDesktopOnboardingFinished(serverNext.status) ||
          (isCurrentRequestState && !hasQueuedState);

        if (shouldApplyServerState) {
          updateUser({ desktop_onboarding: serverNext });
        }

        setStored((current) => {
          const isSameRequestState =
            current.status === request.next.status && current.step === request.next.step;
          if (shouldApplyServerState && isSameRequestState) {
            if (isSameDesktopOnboardingState(pendingStateRef.current, request.next)) {
              pendingStateRef.current = null;
            }
            storedRef.current = serverNext;
            return serverNext;
          }

          if (isDesktopOnboardingFinished(serverNext.status) && shouldApplyServerState) {
            pendingStateRef.current = null;
            storedRef.current = serverNext;
            return serverNext;
          }

          storedRef.current = current;
          return current;
        });
      })
      .catch((error) => {
        setStored((current) => {
          const hasQueuedState = queuedPersistRef.current != null;
          const isFailedOptimisticState =
            current.status === request.next.status && current.step === request.next.step;
          const shouldRollback =
            isFailedOptimisticState &&
            !hasQueuedState &&
            isSameDesktopOnboardingState(pendingStateRef.current, request.next);
          const nextCurrent = shouldRollback ? request.previous : current;
          if (shouldRollback) {
            pendingStateRef.current = null;
          }
          storedRef.current = nextCurrent;
          return nextCurrent;
        });
        logClientError('Desktop onboarding state update failed', error);
      })
      .finally(() => {
        persistInFlightRef.current = false;
        runPersistQueue();
      });
  }, [updateUser]);

  const persistState = useCallback((next: DesktopOnboardingState, previous: DesktopOnboardingState) => {
    queuedPersistRef.current = { next, previous };
    runPersistQueue();
  }, [runPersistQueue]);

  const setState = useCallback(
    (next: DesktopOnboardingState) => {
      const previous = storedRef.current;
      storedRef.current = next;
      pendingStateRef.current = next;
      setStored(next);
      persistState(next, previous);
    },
    [persistState],
  );

  const isFinished = isDesktopOnboardingFinished(stored.status);
  const isEligible = isStorageReady && isResolved && !isMobile && !isFinished;
  const isBlockedByUi = useMemo(
    () =>
      isDesktopOnboardingBlockedByUi({
        activeModule,
        isRightSidebarOpen,
        isSearchOpen,
        isNotificationsPanelOpen,
        isMobileMenuOpen,
        onboardingStep: stored.step,
      }),
    [
      activeModule,
      isMobileMenuOpen,
      isNotificationsPanelOpen,
      isRightSidebarOpen,
      isSearchOpen,
      stored.step,
    ],
  );
  const isStepSceneReady = useMemo(
    () => isDesktopOnboardingStepSceneReady(stored.step, activeModule, isSearchOpen),
    [activeModule, isSearchOpen, stored.step],
  );

  const isOverlayVisible =
    isEligible &&
    !isPausedUi &&
    !isProfileEditMode &&
    !isBlockedByUi &&
    stored.status === 'in_progress' &&
    isStepSceneReady;
  const canGoBack = canGoBackDesktopOnboarding(stored.step, isProfileEditPhase2);

  useEffect(() => {
    if (!isEligible || isPausedUi || isBlockedByUi || stored.status !== 'in_progress') return;
    if (stored.step !== 'navigation' || activeModule === 'home') return;
    if (hasOpenedHomeRef.current) return;
    hasOpenedHomeRef.current = true;
    onOpenHome();
  }, [activeModule, isBlockedByUi, isEligible, isPausedUi, onOpenHome, stored.status, stored.step]);

  useEffect(() => {
    if (!isEligible || isPausedUi || isBlockedByUi || stored.status !== 'in_progress') return;
    if (stored.step !== 'search' && stored.step !== 'help_request') return;
    if (isSearchOpen) return;
    if (suppressSearchAutoOpenRef.current) return;
    if (hasOpenedSearchRef.current) return;
    hasOpenedSearchRef.current = true;
    onOpenSearch();
  }, [
    isBlockedByUi,
    isEligible,
    isPausedUi,
    isSearchOpen,
    onOpenSearch,
    stored.status,
    stored.step,
  ]);

  useEffect(() => {
    if (stored.step !== 'search' && stored.step !== 'help_request') {
      suppressSearchAutoOpenRef.current = false;
    }
  }, [stored.step]);

  useEffect(() => {
    if (!isEligible || isPausedUi) return;

    const previousModule = previousModuleRef.current;
    previousModuleRef.current = activeModule;
    if (previousModule === activeModule) return;

    if (stored.step === 'profile_icon' && activeModule === 'profile') {
      setState({ ...stored, step: 'profile_edit' });
    }
  }, [activeModule, isEligible, isPausedUi, setState, stored]);

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

  useEffect(() => {
    if (!isEligible || isPausedUi || isProfileEditMode) return;
    if (!canRestoreProfileEditPhase2(stored)) {
      setIsProfileEditPhase2(false);
      clearDesktopOnboardingResumePhase2();
      return;
    }
    setIsProfileEditPhase2(readValidProfileEditPhase2(stored, isProfileEditPhase2));
  }, [isEligible, isPausedUi, isProfileEditMode, isProfileEditPhase2, stored]);

  const finishOnboarding = useCallback(
    (completedStep: DesktopOnboardingStep = 'dashboard_finish') => {
      clearDesktopOnboardingPostponedForSession();
      clearDesktopOnboardingResumePhase2();
      clearDesktopOnboardingAwaitingSkillCreation();
      setIsPausedUi(false);
      setIsProfileEditPhase2(false);
      profileHighlightTargetRef.current = 'edit';
      setState({ version: 1, status: 'completed', step: completedStep });
    },
    [setState],
  );

  const advanceProfileEditToPhase2 = useCallback(() => {
    setDesktopOnboardingResumePhase2();
    setIsProfileEditPhase2(true);
    profileHighlightTargetRef.current = 'skills';
  }, []);

  const advanceToSearchStep = useCallback(() => {
    clearDesktopOnboardingResumePhase2();
    clearDesktopOnboardingAwaitingSkillCreation();
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

  const openBackTargetModule = useCallback(
    (module?: DesktopOnboardingBackModule) => {
      if (module === 'home') {
        onOpenHome();
        onCloseSearch?.();
      } else if (module === 'profile') {
        onOpenProfile();
        onCloseSearch?.();
      } else if (module === 'search') {
        onOpenSearch();
      } else if (module === 'requests') {
        onOpenRequests();
        onCloseSearch?.();
      }
    },
    [onCloseSearch, onOpenHome, onOpenProfile, onOpenRequests, onOpenSearch],
  );

  const goNext = useCallback((options?: DesktopOnboardingGoNextOptions) => {
    if (!isEligible) return;
    setIsPausedUi(false);

    if (stored.step === 'navigation') {
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
      const action = resolveProfileEditGoNextAction(
        stored.step,
        isProfileEditPhase2,
        highlightedTarget,
      );
      if (action === 'advance_to_search') {
        advanceToSearchStep();
        return;
      }
      if (action === 'advance_to_phase_2') {
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
    advanceToRequestsStep,
    advanceToSearchStep,
    finishOnboarding,
    isEligible,
    isProfileEditPhase2,
    onOpenProfile,
    setState,
    stored.step,
  ]);

  const goBack = useCallback(() => {
    if (!isEligible) return;

    const current = storedRef.current;
    const target = resolveDesktopOnboardingBackTarget(current.step, isProfileEditPhase2);
    if (!target) return;

    setIsPausedUi(false);

    if (target.profileEditPhase2) {
      setDesktopOnboardingResumePhase2();
    } else {
      clearDesktopOnboardingResumePhase2();
    }
    setIsProfileEditPhase2(target.profileEditPhase2);
    profileHighlightTargetRef.current = target.profileEditPhase2 ? 'skills' : 'edit';

    const isLeavingSearchScene =
      (current.step === 'search' || current.step === 'help_request') &&
      target.openModule !== 'search';
    suppressSearchAutoOpenRef.current = isLeavingSearchScene;

    if (target.step !== current.step) {
      setState({ version: 1, status: 'in_progress', step: target.step });
    }
    openBackTargetModule(target.openModule);
  }, [
    isEligible,
    isProfileEditPhase2,
    openBackTargetModule,
    setState,
  ]);

  const skip = useCallback(() => {
    clearDesktopOnboardingPostponedForSession();
    clearDesktopOnboardingResumePhase2();
    clearDesktopOnboardingAwaitingSkillCreation();
    setIsPausedUi(false);
    setIsProfileEditPhase2(false);
    profileHighlightTargetRef.current = 'edit';
    setState({ version: 1, status: 'skipped', step: stored.step });
  }, [setState, stored.step]);

  const pause = useCallback(() => {
    postponeDesktopOnboardingForSession();
    setIsPausedUi(true);
  }, []);

  const notifyProfileSaved = useCallback(() => {
    if (!isEligible || isPausedUi) return;
    if (stored.step === 'edit_form') {
      advanceProfileEditToPhase2();
    }
  }, [advanceProfileEditToPhase2, isEligible, isPausedUi, stored.step]);

  const notifySkillCreated = useCallback(() => {
    if (!isEligible || isPausedUi) return;
    if (stored.step !== 'profile_edit') return;
    if (!isProfileEditPhase2 && !isDesktopOnboardingAwaitingSkillCreation()) return;
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
    const action = resolveProfileSkillsClickAction(
      stored.step,
      isProfileEditPhase2,
      isEligible && !isPausedUi,
      profileHighlightTargetRef.current,
    );

    if (action === 'default_navigate') return true;
    if (action === 'mark_phase_2_and_navigate') {
      advanceProfileEditToPhase2();
      setDesktopOnboardingAwaitingSkillCreation();
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

  const syncProfileHighlightTarget = useCallback((target: ProfileEditHighlightTarget) => {
    profileHighlightTargetRef.current = target;
  }, []);

  const close = skip;

  const value = useMemo<DesktopOnboardingContextValue>(
    () => ({
      isEligible,
      isOverlayVisible,
      isProfileEditPhase2,
      step: stored.step,
      goNext,
      goBack,
      canGoBack,
      skip,
      pause,
      close,
      notifyProfileSaved,
      registerProfileEditClick,
      registerProfileSkillsClick,
      syncProfileHighlightTarget,
    }),
    [
      canGoBack,
      close,
      goBack,
      goNext,
      isEligible,
      isOverlayVisible,
      isProfileEditPhase2,
      notifyProfileSaved,
      pause,
      registerProfileEditClick,
      registerProfileSkillsClick,
      skip,
      stored.step,
      syncProfileHighlightTarget,
    ],
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

export function useOptionalDesktopOnboarding(): DesktopOnboardingContextValue | null {
  return useContext(DesktopOnboardingContext);
}
