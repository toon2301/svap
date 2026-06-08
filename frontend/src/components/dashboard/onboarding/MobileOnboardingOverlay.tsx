'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ONBOARDING_TARGETS, useMobileOnboarding } from './MobileOnboardingContext';
import type { ProfileEditHighlightTarget } from './profileEditTutorialLogic';
import {
  type TargetRect,
  useOnboardingCombinedTargetRect,
  useOnboardingTargetRect,
} from './useOnboardingTargetRect';

const SPOTLIGHT_PADDING = 8;
const OVERLAY_Z = 10000;
const PROFILE_HIGHLIGHT_ROTATION_MS = 6000;

const SEARCH_INPUT_AREA_SELECTORS: string[] = [
  ONBOARDING_TARGETS.searchInput,
  ONBOARDING_TARGETS.searchFilter,
];
const REQUESTS_AREA_SELECTORS: string[] = [
  ONBOARDING_TARGETS.requestsTabs,
];

function paddedSpotlightRect(rect: TargetRect): TargetRect {
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function SpotlightOverlay({ rects }: { rects: TargetRect[] }) {
  const maskId = `onboarding-spotlight-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;

  if (!rects.length) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: OVERLAY_Z, background: 'rgba(15, 23, 42, 0.55)' }}
      />
    );
  }

  if (rects.length === 1) {
    const rect = paddedSpotlightRect(rects[0]);
    const style: React.CSSProperties = {
      position: 'fixed',
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: 12,
      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
      pointerEvents: 'none',
      zIndex: OVERLAY_Z,
      animation: 'mobileOnboardingPulse 2.2s ease-in-out infinite',
    };

    return <div aria-hidden style={style} />;
  }

  const paddedRects = rects.map(paddedSpotlightRect);

  return (
    <svg
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: OVERLAY_Z }}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {paddedRects.map((rect, index) => (
            <rect
              key={index}
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx={12}
              ry={12}
              fill="black"
            />
          ))}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(15, 23, 42, 0.55)"
        mask={`url(#${maskId})`}
        className="mobile-onboarding-spotlight-pulse"
      />
    </svg>
  );
}

export default function MobileOnboardingOverlay() {
  const { t } = useLanguage();
  const {
    isOverlayVisible,
    step,
    goNext,
    skip,
    pause,
    close,
    isProfileEditPhase2,
    syncProfileHighlightTarget,
  } = useMobileOnboarding();
  const [profileHighlightTarget, setProfileHighlightTarget] =
    useState<ProfileEditHighlightTarget>('edit');
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);

  const mainSteps: Array<
    'home' | 'profile_icon' | 'profile_edit' | 'search' | 'help_request' | 'requests'
  > = [
    'home',
    'profile_icon',
    'profile_edit',
    'search',
    'help_request',
    'requests',
  ];
  const displayStep: (typeof mainSteps)[number] | null =
    step === 'edit_form'
      ? 'profile_edit'
      : mainSteps.includes(step as (typeof mainSteps)[number])
        ? (step as (typeof mainSteps)[number])
        : null;
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

  const [profileEditMeasurePass, setProfileEditMeasurePass] = useState(0);
  const [searchMeasurePass, setSearchMeasurePass] = useState(0);
  const [requestsMeasurePass, setRequestsMeasurePass] = useState(0);

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
    if (!isOverlayVisible || displayStep !== 'search') return;

    setSearchMeasurePass((pass) => pass + 1);

    const timeoutId = window.setTimeout(() => {
      setSearchMeasurePass((pass) => pass + 1);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
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

  const targetSelector = useMemo(() => {
    if (!isOverlayVisible || !displayStep) return null;
    if (displayStep === 'home') return ONBOARDING_TARGETS.home;
    if (displayStep === 'profile_icon') return ONBOARDING_TARGETS.profileIcon;
    if (displayStep === 'profile_edit') {
      if (
        (profileHighlightTarget === 'skills' || isProfileEditPhase2) &&
        typeof document !== 'undefined' &&
        document.querySelector(ONBOARDING_TARGETS.profileSkillsButton)
      ) {
        return ONBOARDING_TARGETS.profileSkillsButton;
      }

      return ONBOARDING_TARGETS.profileEditButton;
    }
    return null;
  }, [displayStep, isOverlayVisible, isProfileEditPhase2, profileHighlightTarget]);

  const isSearchStep = displayStep === 'search';
  const isHelpRequestStep = displayStep === 'help_request';
  const isRequestsStep = displayStep === 'requests';
  const rect = useOnboardingTargetRect(
    isSearchStep || isRequestsStep ? null : targetSelector,
    isOverlayVisible && !isSearchStep && !isRequestsStep,
    displayStep === 'profile_edit' ? `${profileEditMeasurePass}:${isProfileEditPhase2}` : displayStep ?? undefined,
  );
  const searchMeasureKey = `search:${searchMeasurePass}`;
  const searchInputAreaRect = useOnboardingCombinedTargetRect(
    isSearchStep ? SEARCH_INPUT_AREA_SELECTORS : null,
    isOverlayVisible && isSearchStep,
    searchMeasureKey,
  );
  const searchNavRect = useOnboardingTargetRect(
    isSearchStep ? ONBOARDING_TARGETS.searchNavIcon : null,
    isOverlayVisible && isSearchStep,
    searchMeasureKey,
  );
  const requestsMeasureKey = `requests:${requestsMeasurePass}`;
  const requestsAreaRect = useOnboardingCombinedTargetRect(
    isRequestsStep ? REQUESTS_AREA_SELECTORS : null,
    isOverlayVisible && isRequestsStep,
    requestsMeasureKey,
  );
  const requestsNavRect = useOnboardingTargetRect(
    isRequestsStep ? ONBOARDING_TARGETS.requestsNavIcon : null,
    isOverlayVisible && isRequestsStep,
    requestsMeasureKey,
  );

  const tooltipRect = isSearchStep
    ? searchInputAreaRect ?? searchNavRect
    : isRequestsStep
      ? requestsAreaRect ?? requestsNavRect
      : rect;
  const spotlightRects = useMemo(() => {
    if (!isOverlayVisible) return [];

    if (isSearchStep) {
      return [searchInputAreaRect, searchNavRect].filter((item): item is TargetRect => item != null);
    }

    if (isRequestsStep) {
      return [requestsAreaRect, requestsNavRect].filter((item): item is TargetRect => item != null);
    }

    return rect ? [rect] : [];
  }, [
    isOverlayVisible,
    isRequestsStep,
    isSearchStep,
    rect,
    requestsAreaRect,
    requestsNavRect,
    searchInputAreaRect,
    searchNavRect,
  ]);
  const stepIndex = displayStep ? mainSteps.indexOf(displayStep) + 1 : 1;

  const pauseLabel = t('onboarding.mobile.later', 'Neskôr');
  const skipLabel = t('onboarding.mobile.skip', 'Ukončiť');

  const config = useMemo(() => {
    if (!displayStep) return null;

    if (displayStep === 'home') {
      return {
        title: t('onboarding.mobile.home.title', 'Vitaj na Svaply'),
        body: t(
          'onboarding.mobile.home.body',
          'Tu budeš objavovať príspevky, ponuky, dopyty a prácu ostatných používateľov.',
        ),
        placement: 'below' as const,
      };
    }

    if (displayStep === 'profile_icon') {
      return {
        title: t('onboarding.mobile.profileIcon.title', 'Toto je tvoj profil'),
        body: t(
          'onboarding.mobile.profileIcon.body',
          'Uprav si profil, pridaj portfólio a spravuj svoje ponuky, dopyty či nové príležitosti.',
        ),
        placement: 'below' as const,
      };
    }

    if (displayStep === 'profile_edit') {
      if (profileHighlightTarget === 'skills' || isProfileEditPhase2) {
        return {
          title: t('tutorial.createCardStep.title', 'Vytvor svoju prvú kartu'),
          body: t(
            'tutorial.createCardStep.description',
            'Môžeš ponúknuť svoje služby alebo pridať dopyt na to, čo hľadáš.',
          ),
          placement: 'above' as const,
        };
      }

      return {
        title: t('onboarding.mobile.editProfile.title', 'Vyplň svoj profil'),
        body: t(
          'onboarding.mobile.editProfile.body',
          'Ostatní používatelia tak lepšie uvidia kto si a čo ponúkaš.',
        ),
        placement: 'above' as const,
      };
    }

    if (displayStep === 'search') {
      return {
        title: t('tutorial.searchStep.title', 'Vyhľadávaj ľudí a príležitosti'),
        body: t(
          'tutorial.searchStep.description',
          'Nájdi používateľov, ponuky a dopyty alebo objav odporúčané ponuky podľa svojich záujmov.',
        ),
        placement: 'below' as const,
      };
    }

    if (displayStep === 'help_request') {
      return {
        title: t('tutorial.helpRequestStep.title', 'Potrebuješ pomoc alebo službu?'),
        body: t(
          'tutorial.helpRequestStep.description',
          'O ponuku môžeš požiadať priamo na profile používateľa.',
        ),
        placement: 'below' as const,
      };
    }

    if (displayStep === 'requests') {
      return {
        title: t('tutorial.requestsStep.title', 'Maj prehľad o svojich žiadostiach'),
        body: t(
          'tutorial.requestsStep.description',
          'Sleduj odoslané aj prijaté žiadosti na jednom mieste.',
        ),
        placement: 'below' as const,
      };
    }

    return null;
  }, [displayStep, isProfileEditPhase2, profileHighlightTarget, t]);
  const nextLabel = t('onboarding.mobile.next', 'Ďalej');

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
      if (target instanceof Node && tooltipRef.current?.contains(target)) {
        return;
      }
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
  }, [config, isOverlayVisible, nextLabel, pauseLabel, profileHighlightTarget, skipLabel, stepIndex]);

  if (!isOverlayVisible || !config) return null;

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: OVERLAY_Z + 1,
  };

  const nav =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('[data-mobile-bottom-nav]')
      : null;
  const navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 88;
  const bottomReserve = navHeight + 24;

  if (isHelpRequestStep && typeof window !== 'undefined') {
    const viewportPadding = 16;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const availableHeight = Math.max(320, window.innerHeight - bottomReserve - viewportPadding * 2);

    tooltipStyle.left = '50%';
    tooltipStyle.width = tooltipWidth;
    tooltipStyle.maxHeight = availableHeight;
    tooltipStyle.overflowY = 'auto';
    tooltipStyle.transform = 'translateX(-50%)';
    tooltipStyle.top = viewportPadding;
  } else if (tooltipRect && typeof window !== 'undefined') {
    const viewportPadding = 16;
    const offset = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const anchorCenterX = tooltipRect.left + tooltipRect.width / 2;
    const clampedCenterX = Math.max(
      viewportPadding + tooltipWidth / 2,
      Math.min(anchorCenterX, window.innerWidth - viewportPadding - tooltipWidth / 2),
    );
    const belowTop = tooltipRect.top + tooltipRect.height + SPOTLIGHT_PADDING + offset;
    const aboveTop = tooltipRect.top - tooltipHeight - SPOTLIGHT_PADDING - offset;
    const shouldPlaceAbove = belowTop + tooltipHeight > window.innerHeight - viewportPadding;

    tooltipStyle.left = clampedCenterX;
    tooltipStyle.width = tooltipWidth;
    tooltipStyle.transform = 'translateX(-50%)';
    tooltipStyle.top = shouldPlaceAbove
      ? Math.max(viewportPadding, aboveTop)
      : Math.max(viewportPadding, belowTop);

    if (tooltipStyle.top != null) {
      tooltipStyle.top = Math.min(
        tooltipStyle.top as number,
        window.innerHeight - bottomReserve - 180,
      );
    }
  } else {
    tooltipStyle.left = 16;
    tooltipStyle.right = 16;
    tooltipStyle.maxWidth = 360;
    tooltipStyle.marginLeft = 'auto';
    tooltipStyle.marginRight = 'auto';
    tooltipStyle.bottom = bottomReserve;
  }

  return (
    <>
      <SpotlightOverlay rects={spotlightRects} />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="mobile-onboarding-title"
        className={`rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-white dark:bg-gray-950 shadow-xl ${
          isHelpRequestStep ? 'p-3' : 'p-4'
        }`}
        style={{
          ...tooltipStyle,
          animation: 'mobileOnboardingFadeIn 0.35s ease-out',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex gap-1.5">
            {mainSteps.map((item, index) => {
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
            aria-label={t('common.close', 'Zavrieť')}
          >
            ×
          </button>
        </div>

        <h3
          id="mobile-onboarding-title"
          className="text-base font-semibold text-gray-900 dark:text-white whitespace-pre-line"
        >
          {config.title}
        </h3>

        <p className={`${isHelpRequestStep ? 'mt-1.5' : 'mt-2'} text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line`}>
          {config.body}
        </p>

        {isHelpRequestStep && (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <img
              src="/onboarding/request-offer-demo.gif"
              alt={t(
                'tutorial.helpRequestStep.gifAlt',
                'Ukážka požiadania o ponuku na profile používateľa',
              )}
              className="block aspect-[9/16] max-h-[40vh] w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={pause}
            className="shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200"
          >
            {pauseLabel}
          </button>
        </div>

        <button
          type="button"
          onClick={skip}
          className={`${isHelpRequestStep ? 'mt-2' : 'mt-3'} w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600`}
        >
          {skipLabel}
        </button>
      </div>

      <style jsx global>{`
        @keyframes mobileOnboardingPulse {
          0%,
          100% {
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.52);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.62);
          }
        }

        :global(.mobile-onboarding-spotlight-pulse) {
          animation: mobileOnboardingSvgPulse 2.2s ease-in-out infinite;
        }

        @keyframes mobileOnboardingSvgPulse {
          0%,
          100% {
            opacity: 0.94;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes mobileOnboardingFadeIn {
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
