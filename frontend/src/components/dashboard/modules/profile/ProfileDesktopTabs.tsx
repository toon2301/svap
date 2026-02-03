'use client';

import React from 'react';
import type { ProfileTab } from './profileTypes';

type Props = {
  activeTab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onTabsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

export function ProfileDesktopTabs({ activeTab, onChangeTab, onTabsKeyDown }: Props) {
  return (
    <div className="mt-[clamp(0.75rem,2vw,1.5rem)] w-full lg:pb-[clamp(0.5rem,1.5vw,1rem)]">
      <div role="tablist" aria-label="Sekcie profilu" className="w-full" tabIndex={0} onKeyDown={onTabsKeyDown}>
        <div className="flex w-full items-stretch rounded-2xl border-b border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Tab: Ponúkam/Hľadám */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'offers'}
            onClick={() => onChangeTab('offers')}
            aria-label="Ponúkam / Hľadám"
            title="Ponúkam / Hľadám"
            className={[
              'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
              activeTab === 'offers'
                ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
            ].join(' ')}
          >
            {/* Icon: handshake */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="w-[clamp(1rem,1.5vw,1.25rem)] h-[clamp(1rem,1.5vw,1.25rem)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Ponúkam / Hľadám
            </div>
          </button>

          {/* Tab: Portfólio */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'portfolio'}
            onClick={() => onChangeTab('portfolio')}
            aria-label="Portfólio"
            title="Portfólio"
            className={[
              'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
              'border-l border-gray-200 dark:border-gray-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
              activeTab === 'portfolio'
                ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
            ].join(' ')}
          >
            {/* Icon: briefcase */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9"
              />
            </svg>
            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Portfólio
            </div>
          </button>

          {/* Tab: Príspevky */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'posts'}
            onClick={() => onChangeTab('posts')}
            aria-label="Príspevky"
            title="Príspevky"
            className={[
              'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
              'border-l border-gray-200 dark:border-gray-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
              activeTab === 'posts'
                ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
            ].join(' ')}
          >
            {/* Icon: squares-2x2 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z" />
            </svg>
            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Príspevky
            </div>
          </button>

          {/* Tab: Označený */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tagged'}
            onClick={() => onChangeTab('tagged')}
            aria-label="Označený"
            title="Označený"
            className={[
              'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
              'border-l border-gray-200 dark:border-gray-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
              activeTab === 'tagged'
                ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
            ].join(' ')}
          >
            {/* Icon: at-symbol */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082"
              />
            </svg>
            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Označený
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

