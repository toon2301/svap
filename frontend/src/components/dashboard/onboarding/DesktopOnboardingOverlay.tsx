'use client';

import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DESKTOP_ONBOARDING_TARGETS,
  useDesktopOnboarding,
} from './DesktopOnboardingContext';
import { type TargetRect, useOnboardingTargetRect } from './useOnboardingTargetRect';

const SPOTLIGHT_PADDING = 8;
const OVERLAY_Z = 10000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function paddedSpotlightRect(rect: TargetRect): TargetRect {
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function SpotlightOverlay({ rect }: { rect: TargetRect | null }) {
  const maskId = `desktop-onboarding-spotlight-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;

  if (!rect) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: OVERLAY_Z, background: 'rgba(15, 23, 42, 0.55)' }}
      />
    );
  }

  const paddedRect = paddedSpotlightRect(rect);

  return (
    <svg
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: OVERLAY_Z }}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={paddedRect.left}
            y={paddedRect.top}
            width={paddedRect.width}
            height={paddedRect.height}
            rx={14}
            ry={14}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(15, 23, 42, 0.55)"
        mask={`url(#${maskId})`}
        className="desktop-onboarding-spotlight-pulse"
      />
    </svg>
  );
}

export default function DesktopOnboardingOverlay() {
  const { t } = useLanguage();
  const { isOverlayVisible, step, goNext, pause, skip } = useDesktopOnboarding();
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);
  const steps = useMemo(() => ['navigation', 'profile_icon'] as const, []);
  const stepIndex = steps.indexOf(step) + 1;

  const targetSelector = useMemo(() => {
    if (!isOverlayVisible) return null;
    if (step === 'navigation') return DESKTOP_ONBOARDING_TARGETS.leftNavigation;
    if (step === 'profile_icon') return DESKTOP_ONBOARDING_TARGETS.profileIcon;
    return null;
  }, [isOverlayVisible, step]);

  const rect = useOnboardingTargetRect(targetSelector, isOverlayVisible, step);

  const config = useMemo(() => {
    if (step === 'navigation') {
      return {
        title: t('onboarding.desktop.navigation.title', 'Vitaj na Svaply'),
        body: t(
          'onboarding.desktop.navigation.body',
          'Pomocou navigácie vľavo sa dostaneš ku všetkým dôležitým častiam aplikácie.',
        ),
      };
    }

    return {
      title: t('onboarding.mobile.profileIcon.title', 'Toto je tvoj profil'),
      body: t(
        'onboarding.mobile.profileIcon.body',
        'Uprav si profil, pridaj portfólio a spravuj svoje ponuky, dopyty či nové príležitosti.',
      ),
    };
  }, [step, t]);

  const nextLabel = t('onboarding.mobile.next', 'Ďalej');
  const pauseLabel = t('onboarding.mobile.later', 'Neskôr');
  const skipLabel = t('onboarding.mobile.skip', 'Ukončiť');

  useLayoutEffect(() => {
    if (!isOverlayVisible) return;
    const nextHeight = tooltipRef.current?.getBoundingClientRect().height;
    if (!nextHeight) return;
    setTooltipHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, [config, isOverlayVisible, nextLabel, pauseLabel, skipLabel, stepIndex]);

  if (!isOverlayVisible) return null;

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: OVERLAY_Z + 1,
  };

  if (rect && typeof window !== 'undefined') {
    const viewportPadding = 24;
    const offset = 20;
    const tooltipWidth = Math.min(380, window.innerWidth - viewportPadding * 2);
    const preferredLeft = rect.left + rect.width + SPOTLIGHT_PADDING + offset;
    const maxLeft = window.innerWidth - tooltipWidth - viewportPadding;
    const anchorCenterY =
      step === 'navigation'
        ? rect.top + Math.min(rect.height / 2, 260)
        : rect.top + rect.height / 2;

    tooltipStyle.left = clamp(preferredLeft, viewportPadding, maxLeft);
    tooltipStyle.top = clamp(
      anchorCenterY - tooltipHeight / 2,
      viewportPadding,
      window.innerHeight - tooltipHeight - viewportPadding,
    );
    tooltipStyle.width = tooltipWidth;
  } else if (typeof window !== 'undefined') {
    const viewportPadding = 24;
    const tooltipWidth = Math.min(380, window.innerWidth - viewportPadding * 2);

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
      <SpotlightOverlay rect={rect} />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="desktop-onboarding-title"
        className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-xl dark:border-purple-800/60 dark:bg-gray-950"
        style={{
          ...tooltipStyle,
          animation: tooltipAnimation,
        }}
      >
        <div className="mb-3 flex gap-1.5">
          {steps.map((item, index) => {
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

        <h3
          id="desktop-onboarding-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {config.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {config.body}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={pause}
            className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            {pauseLabel}
          </button>
        </div>

        <button
          type="button"
          onClick={skip}
          className="mt-3 w-full text-center text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400"
        >
          {skipLabel}
        </button>
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
