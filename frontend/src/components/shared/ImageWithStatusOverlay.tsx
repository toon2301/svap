'use client';

import React from 'react';

export type ImageStatus = 'pending' | 'approved' | 'rejected' | string | null | undefined;

type Props = {
  image_url?: string | null;
  status?: ImageStatus;
  rejected_reason?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
};

export default function ImageWithStatusOverlay({
  image_url,
  status,
  rejected_reason,
  alt = '',
  className = '',
  imgClassName = 'object-cover',
}: Props) {
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const showOverlay = isPending || isRejected;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {image_url ? (
        <img src={image_url} alt={alt} className={`w-full h-full ${imgClassName}`} />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-900/40 flex flex-col items-center justify-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
          {isPending ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
              </svg>
              <span>Spracúva sa…</span>
            </>
          ) : isRejected ? (
            <>
              <span className="font-bold text-red-600 dark:text-red-300">!</span>
              <span>Fotka zamietnutá</span>
            </>
          ) : (
            <span>Fotka</span>
          )}
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white text-sm font-medium transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isPending ? (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
            </svg>
            <span>Spracúva sa…</span>
          </>
        ) : isRejected ? (
          <>
            <span>Fotka zamietnutá</span>
            {rejected_reason ? (
              <span className="max-w-[90%] text-xs text-center opacity-90">{rejected_reason}</span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

