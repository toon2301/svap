'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ONBOARDING_TARGETS, useMobileOnboarding } from './MobileOnboardingContext';
import { useOnboardingTargetRect } from './useOnboardingTargetRect';

const SPOTLIGHT_PADDING = 8;
const OVERLAY_Z = 10000;
const PROFILE_HIGHLIGHT_ROTATION_MS = 6000;

function SpotlightHole({ rect }: { rect: { top: number; left: number; width: number; height: number } }) {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
    pointerEvents: 'none',
    zIndex: OVERLAY_Z,
    animation: 'mobileOnboardingPulse 2.2s ease-in-out infinite',
  };

  return <div aria-hidden style={style} />;
}

export default function MobileOnboardingOverlay() {
  const { t } = useLanguage();
  const { isOverlayVisible, step, goNext, skip, pause, close, isProfileEditPhase2 } =
    useMobileOnboarding();
  const [profileHighlightTarget, setProfileHighlightTarget] = useState<'edit' | 'skills'>('edit');
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);

  const mainSteps: Array<'home' | 'profile_icon' | 'profile_edit'> = ['home', 'profile_icon', 'profile_edit'];
  const displayStep: (typeof mainSteps)[number] | null =
    step === 'edit_form'
      ? 'profile_edit'
      : mainSteps.includes(step as (typeof mainSteps)[number])
        ? (step as (typeof mainSteps)[number])
        : null;

  useEffect(() => {
    if (!isOverlayVisible || displayStep !== 'profile_edit') {
      if (!isOverlayVisible || displayStep !== 'profile_edit') {
        setProfileHighlightTarget('edit');
      }
      return;
    }

    if (isProfileEditPhase2) {
      setProfileHighlightTarget('skills');
      return;
    }

    setProfileHighlightTarget('edit');
    const intervalId = window.setInterval(() => {
      setProfileHighlightTarget((current) => (current === 'edit' ? 'skills' : 'edit'));
    }, PROFILE_HIGHLIGHT_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [displayStep, isOverlayVisible, isProfileEditPhase2]);

  const [profileEditMeasurePass, setProfileEditMeasurePass] = useState(0);

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

  const rect = useOnboardingTargetRect(
    targetSelector,
    isOverlayVisible,
    displayStep === 'profile_edit' ? `${profileEditMeasurePass}:${isProfileEditPhase2}` : displayStep ?? undefined,
  );
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

    return null;
  }, [displayStep, isProfileEditPhase2, profileHighlightTarget, t]);
  const nextLabel = t('onboarding.mobile.next', 'Ďalej');

  const handleNext = () => {
    goNext();
  };

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

  if (rect && typeof window !== 'undefined') {
    const viewportPadding = 16;
    const offset = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const anchorCenterX = rect.left + rect.width / 2;
    const clampedCenterX = Math.max(
      viewportPadding + tooltipWidth / 2,
      Math.min(anchorCenterX, window.innerWidth - viewportPadding - tooltipWidth / 2),
    );
    const belowTop = rect.top + rect.height + SPOTLIGHT_PADDING + offset;
    const aboveTop = rect.top - tooltipHeight - SPOTLIGHT_PADDING - offset;
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
      {rect ? <SpotlightHole rect={rect} /> : null}
      {!rect ? (
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: OVERLAY_Z, background: 'rgba(15, 23, 42, 0.55)' }}
        />
      ) : null}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="mobile-onboarding-title"
        className="rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-white dark:bg-gray-950 shadow-xl p-4"
        style={{
          ...tooltipStyle,
          animation: 'mobileOnboardingFadeIn 0.35s ease-out',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? 'w-6 bg-purple-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
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

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {config.body}
        </p>

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
          className="mt-3 w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600"
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
