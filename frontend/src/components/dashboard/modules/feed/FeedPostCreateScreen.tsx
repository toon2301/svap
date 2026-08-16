'use client';

/**
 * Mobilná celoobrazovková obrazovka „Nový príspevok" (routa
 * `feed-post-create`).
 *
 * Vzor prevzatý z `PortfolioCreateScreen`: na mobile je vytváranie samostatná
 * stránka s vlastnou hlavičkou, nie vysúvací panel. Obsah je ten istý
 * `FeedPostComposerForm` ako v desktopovom modale – líši sa len obal.
 */

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedPostComposerForm from './FeedPostComposerForm';
import type { FeedPost } from '@/lib/feedApi';

type FeedPostCreateScreenProps = {
  /** Návrat na Nástenku – zavolá sa pri „späť" aj po uverejnení. */
  onClose: () => void;
  onCreated?: (created: FeedPost) => void;
};

export default function FeedPostCreateScreen({
  onClose,
  onCreated,
}: FeedPostCreateScreenProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]" data-testid="feed-post-create-screen">
      {/* Hlavička ostáva na mieste pri scrollovaní dlhého formulára. */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/95">
        <button
          type="button"
          onClick={onClose}
          data-testid="feed-post-create-back"
          aria-label={t('common.back', 'Späť')}
          className="-ml-2 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1
          id="feed-composer-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {t('feed.composerTitle', 'Nový príspevok')}
        </h1>
      </header>

      <div className="px-4 pb-10 pt-4">
        <FeedPostComposerForm onClose={onClose} onCreated={onCreated} />
      </div>
    </div>
  );
}
