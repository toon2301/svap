'use client';

import { useState } from 'react';

export default function NotificationsModule() {
  const [likesEnabled, setLikesEnabled] = useState(false);

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden lg:block pt-4 pb-8 pl-12 text-[var(--foreground)]">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center -ml-[31rem]">
          Upozornenia
        </h2>
        
        {/* Páči sa mi to sekcia - pekne viditeľná priamo pod nadpisom */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-40 shadow-sm">
            <div className="flex items-center justify-between">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Páči sa mi to
                  </h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes"
                      checked={!likesEnabled}
                      onChange={() => setLikesEnabled(false)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes"
                      checked={likesEnabled}
                      onChange={() => setLikesEnabled(true)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: heart icon vertically centered */}
              <svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

