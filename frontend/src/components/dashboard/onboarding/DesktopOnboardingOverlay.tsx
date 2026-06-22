'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDesktopOnboarding } from './DesktopOnboardingContext';
import {
  type TargetRect,
  useOnboardingCombinedTargetRect,
  useOnboardingTargetRect,
} from './useOnboardingTargetRect';
import type { ProfileEditHighlightTarget } from './profileEditTutorialLogic';
import {
  DESKTOP_ONBOARDING_MAIN_STEPS,
  getDesktopOnboardingDisplayStep,
  getDesktopOnboardingStepContent,
} from './desktopOnboardingOverlayContent';
import {
  DESKTOP_ONBOARDING_OVERLAY_Z,
  DESKTOP_ONBOARDING_SPOTLIGHT_PADDING,
  DesktopOnboardingSpotlight,
} from './DesktopOnboardingSpotlight';
import { DESKTOP_ONBOARDING_TARGETS } from './desktopOnboardingTargets';

const PROFILE_HIGHLIGHT_ROTATION_MS = 6000;

const SEARCH_INPUT_AREA_SELECTORS = [
  DESKTOP_ONBOARDING_TARGETS.searchInput,
  DESKTOP_ONBOARDING_TARGETS.searchFilter,
];
const REQUESTS_AREA_SELECTORS = [DESKTOP_ONBOARDING_TARGETS.requestsTabs];
const MESSAGES_AREA_SELECTORS = [
  DESKTOP_ONBOARDING_TARGETS.messagesTabs,
  DESKTOP_ONBOARDING_TARGETS.messagesCreateGroup,
];

const DESKTOP_MAIN_CONTENT_SELECTOR = '[data-dashboard-main]';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function alignTooltipAnchorToMainColumn(panelRect: TargetRect, mainRect: TargetRect): TargetRect {
  return {
    top: panelRect.top,
    left: mainRect.left,
    width: mainRect.width,
    height: panelRect.height,
  };
}

function getBelowAnchorTooltipStyle({
  tooltipRect,
  tooltipHeight,
  viewportPadding = 24,
  offset = 20,
  maxWidth = 360,
}: {
  tooltipRect: TargetRect;
  tooltipHeight: number;
  viewportPadding?: number;
  offset?: number;
  maxWidth?: number;
}): React.CSSProperties {
  const tooltipWidth = Math.min(maxWidth, window.innerWidth - viewportPadding * 2);
  const anchorCenterX = tooltipRect.left + tooltipRect.width / 2;
  const clampedCenterX = clamp(
    anchorCenterX,
    viewportPadding + tooltipWidth / 2,
    window.innerWidth - viewportPadding - tooltipWidth / 2,
  );
  const belowTop =
    tooltipRect.top + tooltipRect.height + DESKTOP_ONBOARDING_SPOTLIGHT_PADDING + offset;
  const aboveTop =
    tooltipRect.top - tooltipHeight - DESKTOP_ONBOARDING_SPOTLIGHT_PADDING - offset;
  const shouldPlaceAbove = belowTop + tooltipHeight > window.innerHeight - viewportPadding;

  return {
    left: clampedCenterX,
    width: tooltipWidth,
    transform: 'translateX(-50%)',
    top: shouldPlaceAbove
      ? Math.max(viewportPadding, aboveTop)
      : Math.max(viewportPadding, belowTop),
  };
}

export default function DesktopOnboardingOverlay() {
  const { t } = useLanguage();
  const {
    isOverlayVisible,
    step,
    goNext,
    goBack,
    canGoBack,
    pause,
    close,
    isProfileEditPhase2,
    syncProfileHighlightTarget,
  } = useDesktopOnboarding();
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);
  const [profileHighlightTarget, setProfileHighlightTarget] =
    useState<ProfileEditHighlightTarget>('edit');
  const [profileEditMeasurePass, setProfileEditMeasurePass] = useState(0);
  const [searchMeasurePass, setSearchMeasurePass] = useState(0);
  const [requestsMeasurePass, setRequestsMeasurePass] = useState(0);
  const [messagesMeasurePass, setMessagesMeasurePass] = useState(0);

  const displayStep = getDesktopOnboardingDisplayStep(step);

  useEffect(() => {
    setTooltipHeight(180);
  }, [displayStep]);
  const stepIndex = displayStep ? DESKTOP_ONBOARDING_MAIN_STEPS.indexOf(displayStep) + 1 : 1;
  const activeProfileHighlightTarget: ProfileEditHighlightTarget =
    isProfileEditPhase2 || profileHighlightTarget === 'skills' ? 'skills' : 'edit';

  useEffect(() => {
    if (!isOverlayVisible || displayStep !== 'profile_edit') {
      setProfileHighlightTarget('edit');
      syncProfileHighlightTarget('edit');
      return;
    }

    if (isProfileEditPhase2) {
      setProfileHighlightTarget('skills');
      syncProfileHighlightTarget('skills');
      return;
    }

    setProfileHighlightTarget('edit');
    syncProfileHighlightTarget('edit');
    const intervalId = window.setInterval(() => {
      setProfileHighlightTarget((current) => {
        const next = current === 'edit' ? 'skills' : 'edit';
        syncProfileHighlightTarget(next);
        return next;
      });
    }, PROFILE_HIGHLIGHT_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [displayStep, isOverlayVisible, isProfileEditPhase2, syncProfileHighlightTarget]);

  useLayoutEffect(() => {
    if (!isOverlayVisible || displayStep !== 'profile_edit') return;

    setProfileEditMeasurePass((pass) => pass + 1);
    const timeoutId = window.setTimeout(() => {
      setProfileEditMeasurePass((pass) => pass + 1);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [displayStep, isOverlayVisible]);

  useLayoutEffect(() => {
    if (!isOverlayVisible || (displayStep !== 'search' && displayStep !== 'help_request')) {
      return;
    }

    setSearchMeasurePass((pass) => pass + 1);
    const timeoutIds = [100, 250].map((delay) =>
      window.setTimeout(() => {
        setSearchMeasurePass((pass) => pass + 1);
      }, delay),
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [displayStep, isOverlayVisible]);

  useLayoutEffect(() => {
    if (!isOverlayVisible || displayStep !== 'requests') return;

    setRequestsMeasurePass((pass) => pass + 1);
    const timeoutId = window.setTimeout(() => {
      setRequestsMeasurePass((pass) => pass + 1);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [displayStep, isOverlayVisible]);

  useLayoutEffect(() => {
    if (!isOverlayVisible || displayStep !== 'messages') return;

    setMessagesMeasurePass((pass) => pass + 1);
    const timeoutIds = [100, 350, 1000].map((delay) =>
      window.setTimeout(() => {
        setMessagesMeasurePass((pass) => pass + 1);
      }, delay),
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [displayStep, isOverlayVisible]);

  const targetSelector = useMemo(() => {
    if (!isOverlayVisible || !displayStep) return null;
    if (displayStep === 'navigation') return DESKTOP_ONBOARDING_TARGETS.leftNavigation;
    if (displayStep === 'profile_icon') return DESKTOP_ONBOARDING_TARGETS.profileIcon;
    if (displayStep === 'profile_edit') {
      const shouldUseSkillsTarget = profileHighlightTarget === 'skills' || isProfileEditPhase2;
      if (
        shouldUseSkillsTarget &&
        typeof document !== 'undefined' &&
        document.querySelector(DESKTOP_ONBOARDING_TARGETS.profileSkillsButton)
      ) {
        return DESKTOP_ONBOARDING_TARGETS.profileSkillsButton;
      }

      return DESKTOP_ONBOARDING_TARGETS.profileEditButton;
    }
    return null;
  }, [displayStep, isOverlayVisible, isProfileEditPhase2, profileHighlightTarget]);

  const isSearchStep = displayStep === 'search';
  const isHelpRequestStep = displayStep === 'help_request';
  const isRequestsStep = displayStep === 'requests';
  const isMessagesStep = displayStep === 'messages';
  const isDashboardFinishStep = displayStep === 'dashboard_finish';

  const rect = useOnboardingTargetRect(
    isSearchStep || isRequestsStep || isMessagesStep || isDashboardFinishStep
      ? null
      : targetSelector,
    isOverlayVisible &&
      !isSearchStep &&
      !isRequestsStep &&
      !isMessagesStep &&
      !isDashboardFinishStep,
    displayStep === 'profile_edit'
      ? `${profileEditMeasurePass}:${isProfileEditPhase2}`
      : displayStep ?? undefined,
  );
  const searchMeasureKey = `desktop-search:${searchMeasurePass}`;
  const isSearchSceneStep = isSearchStep || isHelpRequestStep;
  const searchInputAreaRect = useOnboardingCombinedTargetRect(
    isSearchSceneStep ? SEARCH_INPUT_AREA_SELECTORS : null,
    isOverlayVisible && isSearchSceneStep,
    searchMeasureKey,
  );
  const requestsMeasureKey = `desktop-requests:${requestsMeasurePass}`;
  const requestsAreaRect = useOnboardingCombinedTargetRect(
    isRequestsStep ? REQUESTS_AREA_SELECTORS : null,
    isOverlayVisible && isRequestsStep,
    requestsMeasureKey,
  );
  const requestsNavRect = useOnboardingTargetRect(
    isRequestsStep ? DESKTOP_ONBOARDING_TARGETS.requestsNavIcon : null,
    isOverlayVisible && isRequestsStep,
    requestsMeasureKey,
  );
  const messagesMeasureKey = `desktop-messages:${messagesMeasurePass}`;
  const messagesAreaRect = useOnboardingCombinedTargetRect(
    isMessagesStep ? MESSAGES_AREA_SELECTORS : null,
    isOverlayVisible && isMessagesStep,
    messagesMeasureKey,
  );
  const messagesNavRect = useOnboardingTargetRect(
    isMessagesStep ? DESKTOP_ONBOARDING_TARGETS.messagesNavIcon : null,
    isOverlayVisible && isMessagesStep,
    messagesMeasureKey,
  );
  const mainContentRect = useOnboardingTargetRect(
    isMessagesStep ? DESKTOP_MAIN_CONTENT_SELECTOR : null,
    isOverlayVisible && isMessagesStep,
    messagesMeasureKey,
  );
  const messagesTooltipAnchorRect = useMemo(() => {
    if (!isMessagesStep) return null;
    if (messagesAreaRect && mainContentRect) {
      return alignTooltipAnchorToMainColumn(messagesAreaRect, mainContentRect);
    }
    return messagesAreaRect ?? messagesNavRect;
  }, [isMessagesStep, mainContentRect, messagesAreaRect, messagesNavRect]);

  useEffect(() => {
    if (!isOverlayVisible || !isRequestsStep || requestsAreaRect || requestsNavRect) return;

    const intervalId = window.setInterval(() => {
      setRequestsMeasurePass((pass) => pass + 1);
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOverlayVisible, isRequestsStep, requestsAreaRect, requestsNavRect]);

  useEffect(() => {
    if (!isOverlayVisible || !isMessagesStep || messagesAreaRect || messagesNavRect) return;

    const intervalId = window.setInterval(() => {
      setMessagesMeasurePass((pass) => pass + 1);
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isMessagesStep, isOverlayVisible, messagesAreaRect, messagesNavRect]);

  const tooltipRect = isSearchSceneStep
    ? searchInputAreaRect
    : isRequestsStep
      ? requestsAreaRect ?? requestsNavRect
      : isMessagesStep
        ? messagesTooltipAnchorRect
        : isDashboardFinishStep
          ? null
          : rect;
  const spotlightRects = useMemo(() => {
    if (!isOverlayVisible) return [];

    if (isDashboardFinishStep) return [];

    if (isSearchSceneStep) {
      return searchInputAreaRect ? [searchInputAreaRect] : [];
    }

    if (isRequestsStep) {
      return [requestsAreaRect, requestsNavRect].filter((item): item is TargetRect => item != null);
    }

    if (isMessagesStep) {
      return [messagesAreaRect, messagesNavRect].filter((item): item is TargetRect => item != null);
    }

    return rect ? [rect] : [];
  }, [
    isDashboardFinishStep,
    isMessagesStep,
    isOverlayVisible,
    isRequestsStep,
    isSearchSceneStep,
    messagesAreaRect,
    messagesNavRect,
    rect,
    requestsAreaRect,
    requestsNavRect,
    searchInputAreaRect,
  ]);

  const config = useMemo(
    () => getDesktopOnboardingStepContent(displayStep, activeProfileHighlightTarget, t),
    [activeProfileHighlightTarget, displayStep, t],
  );

  const backLabel = t('common.back', 'Spat');
  const nextLabel = t('onboarding.mobile.next', 'Dalej');
  const pauseLabel = t('onboarding.mobile.later', 'Neskor');
  const finishCtaLabel = t(
    'tutorial.dashboardFinishStep.cta',
    'Zacat pouzivat Svaply',
  );

  const handleNext = () => {
    goNext(
      displayStep === 'profile_edit'
        ? { profileHighlightTarget: activeProfileHighlightTarget }
        : undefined,
    );
  };

  useEffect(() => {
    if (!isOverlayVisible || displayStep !== 'help_request') return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && tooltipRef.current?.contains(target)) return;
      goNext();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [displayStep, goNext, isOverlayVisible]);

  useEffect(() => {
    if (!isOverlayVisible || displayStep !== 'dashboard_finish') return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && tooltipRef.current?.contains(target)) return;
      goNext();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [displayStep, goNext, isOverlayVisible]);

  useLayoutEffect(() => {
    if (!isOverlayVisible || !config) return;
    const nextHeight = tooltipRef.current?.getBoundingClientRect().height;
    if (!nextHeight) return;
    setTooltipHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, [
    backLabel,
    canGoBack,
    config,
    finishCtaLabel,
    isOverlayVisible,
    nextLabel,
    pauseLabel,
    stepIndex,
  ]);

  if (!isOverlayVisible || !config) return null;

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: DESKTOP_ONBOARDING_OVERLAY_Z + 1,
  };

  if (tooltipRect && typeof window !== 'undefined') {
    const viewportPadding = 24;
    const offset = 20;
    const tooltipWidth = Math.min(isHelpRequestStep ? 420 : 380, window.innerWidth - viewportPadding * 2);
    const anchorCenterY =
      displayStep === 'navigation'
        ? tooltipRect.top + Math.min(tooltipRect.height / 2, 260)
        : tooltipRect.top + tooltipRect.height / 2;

    if (isRequestsStep || isMessagesStep) {
      Object.assign(
        tooltipStyle,
        getBelowAnchorTooltipStyle({
          tooltipRect,
          tooltipHeight,
          viewportPadding,
          offset,
        }),
      );
    } else {
      const preferredLeft =
        tooltipRect.left + tooltipRect.width + DESKTOP_ONBOARDING_SPOTLIGHT_PADDING + offset;
      const maxLeft = window.innerWidth - tooltipWidth - viewportPadding;

      tooltipStyle.left = clamp(preferredLeft, viewportPadding, maxLeft);
      tooltipStyle.top = clamp(
        anchorCenterY - tooltipHeight / 2,
        viewportPadding,
        window.innerHeight - tooltipHeight - viewportPadding,
      );
      tooltipStyle.width = tooltipWidth;
    }
  } else if (typeof window !== 'undefined') {
    const viewportPadding = 24;
    const tooltipWidth = Math.min(420, window.innerWidth - viewportPadding * 2);

    tooltipStyle.left = '50%';
    tooltipStyle.top = '50%';
    tooltipStyle.width = tooltipWidth;
    tooltipStyle.transform = 'translate(-50%, -50%)';
  } else {
    tooltipStyle.left = 24;
    tooltipStyle.top = 24;
    tooltipStyle.width = 380;
  }

  const tooltipAnimation = tooltipStyle.transform
    ? undefined
    : 'desktopOnboardingFadeIn 0.35s ease-out';

  return (
    <>
      <DesktopOnboardingSpotlight rects={spotlightRects} />
      <div
        ref={tooltipRef}
        data-onboarding-overlay
        data-desktop-onboarding-overlay
        role="dialog"
        aria-modal="false"
        aria-labelledby="desktop-onboarding-title"
        className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-xl dark:border-purple-800/60 dark:bg-gray-950"
        style={{
          ...tooltipStyle,
          animation: isDashboardFinishStep ? undefined : tooltipAnimation,
        }}
      >
        {!isDashboardFinishStep && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {DESKTOP_ONBOARDING_MAIN_STEPS.map((item, index) => {
                const i = index + 1;
                return (
                  <span
                    key={item}
                    className={`h-1.5 rounded-full transition-all ${
                      i === stepIndex ? 'w-6 bg-purple-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={close}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={t('common.close', 'Zavriet')}
            >
              x
            </button>
          </div>
        )}

        <h3
          id="desktop-onboarding-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {config.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {config.body}
        </p>

        {isHelpRequestStep && (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <video
              src="/onboarding/request-offer-demo-desktop.mp4"
              aria-label={t(
                'tutorial.helpRequestStep.gifAlt',
                'Ukazka poziadania o ponuku na profile pouzivatela',
              )}
              className="block max-h-[44vh] w-full object-contain"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
        )}

        {isDashboardFinishStep ? (
          <button
            type="button"
            onClick={handleNext}
            className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            {finishCtaLabel}
          </button>
        ) : (
          <>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
              >
                {nextLabel}
              </button>
              {canGoBack && (
                <button
                  type="button"
                  onClick={goBack}
                  className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                >
                  {backLabel}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={pause}
              className="mt-3 w-full text-center text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400"
            >
              {pauseLabel}
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        :global(.desktop-onboarding-spotlight-pulse) {
          animation: desktopOnboardingSvgPulse 2.2s ease-in-out infinite;
        }

        @keyframes desktopOnboardingSvgPulse {
          0%,
          100% {
            opacity: 0.94;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes desktopOnboardingFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
