'use client';

import React from 'react';

export function MessagePinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(38 12 12)">
        <path d="M9 5.25h6" />
        <path d="M10.25 5.25v5.1L8 12.6v1.15h8v-1.15l-2.25-2.25v-5.1" />
        <path d="M12 13.75v6.5" />
        <path d="M12 20.25l-1.8 1.8" />
      </g>
    </svg>
  );
}
