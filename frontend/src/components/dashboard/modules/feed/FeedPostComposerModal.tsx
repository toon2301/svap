'use client';

/**
 * Desktopový obal composera – centrovaný modal.
 *
 * Obsah (polia, fotky, tagovanie, odoslanie) žije vo `FeedPostComposerForm`;
 * ten istý formulár nesie na mobile celoobrazovková routa `feed-post-create`.
 * Tu ostáva len portál, prekrytie a správanie dialógu.
 *
 * Formulár sa renderuje AŽ keď je otvorený – každé otvorenie je tak nový
 * mount, čiže čistý stav bez resetovacieho efektu.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFeedDialog } from './useFeedDialog';
import FeedPostComposerForm from './FeedPostComposerForm';
import type { FeedPost } from '@/lib/feedApi';

type FeedPostComposerModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (created: FeedPost) => void;
};

export default function FeedPostComposerModal({
  open,
  onClose,
  onCreated,
}: FeedPostComposerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  const dialogRef = useFeedDialog({ open, onClose, canClose: !submitting });

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-composer-title"
      data-testid="feed-composer-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* subtle-scrollbar je existujúca utilita appky (6px, priehľadná
            dráha, zaoblený thumb, hover + tmavý režim). Scoped na triedu,
            takže sa nedotýka scrollovania stránky ani iných komponentov. */}
        <div className="flex-1 overflow-y-auto subtle-scrollbar p-4 sm:p-6">
          <FeedPostComposerForm
            showHeading
            onClose={onClose}
            onCreated={onCreated}
            onSubmittingChange={setSubmitting}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
