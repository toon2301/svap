'use client';

import React from 'react';

const DEFAULT_ROWS = [
  { side: 'left', widthClassName: 'w-[62%]', showAvatar: true },
  { side: 'right', widthClassName: 'w-[44%]', showAvatar: false },
  { side: 'left', widthClassName: 'w-[74%]', showAvatar: false },
  { side: 'right', widthClassName: 'w-[56%]', showAvatar: false },
  { side: 'left', widthClassName: 'w-[48%]', showAvatar: true },
  { side: 'right', widthClassName: 'w-[68%]', showAvatar: false },
  { side: 'left', widthClassName: 'w-[58%]', showAvatar: false },
  { side: 'right', widthClassName: 'w-[40%]', showAvatar: false },
] as const;

export function ConversationMessagesSkeleton({
  isMobile = false,
  className = 'space-y-3',
}: {
  isMobile?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className}
      data-testid="conversation-messages-skeleton"
      aria-hidden="true"
    >
      {DEFAULT_ROWS.map((row, index) => {
        const isIncoming = row.side === 'left';

        return (
          <div
            key={index}
            data-testid="conversation-message-skeleton-row"
            className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} ${
              isMobile ? '' : isIncoming ? 'pl-1' : 'pr-1'
            }`}
          >
            {isIncoming ? (
              <div
                className={`flex min-w-0 items-end ${isMobile ? 'max-w-full gap-1' : 'max-w-[80%] gap-2'}`}
              >
                <div className={`flex shrink-0 justify-start ${isMobile ? 'w-6' : 'w-8'}`}>
                  {row.showAvatar ? (
                    <div
                      className={`rounded-full bg-gray-200 dark:bg-gray-700/70 animate-pulse ${
                        isMobile ? 'h-6 w-6' : 'h-8 w-8'
                      }`}
                    />
                  ) : null}
                </div>
                <div
                  className={`rounded-2xl bg-gray-200 dark:bg-gray-700/70 animate-pulse ${
                    row.widthClassName
                  } ${isMobile ? 'h-10 max-w-[calc(100vw-5rem)]' : 'h-11 max-w-[34rem]'}`}
                />
              </div>
            ) : (
              <div
                className={`flex min-w-0 flex-col items-end ${
                  isMobile ? 'max-w-full' : 'max-w-[80%]'
                }`}
              >
                <div
                  className={`rounded-2xl bg-gray-200 dark:bg-gray-700/70 animate-pulse ${
                    row.widthClassName
                  } ${isMobile ? 'h-10 max-w-[calc(100vw-4rem)]' : 'h-11 max-w-[34rem]'}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
