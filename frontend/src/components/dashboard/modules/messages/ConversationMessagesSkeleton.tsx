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
  const laneClassName = isMobile ? 'w-full' : 'w-full max-w-[80%]';
  const avatarSlotClassName = isMobile ? 'w-6' : 'w-8';
  const avatarClassName = isMobile ? 'h-6 w-6' : 'h-8 w-8';
  const bubbleMaxWidthClassName = isMobile ? 'max-w-[calc(100vw-5rem)] h-10' : 'max-w-[34rem] h-11';
  const bubbleClassName = `rounded-2xl bg-gray-200 dark:bg-gray-700/70 animate-pulse ${bubbleMaxWidthClassName}`;

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
            className={`flex w-full ${isIncoming ? 'justify-start' : 'justify-end'} ${
              isMobile ? '' : isIncoming ? 'pl-1' : 'pr-1'
            }`}
          >
            {isIncoming ? (
              <div
                className={`flex min-w-0 items-end ${laneClassName} ${isMobile ? 'gap-1' : 'gap-2'}`}
              >
                <div className={`flex shrink-0 justify-start ${avatarSlotClassName}`}>
                  {row.showAvatar ? (
                    <div
                      data-testid="conversation-message-skeleton-avatar"
                      className={`rounded-full bg-gray-200 dark:bg-gray-700/70 animate-pulse ${avatarClassName}`}
                    />
                  ) : null}
                </div>
                <div
                  data-testid="conversation-message-skeleton-bubble"
                  className={`min-w-[7rem] ${bubbleClassName} ${row.widthClassName}`}
                />
              </div>
            ) : (
              <div
                className={`flex min-w-0 justify-end ${laneClassName}`}
              >
                <div
                  data-testid="conversation-message-skeleton-bubble"
                  className={`min-w-[7rem] ${bubbleClassName} ${row.widthClassName}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
