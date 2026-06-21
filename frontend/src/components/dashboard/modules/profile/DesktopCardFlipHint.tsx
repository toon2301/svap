'use client';

export function DesktopCardFlipHint() {
  return (
    <span
      aria-hidden="true"
      className="desktop-card-flip-hint pointer-events-none absolute left-1/2 top-1/2 z-50 text-slate-950 drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)] dark:text-white dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
    >
      <svg
        className="desktop-card-flip-hint__icon h-16 w-16"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M27.2 34.8V15.2a4.1 4.1 0 0 1 8.2 0v18.5"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M35.4 28.5v-5.9a4 4 0 0 1 8 0v12.1"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M43.4 31.5v-4.2a3.9 3.9 0 0 1 7.8 0v13.4"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M27.2 36.2 22 31.1a4.2 4.2 0 0 0-6.05 5.75l11.1 13.35a11.25 11.25 0 0 0 8.65 4.05h4.1a11.4 11.4 0 0 0 11.4-11.4v-2.15"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31.3 6.9V2.2M24.8 9.2 21.4 5.8M37.8 9.2 41.2 5.8"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
      </svg>
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .desktop-card-flip-hint__icon {
            animation: desktopCardFlipHintIcon 1.8s ease-in-out infinite;
            transform-origin: 49% 13%;
          }
        }

        .desktop-card-flip-hint {
          transform: translate(-49%, -13%);
        }

        @keyframes desktopCardFlipHintIcon {
          0%,
          100% {
            transform: scale(1);
          }
          45% {
            transform: scale(0.9);
          }
          62% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </span>
  );
}
