'use client';

import React, { useMemo } from 'react';

import { linkifyMessageText } from './linkifyMessageText';

type MessageTextWithLinksProps = {
  text: string;
  className?: string;
  variant?: 'incoming' | 'outgoing';
};

export function MessageTextWithLinks({
  text,
  className = '',
  variant = 'incoming',
}: MessageTextWithLinksProps) {
  const segments = useMemo(() => linkifyMessageText(text), [text]);
  const hasLinks = segments.some((segment) => segment.type === 'link');
  const linkClassName =
    variant === 'outgoing'
      ? 'underline underline-offset-2 break-all font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100'
      : 'underline underline-offset-2 break-all font-medium text-brand hover:text-brand-dark dark:text-purple-300 dark:hover:text-purple-200';

  if (!hasLinks) {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={className}>
      {segments.map((segment, index) =>
        segment.type === 'link' ? (
          <a
            key={`link-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(event) => event.stopPropagation()}
          >
            {segment.value}
          </a>
        ) : (
          <React.Fragment key={`text-${index}`}>{segment.value}</React.Fragment>
        ),
      )}
    </div>
  );
}
