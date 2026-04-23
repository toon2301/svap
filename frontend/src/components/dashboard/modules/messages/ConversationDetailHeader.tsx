'use client';

import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';

type ConversationDetailHeaderProps = {
  avatarUrl: string | null;
  targetUserName: string;
  targetUserId: number | null;
  targetUserSlug: string | null;
  openPeerProfileLabel: string;
  openConversationActionsLabel: string;
  onOpenTargetUserProfile: () => void;
  onOpenConversationActions: (anchorRect: DOMRect | null) => void;
};

export function ConversationDetailHeader({
  avatarUrl,
  targetUserName,
  targetUserId,
  targetUserSlug,
  openPeerProfileLabel,
  openConversationActionsLabel,
  onOpenTargetUserProfile,
  onOpenConversationActions,
}: ConversationDetailHeaderProps) {
  return (
    <div data-testid="conversation-header" className="mb-3">
      <div className="w-full border-b border-gray-200 px-4 py-2.5 dark:border-gray-800 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            data-testid="conversation-header-trigger"
            onClick={onOpenTargetUserProfile}
            disabled={targetUserId === null && !targetUserSlug}
            className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.06]"
            aria-label={openPeerProfileLabel}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={targetUserName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="max-w-[24rem] truncate text-sm font-semibold text-gray-900 dark:text-white">
              {targetUserName}
            </div>
          </button>
          <button
            type="button"
            data-testid="conversation-actions-trigger"
            onClick={(event) => {
              onOpenConversationActions(event.currentTarget.getBoundingClientRect());
            }}
            className="absolute right-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
            aria-label={openConversationActionsLabel}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
