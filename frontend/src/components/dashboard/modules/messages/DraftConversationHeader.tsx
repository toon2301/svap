'use client';

import React from 'react';

type DraftConversationHeaderProps = {
  avatarUrl: string | null;
  targetUserName: string;
  targetUserId: number | null;
  targetUserSlug: string | null;
  /** Anonymizovaný/zmazaný používateľ – profil neexistuje, klik znemožniť. */
  isTargetDeleted?: boolean;
  openPeerProfileLabel: string;
};

/**
 * Hlavička rozpísanej konverzácie (desktop): meno a avatar druhej strany, ktoré
 * vedú na jej profil – rovnako ako hlavička existujúcej konverzácie
 * (`ConversationDetailHeader`), len bez ponuky akcií, ktorú rozpísaná konverzácia
 * nemá. Profil sa otvára tým istým eventom `goToUserProfile`.
 */
export function DraftConversationHeader({
  avatarUrl,
  targetUserName,
  targetUserId,
  targetUserSlug,
  isTargetDeleted = false,
  openPeerProfileLabel,
}: DraftConversationHeaderProps) {
  const identifier =
    (targetUserSlug || '').trim() || (typeof targetUserId === 'number' ? String(targetUserId) : '');
  const canOpenProfile = !isTargetDeleted && identifier !== '';

  const handleOpenProfile = () => {
    if (!canOpenProfile || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('goToUserProfile', { detail: { identifier } }));
  };

  return (
    <div data-testid="draft-conversation-header" className="mb-3">
      <div className="w-full border-b border-gray-200 px-4 py-2.5 dark:border-gray-800 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <button
            type="button"
            data-testid="draft-conversation-header-trigger"
            onClick={handleOpenProfile}
            disabled={!canOpenProfile}
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
        </div>
      </div>
    </div>
  );
}
