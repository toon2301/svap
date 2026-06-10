'use client';

import React, { useId } from 'react';
import type { TargetRect } from './useOnboardingTargetRect';

export const DESKTOP_ONBOARDING_SPOTLIGHT_PADDING = 8;
export const DESKTOP_ONBOARDING_OVERLAY_Z = 10000;

function paddedSpotlightRect(rect: TargetRect): TargetRect {
  return {
    top: rect.top - DESKTOP_ONBOARDING_SPOTLIGHT_PADDING,
    left: rect.left - DESKTOP_ONBOARDING_SPOTLIGHT_PADDING,
    width: rect.width + DESKTOP_ONBOARDING_SPOTLIGHT_PADDING * 2,
    height: rect.height + DESKTOP_ONBOARDING_SPOTLIGHT_PADDING * 2,
  };
}

export function DesktopOnboardingSpotlight({ rects }: { rects: TargetRect[] }) {
  const maskId = `desktop-onboarding-spotlight-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;

  if (!rects.length) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: DESKTOP_ONBOARDING_OVERLAY_Z,
          background: 'rgba(15, 23, 42, 0.55)',
        }}
      />
    );
  }

  return (
    <svg
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: DESKTOP_ONBOARDING_OVERLAY_Z }}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {rects.map((rect, index) => {
            const paddedRect = paddedSpotlightRect(rect);
            return (
              <rect
                key={`${paddedRect.left}:${paddedRect.top}:${index}`}
                x={paddedRect.left}
                y={paddedRect.top}
                width={paddedRect.width}
                height={paddedRect.height}
                rx={14}
                ry={14}
                fill="black"
              />
            );
          })}
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
