import React from 'react';

type MobileCardFlipHintProps = {
  label: string;
};

export function MobileCardFlipHint({ label }: MobileCardFlipHintProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pb-[26%]">
      <div
        className="absolute inset-0 bg-slate-950/[0.22] backdrop-blur-[14px] backdrop-saturate-150 dark:bg-black/[0.38] dark:backdrop-blur-[16px]"
        aria-hidden="true"
      />
      <div className="mobile-card-flip-hint relative flex max-w-[13rem] flex-col items-center gap-2 rounded-2xl border border-white/45 bg-slate-950/[0.32] px-4 py-3 text-center shadow-[0_20px_44px_rgba(15,23,42,0.34)] backdrop-blur-[22px] backdrop-saturate-150 ring-1 ring-white/20 dark:border-white/15 dark:bg-black/[0.44] dark:shadow-[0_20px_44px_rgba(0,0,0,0.62)] dark:ring-white/10">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-700/30">
          <span className="mobile-card-flip-hint__pulse" />
          <span className="mobile-card-flip-hint__pulse mobile-card-flip-hint__pulse--second" />
          <svg
            className="mobile-card-flip-hint__icon h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8.5 11.5V6.75a1.75 1.75 0 1 1 3.5 0v4.25" />
            <path d="M12 10V8.25a1.75 1.75 0 1 1 3.5 0V12" />
            <path d="M15.5 11.5v-.75a1.75 1.75 0 1 1 3.5 0v3.5c0 3.45-2.8 6.25-6.25 6.25h-1.1a5 5 0 0 1-4.12-2.17L5 14.6a1.65 1.65 0 0 1 2.72-1.86l1.03 1.43" />
            <path d="M5.25 5.25 3.75 3.75" />
            <path d="M4.5 9H2.75" />
            <path d="M8.75 3.25V1.75" />
          </svg>
          <span className="absolute -right-1.5 -top-1.5 rounded-full border border-white/80 bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
            2x
          </span>
        </div>
        <span className="text-xs font-semibold leading-snug text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.85)]">
          {label}
        </span>
      </div>
      <style jsx>{`
        .mobile-card-flip-hint {
          animation: mobileCardFlipHintFloat 2.8s ease-in-out infinite;
        }

        .mobile-card-flip-hint__icon {
          animation: mobileCardFlipHintTap 2.8s ease-in-out infinite;
          transform-origin: 50% 70%;
        }

        .mobile-card-flip-hint__pulse {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          opacity: 0;
          animation: mobileCardFlipHintPulse 2.8s ease-out infinite;
        }

        .mobile-card-flip-hint__pulse--second {
          animation-delay: 0.36s;
        }

        @keyframes mobileCardFlipHintFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes mobileCardFlipHintTap {
          0%,
          10%,
          24%,
          38%,
          100% {
            transform: translateY(0) scale(1);
          }
          15%,
          31% {
            transform: translateY(3px) scale(0.92);
          }
        }

        @keyframes mobileCardFlipHintPulse {
          0%,
          9%,
          100% {
            opacity: 0;
            transform: scale(0.74);
          }
          15% {
            opacity: 0.55;
            transform: scale(1);
          }
          28% {
            opacity: 0;
            transform: scale(1.38);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-card-flip-hint,
          .mobile-card-flip-hint__icon,
          .mobile-card-flip-hint__pulse {
            animation: none;
          }

          .mobile-card-flip-hint__pulse {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
